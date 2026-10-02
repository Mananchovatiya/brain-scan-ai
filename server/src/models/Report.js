import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true, index: true, maxlength: 40 },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  scan: { type: mongoose.Schema.Types.ObjectId, ref: "Scan", required: true, index: true },
  createdBy: { type: String, required: true, index: true },
  doctorName: { type: String, required: true, maxlength: 120 },
  doctorNotes: { type: String, trim: true, maxlength: 5000, default: "" },
  recommendation: { type: String, trim: true, maxlength: 3000, default: "" },
  status: { type: String, enum: ["draft", "finalized"], default: "draft" },
  finalizedAt: { type: Date, default: null },
  cloudinaryReportPublicId: { type: String, default: null },
  reportUrl: { type: String, default: null },
}, {
  timestamps: true,
  strict: "throw",
  collection: "reports",
});

reportSchema.index({ createdBy: 1, createdAt: -1 });
reportSchema.index({ createdBy: 1, scan: 1 }, { unique: true });

export const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
