import mongoose from "mongoose";
import { AuditLog } from "../models/AuditLog.js";
import { Patient } from "../models/Patient.js";
import { Report } from "../models/Report.js";
import { Scan } from "../models/Scan.js";
import { User } from "../models/User.js";

export async function getOverview(request, response) {
  const [doctors, activeDoctors, patients, scans, pendingScans, reports, auditEvents] = await Promise.all([
    User.countDocuments({ role: "doctor" }),
    User.countDocuments({ role: "doctor", isActive: { $ne: false } }),
    Patient.countDocuments({}),
    Scan.countDocuments({}),
    Scan.countDocuments({ status: { $in: ["uploaded", "processing", "needs_review"] } }),
    Report.countDocuments({}),
    AuditLog.countDocuments({}),
  ]);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const trendStart = new Date(today);
  trendStart.setUTCDate(trendStart.getUTCDate() - 13);
  const storedTrend = await Scan.aggregate([
    { $match: { createdAt: { $gte: trendStart } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const countByDate = new Map(storedTrend.map((item) => [item._id, item.count]));
  const scanTrend = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(trendStart);
    day.setUTCDate(trendStart.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: countByDate.get(key) ?? 0 };
  });

  return response.json({ overview: { doctors, activeDoctors, patients, scans, pendingScans, reports, auditEvents, scanTrend } });
}

export async function listDoctors(request, response) {
  const doctors = await User.find({ role: "doctor" })
    .select("name email phone medicalRegistrationNumber specialization clinic isActive createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const doctorIds = doctors.map((doctor) => String(doctor._id));
  const [patientGroups, scanGroups, reportGroups] = await Promise.all([
    Patient.aggregate([{ $match: { createdBy: { $in: doctorIds } } }, { $group: { _id: "$createdBy", count: { $sum: 1 } } }]),
    Scan.aggregate([{ $match: { createdBy: { $in: doctorIds } } }, { $group: { _id: "$createdBy", count: { $sum: 1 } } }]),
    Report.aggregate([{ $match: { createdBy: { $in: doctorIds } } }, { $group: { _id: "$createdBy", count: { $sum: 1 } } }]),
  ]);
  const counts = (groups) => new Map(groups.map((group) => [String(group._id), group.count]));
  const patientCounts = counts(patientGroups);
  const scanCounts = counts(scanGroups);
  const reportCounts = counts(reportGroups);

  return response.json({
    doctors: doctors.map((doctor) => ({
      id: String(doctor._id),
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone ?? "",
      registrationNumber: doctor.medicalRegistrationNumber ?? "",
      specialization: doctor.specialization ?? "",
      clinic: doctor.clinic ?? "",
      isActive: doctor.isActive !== false,
      createdAt: doctor.createdAt,
      patientCount: patientCounts.get(String(doctor._id)) ?? 0,
      scanCount: scanCounts.get(String(doctor._id)) ?? 0,
      reportCount: reportCounts.get(String(doctor._id)) ?? 0,
    }))
  });
}

export async function updateDoctorStatus(request, response) {
  if (!mongoose.isValidObjectId(request.params.doctorId)) {
    return response.status(404).json({ error: "Doctor account not found" });
  }
  const doctor = await User.findOneAndUpdate(
    { _id: request.params.doctorId, role: "doctor" },
    {
      $set: { isActive: request.body.isActive },
      ...(!request.body.isActive ? { $inc: { tokenVersion: 1 } } : {}),
    },
    { new: true, runValidators: true },
  );
  if (!doctor) return response.status(404).json({ error: "Doctor account not found" });

  await AuditLog.create({
    actorId: String(request.user._id),
    actorName: request.user.name,
    action: request.body.isActive ? "doctor.activated" : "doctor.deactivated",
    entityType: "doctor",
    entityId: String(doctor._id),
  });
  return response.json({ isActive: doctor.isActive });
}

export async function listAllPatients(request, response) {
  const patients = await Patient.find({}).sort({ createdAt: -1 }).limit(500).lean();
  const doctorIds = [...new Set(patients.map((patient) => patient.createdBy))];
  const doctors = await User.find({ _id: { $in: doctorIds } }).select("name email").lean();
  const doctorById = new Map(doctors.map((doctor) => [String(doctor._id), doctor]));
  const scanGroups = await Scan.aggregate([{ $group: { _id: "$patient", count: { $sum: 1 } } }]);
  const scansByPatient = new Map(scanGroups.map((group) => [String(group._id), group.count]));

  return response.json({
    patients: patients.map((patient) => {
      const doctor = doctorById.get(patient.createdBy);
      return {
        id: patient.patientId,
        name: patient.name,
        gender: patient.gender,
        doctorName: doctor?.name ?? "Account unavailable",
        doctorEmail: doctor?.email ?? "",
        examinations: scansByPatient.get(String(patient._id)) ?? 0,
        createdAt: patient.createdAt,
      };
    })
  });
}

export async function listAllScans(request, response) {
  const scans = await Scan.find({})
    .populate("patient", "patientId name")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const doctorIds = [...new Set(scans.map((scan) => scan.createdBy))];
  const doctors = await User.find({ _id: { $in: doctorIds } }).select("name email").lean();
  const doctorById = new Map(doctors.map((doctor) => [String(doctor._id), doctor]));

  return response.json({
    scans: scans.flatMap((scan) => {
      if (!scan.patient) return [];
      const doctor = doctorById.get(scan.createdBy);
      return [{
        scanId: scan.scanId,
        patientId: scan.patient.patientId,
        patientName: scan.patient.name,
        doctorName: doctor?.name ?? "Account unavailable",
        doctorEmail: doctor?.email ?? "",
        format: scan.format,
        fileSize: scan.fileSize,
        status: scan.status,
        result: scan.analysis?.predictedClass ?? null,
        confidence: scan.analysis?.confidence ?? null,
        createdAt: scan.createdAt,
      }];
    })
  });
}

export async function listAllReports(request, response) {
  const reports = await Report.find({})
    .populate("patient", "patientId")
    .populate("scan", "scanId")
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();
  return response.json({
    reports: reports.flatMap((report) => {
      if (!report.patient || !report.scan) return [];
      return [{ id: report.reportId, patientId: report.patient.patientId, scanId: report.scan.scanId, doctorName: report.doctorName, status: report.status, updatedAt: report.updatedAt }];
    })
  });
}

export async function listAuditLogs(request, response) {
  const entries = await AuditLog.find({})
    .select({ actorId: 1, actorName: 1, action: 1, entityType: 1, entityId: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return response.json({
    entries: entries.map((entry) => ({
      id: String(entry._id),
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      createdAt: entry.createdAt,
    }))
  });
}
