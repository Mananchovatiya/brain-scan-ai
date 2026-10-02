import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true, index: true, maxlength: 40 },
  createdBy: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, required: true, enum: ["Female", "Male", "Other", "Prefer not to say"] },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  address: { type: String, trim: true, maxlength: 500, default: "" },
  emergencyContactName: { type: String, trim: true, maxlength: 120, default: "" },
  emergencyContactPhone: { type: String, trim: true, maxlength: 40, default: "" },
  emergencyContactRelationship: { type: String, trim: true, maxlength: 60, default: "" },
}, {
  timestamps: true,
  strict: "throw",
  collection: "patients",
});

patientSchema.index({ createdBy: 1, createdAt: -1 });

export const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema);
