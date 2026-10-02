import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  actorId: { type: String, required: true, index: true },
  actorName: { type: String, required: true, maxlength: 120 },
  action: { type: String, required: true, maxlength: 80 },
  entityType: { type: String, required: true, maxlength: 40 },
  entityId: { type: String, required: true, maxlength: 80 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  strict: "throw",
  collection: "auditlogs",
});

auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
