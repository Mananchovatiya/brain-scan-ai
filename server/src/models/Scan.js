import mongoose from "mongoose";

const scanSchema = new mongoose.Schema({
  scanId: { type: String, required: true, unique: true, index: true, maxlength: 40 },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  createdBy: { type: String, required: true, index: true },
  cloudinaryPublicId: { type: String, required: true, unique: true },
  cloudinaryUrl: { type: String, required: true },
  resourceType: { type: String, enum: ["image", "raw"], required: true },
  format: { type: String, required: true, maxlength: 12 },
  fileSize: { type: Number, required: true, min: 1, max: 50 * 1024 * 1024 },
  scanDate: { type: Date, required: true, default: Date.now },
  analysis: {
    predictedClass: { type: String, trim: true, maxlength: 80 },
    confidence: { type: Number, min: 0, max: 1 },
    classProbabilities: [{
      className: { type: String, required: true, trim: true, maxlength: 80 },
      probability: { type: Number, required: true, min: 0, max: 1 },
      _id: false,
    }],
    modelName: { type: String, trim: true, maxlength: 120 },
    modelVersion: { type: String, trim: true, maxlength: 80 },
    processingTimeMs: { type: Number, min: 0 },
    analyzedAt: { type: Date },
    source: { type: String, enum: ["fastapi"] },
    gradCamPublicId: { type: String, default: null },
    gradCamFormat: { type: String, enum: ["png"], default: null },
  },
  status: {
    type: String,
    enum: ["uploaded", "processing", "needs_review", "completed", "failed"],
    default: "uploaded",
    index: true,
  },
}, {
  timestamps: true,
  strict: "throw",
  collection: "scans",
});

scanSchema.index({ createdBy: 1, createdAt: -1 });

export const Scan = mongoose.models.Scan || mongoose.model("Scan", scanSchema);
