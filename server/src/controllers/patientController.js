import { randomUUID } from "node:crypto";
import { AuditLog } from "../models/AuditLog.js";
import { Patient } from "../models/Patient.js";

function serializePatient(patient) {
  const record = patient.toObject ? patient.toObject() : patient;
  const { _id, createdBy, ...fields } = record;
  return { ...fields, _id: String(_id) };
}

export async function listPatients(request, response) {
  const patients = await Patient.find({ createdBy: String(request.user._id) })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return response.json({ patients: patients.map(serializePatient) });
}

export async function createPatient(request, response) {
  const patientId = `PT-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const patient = await Patient.create({ ...request.body, patientId, createdBy: String(request.user._id) });
  await AuditLog.create({
    actorId: String(request.user._id),
    actorName: request.user.name,
    action: "patient.created",
    entityType: "patient",
    entityId: patientId,
  });
  return response.status(201).json({ patient: serializePatient(patient) });
}

export async function updatePatient(request, response) {
  const patient = await Patient.findOneAndUpdate(
    { patientId: request.params.patientId, createdBy: String(request.user._id) },
    { $set: { ...request.body, dateOfBirth: new Date(request.body.dateOfBirth) } },
    { new: true, runValidators: true },
  );
  if (!patient) return response.status(404).json({ error: "Patient not found" });

  await AuditLog.create({
    actorId: String(request.user._id),
    actorName: request.user.name,
    action: "patient.updated",
    entityType: "patient",
    entityId: request.params.patientId,
  });
  return response.json({ patient: serializePatient(patient) });
}
