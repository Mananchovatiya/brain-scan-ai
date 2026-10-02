import { randomUUID } from "node:crypto";
import { AuditLog } from "../models/AuditLog.js";
import { getCloudinary } from "../config/cloudinary.js";
import { Report } from "../models/Report.js";
import { Scan } from "../models/Scan.js";
import { createReportPdf } from "../services/reportPdf.js";

export async function listReports(request, response) {
  const ownerId = String(request.user._id);
  const reports = await Report.find({ createdBy: ownerId })
    .populate({ path: "patient", select: "patientId name dateOfBirth gender", match: { createdBy: ownerId } })
    .populate({ path: "scan", select: "scanId status format scanDate analysis", match: { createdBy: ownerId } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return response.json({
    reports: reports.flatMap((report) => {
      if (!report.patient || !report.scan) return [];
      return [{
        id: report.reportId,
        patientId: report.patient.patientId,
        patientName: report.patient.name,
        scanId: report.scan.scanId,
        scanStatus: report.scan.status,
        format: report.scan.format,
        aiAnalysis: report.scan.analysis?.source === "fastapi" ? {
          predictedClass: report.scan.analysis.predictedClass,
          confidence: report.scan.analysis.confidence,
          classProbabilities: report.scan.analysis.classProbabilities,
          modelName: report.scan.analysis.modelName,
          modelVersion: report.scan.analysis.modelVersion,
          analyzedAt: report.scan.analysis.analyzedAt,
        } : null,
        doctorName: report.doctorName,
        doctorNotes: report.doctorNotes,
        recommendation: report.recommendation,
        status: report.status,
        finalizedAt: report.finalizedAt,
        pdfAvailable: Boolean(report.cloudinaryReportPublicId),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      }];
    })
  });
}

export async function saveReportDraft(request, response) {
  const ownerId = String(request.user._id);
  const scan = await Scan.findOne({ scanId: request.body.scanId, createdBy: ownerId }).select("_id patient analysis").lean();
  if (!scan) return response.status(404).json({ error: "Scan not found" });

  const report = await Report.findOneAndUpdate(
    { createdBy: ownerId, scan: scan._id },
    {
      $set: { doctorNotes: request.body.doctorNotes, recommendation: request.body.recommendation },
      $setOnInsert: {
        reportId: `RPT-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
        patient: scan.patient,
        scan: scan._id,
        createdBy: ownerId,
        doctorName: request.user.name,
        status: "draft",
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await AuditLog.create({
    actorId: ownerId,
    actorName: request.user.name,
    action: "report.draft_saved",
    entityType: "report",
    entityId: report.reportId,
  });

  return response.status(201).json({
    report: {
      id: report.reportId,
      scanId: request.body.scanId,
      doctorNotes: report.doctorNotes,
      recommendation: report.recommendation,
      status: report.status,
      doctorName: report.doctorName,
      aiAnalysis: scan.analysis?.source === "fastapi" ? {
        predictedClass: scan.analysis.predictedClass,
        confidence: scan.analysis.confidence,
        classProbabilities: scan.analysis.classProbabilities,
        modelName: scan.analysis.modelName,
        modelVersion: scan.analysis.modelVersion,
        analyzedAt: scan.analysis.analyzedAt,
      } : null,
      updatedAt: report.updatedAt,
    }
  });
}

function uploadPdf(cloud, publicId, buffer) {
  return new Promise((resolve, reject) => {
    cloud.uploader.upload_stream({
      folder: "brainscan/reports",
      public_id: publicId,
      resource_type: "raw",
      type: "authenticated",
      format: "pdf",
      overwrite: false,
      unique_filename: false,
      use_filename: false,
    }, (error, result) => {
      if (error || !result) return reject(error ?? new Error("Cloudinary returned no PDF upload result"));
      resolve(result);
    }).end(buffer);
  });
}

async function downloadGradCam(cloud, analysis) {
  if (!analysis?.gradCamPublicId) return null;
  const url = cloud.utils.private_download_url(analysis.gradCamPublicId, analysis.gradCamFormat || "png", {
    resource_type: "image",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Unable to retrieve the private Grad-CAM image for the report");
  return Buffer.from(await response.arrayBuffer());
}

export async function finalizeReport(request, response) {
  const ownerId = String(request.user._id);
  const cloud = getCloudinary();
  if (!cloud) return response.status(503).json({ error: "Cloudinary storage is not configured" });

  const report = await Report.findOne({ reportId: request.params.reportId, createdBy: ownerId })
    .populate({ path: "patient", select: "patientId name dateOfBirth gender", match: { createdBy: ownerId } })
    .populate({ path: "scan", select: "scanId format scanDate analysis", match: { createdBy: ownerId } });
  if (!report || !report.patient || !report.scan) return response.status(404).json({ error: "Report draft not found" });
  if (report.status === "finalized" && report.cloudinaryReportPublicId) {
    await Scan.updateOne({ _id: report.scan._id, createdBy: ownerId }, { $set: { status: "completed" } });
    return response.json({ id: report.reportId, scanId: report.scan.scanId, status: report.status, scanStatus: "completed", finalizedAt: report.finalizedAt, pdfAvailable: true });
  }
  if (!report.doctorNotes.trim() && !report.recommendation.trim()) {
    return response.status(400).json({ error: "Add clinician notes or a recommendation before finalizing" });
  }

  let gradCamImage = null;
  try {
    gradCamImage = await downloadGradCam(cloud, report.scan.analysis);
  } catch (error) {
    return response.status(502).json({ error: error.message || "Grad-CAM could not be included in the report" });
  }

  const aiAnalysis = report.scan.analysis?.source === "fastapi" ? report.scan.analysis : null;
  const finalizedAt = new Date();
  const pdfBuffer = await createReportPdf({
    report: { ...report.toObject(), finalizedAt },
    patient: report.patient,
    scan: report.scan,
    aiAnalysis,
    gradCamImage,
  });
  const pdfPublicId = `report-${report.reportId.toLowerCase()}`;
  let uploaded;
  try {
    uploaded = await uploadPdf(cloud, pdfPublicId, pdfBuffer);
  } catch (error) {
    console.error("Final report PDF upload failed", { message: error.message?.slice(0, 180) });
    return response.status(502).json({ error: "Final report PDF could not be stored" });
  }

  const previousScanStatus = report.scan.status;
  try {
    report.status = "finalized";
    report.finalizedAt = finalizedAt;
    report.cloudinaryReportPublicId = uploaded.public_id;
    report.reportUrl = uploaded.secure_url;
    await report.save();
    const scanUpdate = await Scan.updateOne({ _id: report.scan._id, createdBy: ownerId }, { $set: { status: "completed" } });
    if (!scanUpdate.matchedCount) throw new Error("Linked scan could not be marked complete");
    await AuditLog.create({
      actorId: ownerId,
      actorName: request.user.name,
      action: "report.finalized",
      entityType: "report",
      entityId: report.reportId,
    });
  } catch {
    report.status = "draft";
    report.finalizedAt = null;
    report.cloudinaryReportPublicId = null;
    report.reportUrl = null;
    await report.save().catch(() => undefined);
    await Scan.updateOne({ _id: report.scan._id, createdBy: ownerId }, { $set: { status: previousScanStatus } }).catch(() => undefined);
    await cloud.uploader.destroy(uploaded.public_id, { resource_type: "raw", type: "authenticated" }).catch(() => undefined);
    return response.status(500).json({ error: "Report status could not be saved; the generated PDF was removed" });
  }

  return response.json({ id: report.reportId, scanId: report.scan.scanId, status: report.status, scanStatus: "completed", finalizedAt: report.finalizedAt, pdfAvailable: true });
}

export async function downloadFinalReport(request, response) {
  const report = await Report.findOne({ reportId: request.params.reportId, createdBy: String(request.user._id) }).lean();
  if (!report || report.status !== "finalized" || !report.cloudinaryReportPublicId) {
    return response.status(404).json({ error: "Finalized report PDF not found" });
  }

  const cloud = getCloudinary();
  if (!cloud) return response.status(503).json({ error: "Cloudinary storage is not configured" });
  const url = cloud.utils.private_download_url(report.cloudinaryReportPublicId, "pdf", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: true,
  });
  response.set("Cache-Control", "private, no-store");
  return response.redirect(url);
}
