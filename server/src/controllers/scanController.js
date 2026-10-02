import { randomUUID } from "node:crypto";
import { getCloudinary } from "../config/cloudinary.js";
import { analyzeScan } from "../services/aiService.js";
import { AuditLog } from "../models/AuditLog.js";
import { Patient } from "../models/Patient.js";
import { Scan } from "../models/Scan.js";

export async function listScans(request, response) {
  const ownerId = String(request.user._id);
  const scans = await Scan.find({ createdBy: ownerId })
    .populate({ path: "patient", select: "patientId name", match: { createdBy: ownerId } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return response.json({
    scans: scans.flatMap((scan) => {
      if (!scan.patient) return [];
      return [{
        id: scan.scanId,
        scanId: scan.scanId,
        patientId: scan.patient.patientId,
        patientName: scan.patient.name,
        date: scan.scanDate,
        format: scan.format,
        fileSize: scan.fileSize,
        status: scan.status,
        result: scan.analysis?.predictedClass ?? null,
        confidence: scan.analysis?.confidence ?? null,
        classProbabilities: scan.analysis?.classProbabilities ?? [],
        modelName: scan.analysis?.modelName ?? null,
        modelVersion: scan.analysis?.modelVersion ?? null,
        analyzedAt: scan.analysis?.analyzedAt ?? null,
        aiAnalysis: scan.analysis?.source === "fastapi" ? {
          predictedClass: scan.analysis.predictedClass,
          confidence: scan.analysis.confidence,
          classProbabilities: scan.analysis.classProbabilities,
          modelName: scan.analysis.modelName,
          modelVersion: scan.analysis.modelVersion,
          analyzedAt: scan.analysis.analyzedAt,
          gradCamAvailable: Boolean(scan.analysis.gradCamPublicId),
        } : null,
      }];
    })
  });
}

async function storeGradCam(cloud, dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error("AI service Grad-CAM must be a PNG data URL");
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 15 * 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error("AI service Grad-CAM image is invalid or too large");
  }
  const publicId = randomUUID();
  const uploaded = await new Promise((resolve, reject) => {
    cloud.uploader.upload_stream({
      folder: "brainscan/gradcam",
      public_id: publicId,
      resource_type: "image",
      type: "authenticated",
      overwrite: false,
      unique_filename: false,
      use_filename: false,
    }, (error, result) => {
      if (error || !result) return reject(error ?? new Error("Cloudinary returned no Grad-CAM upload result"));
      resolve(result);
    }).end(bytes);
  });
  return { publicId: uploaded.public_id, format: "png" };
}

function signedGradCamUrl(cloud, analysis) {
  if (!analysis?.gradCamPublicId) return null;
  return cloud.utils.private_download_url(analysis.gradCamPublicId, analysis.gradCamFormat || "png", {
    resource_type: "image",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
}

function hasValidImageSignature(file) {
  const extension = file.originalname.split(".").pop()?.toLowerCase();
  if (extension === "png") {
    return file.mimetype === "image/png"
      && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (extension === "jpg" || extension === "jpeg") {
    return file.mimetype === "image/jpeg"
      && file.buffer[0] === 0xff
      && file.buffer[1] === 0xd8
      && file.buffer[2] === 0xff;
  }
  return false;
}

export async function uploadScan(request, response) {
  const file = request.file;
  if (!file) return response.status(400).json({ error: "Choose a PNG or JPG MRI image" });
  if (!hasValidImageSignature(file)) {
    return response.status(400).json({ error: "Upload must be a valid PNG or JPG image. DICOM is disabled until de-identification is available." });
  }

  const cloud = getCloudinary();
  if (!cloud) return response.status(503).json({ error: "Cloudinary storage is not configured" });

  const ownerId = String(request.user._id);
  const patient = await Patient.findOne({ patientId: request.body.patientId, createdBy: ownerId })
    .select("_id patientId name")
    .lean();
  if (!patient) return response.status(404).json({ error: "Patient not found" });

  const publicId = randomUUID();
  const scanId = `MRI-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  let uploaded;
  try {
    uploaded = await new Promise((resolve, reject) => {
      cloud.uploader.upload_stream({
        folder: "brainscan/scans",
        public_id: publicId,
        resource_type: "image",
        type: "authenticated",
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      }, (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary returned no upload result"));
        resolve(result);
      }).end(file.buffer);
    });
  } catch (error) {
    const providerError = error?.error;
    console.error("Cloudinary MRI upload failed", {
      providerCode: providerError?.code ?? error?.code ?? null,
      httpCode: error?.http_code ?? error?.httpCode ?? null,
      message: typeof providerError?.message === "string"
        ? providerError.message.slice(0, 240)
        : typeof error?.message === "string" ? error.message.slice(0, 240) : "Unknown Cloudinary error",
    });
    return response.status(502).json({ error: "MRI upload failed. No scan record was created." });
  }

  let scan;
  try {
    scan = await Scan.create({
      scanId,
      patient: patient._id,
      createdBy: ownerId,
      cloudinaryPublicId: uploaded.public_id,
      cloudinaryUrl: uploaded.secure_url,
      resourceType: uploaded.resource_type,
      format: uploaded.format,
      fileSize: uploaded.bytes,
      status: "uploaded",
    });
    await AuditLog.create({
      actorId: ownerId,
      actorName: request.user.name,
      action: "scan.uploaded",
      entityType: "scan",
      entityId: scanId,
    });
  } catch {
    await Scan.deleteOne({ scanId, createdBy: ownerId }).catch(() => undefined);
    await cloud.uploader.destroy(uploaded.public_id, {
      resource_type: uploaded.resource_type,
      type: "authenticated",
    }).catch(() => undefined);
    return response.status(500).json({ error: "Scan metadata could not be saved; the uploaded file was removed" });
  }

  return response.status(201).json({
    scan: {
      id: scan.scanId,
      scanId: scan.scanId,
      patientId: patient.patientId,
      patientName: patient.name,
      date: scan.scanDate,
      format: scan.format,
      fileSize: scan.fileSize,
      status: scan.status,
      result: null,
      confidence: null,
    }
  });
}

export async function previewScan(request, response) {
  const cloud = getCloudinary();
  if (!cloud) return response.status(503).json({ error: "Cloudinary storage is not configured" });

  const scan = await Scan.findOne({ scanId: request.params.scanId, createdBy: String(request.user._id) }).lean();
  if (!scan) return response.status(404).json({ error: "Scan not found" });

  const url = cloud.utils.private_download_url(scan.cloudinaryPublicId, scan.format, {
    resource_type: scan.resourceType,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
  response.set("Cache-Control", "private, no-store");
  return response.redirect(url);
}

export async function analyzeUploadedScan(request, response) {
  const ownerId = String(request.user._id);
  const scan = await Scan.findOne({ scanId: request.params.scanId, createdBy: ownerId })
    .populate({ path: "patient", select: "patientId", match: { createdBy: ownerId } })
    .lean();
  if (!scan || !scan.patient) return response.status(404).json({ error: "Scan not found" });

  let imageUrl = null;
  if (process.env.AI_SERVICE_URL) {
    const cloud = getCloudinary();
    if (!cloud) return response.status(503).json({ error: "Cloudinary storage is not configured" });
    imageUrl = cloud.utils.private_download_url(scan.cloudinaryPublicId, scan.format, {
      resource_type: scan.resourceType,
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
  }

  let analysis;
  const isFastApiConfigured = Boolean(process.env.AI_SERVICE_URL);
  try {
    analysis = await analyzeScan({ scanId: scan.scanId, imageUrl, format: scan.format });
  } catch (error) {
    await Scan.updateOne({ _id: scan._id, createdBy: ownerId }, { $set: { status: "failed" } }).catch(() => undefined);
    return response.status(error.status || 502).json({ error: error.message || "AI analysis failed" });
  }

  let gradCamAsset = null;
  if (isFastApiConfigured && !analysis.isMock && analysis.gradCamUrl) {
    const cloud = getCloudinary();
    try {
      gradCamAsset = await storeGradCam(cloud, analysis.gradCamUrl);
    } catch (error) {
      console.error("Grad-CAM storage failed", { name: error.name, message: error.message?.slice(0, 160) });
      return response.status(502).json({ error: "Grad-CAM could not be stored securely; analysis was not saved" });
    }
  }

  if (isFastApiConfigured && !analysis.isMock) {
    const previousGradCam = scan.analysis?.gradCamPublicId;
    try {
      await Scan.updateOne({ _id: scan._id, createdBy: ownerId }, {
        $set: {
          status: "needs_review",
          analysis: {
            predictedClass: analysis.prediction.predictedClass,
            confidence: analysis.prediction.confidence,
            classProbabilities: analysis.classProbabilities,
            modelName: analysis.model.name,
            modelVersion: analysis.model.version,
            processingTimeMs: analysis.processingTimeMs,
            analyzedAt: new Date(),
            source: "fastapi",
            gradCamPublicId: gradCamAsset?.publicId ?? null,
            gradCamFormat: gradCamAsset?.format ?? null,
          },
        },
      });
    } catch (error) {
      if (gradCamAsset) {
        await getCloudinary().uploader.destroy(gradCamAsset.publicId, { resource_type: "image", type: "authenticated" }).catch(() => undefined);
      }
      throw error;
    }
    if (previousGradCam && previousGradCam !== gradCamAsset?.publicId) {
      await getCloudinary().uploader.destroy(previousGradCam, { resource_type: "image", type: "authenticated" }).catch(() => undefined);
    }
    analysis.gradCamUrl = signedGradCamUrl(getCloudinary(), { gradCamPublicId: gradCamAsset?.publicId, gradCamFormat: gradCamAsset?.format });
  }

  await AuditLog.create({
    actorId: ownerId,
    actorName: request.user.name,
    action: analysis.isMock ? "scan.mock_analysis_returned" : "scan.analysis_returned",
    entityType: "scan",
    entityId: scan.scanId,
  });

  response.set("Cache-Control", "private, no-store");
  return response.json({ scanId: scan.scanId, ...analysis });
}

export async function getSavedAnalysis(request, response) {
  const ownerId = String(request.user._id);
  const scan = await Scan.findOne({ scanId: request.params.scanId, createdBy: ownerId }).lean();
  if (!scan) return response.status(404).json({ error: "Scan not found" });
  if (scan.analysis?.source !== "fastapi") return response.status(404).json({ error: "No saved AI analysis is available for this scan" });

  const cloud = getCloudinary();
  if (scan.analysis.gradCamPublicId && !cloud) return response.status(503).json({ error: "Cloudinary storage is not configured" });
  response.set("Cache-Control", "private, no-store");
  return response.json({
    scanId: scan.scanId,
    source: "fastapi",
    isMock: false,
    mockDisclaimer: null,
    prediction: { predictedClass: scan.analysis.predictedClass, confidence: scan.analysis.confidence },
    classProbabilities: scan.analysis.classProbabilities,
    gradCamUrl: cloud ? signedGradCamUrl(cloud, scan.analysis) : null,
    model: { name: scan.analysis.modelName, version: scan.analysis.modelVersion },
    processingTimeMs: scan.analysis.processingTimeMs,
    analyzedAt: scan.analysis.analyzedAt,
  });
}
