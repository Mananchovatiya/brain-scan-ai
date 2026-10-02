import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  emailVerified: { type: Boolean, default: false },
  image: { type: String, default: null },
  role: { type: String, enum: ["doctor", "admin"], default: "doctor", required: true },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  medicalRegistrationNumber: { type: String, trim: true, maxlength: 80, default: "" },
  specialization: { type: String, trim: true, maxlength: 120, default: "" },
  clinic: { type: String, trim: true, maxlength: 160, default: "" },
  isActive: { type: Boolean, default: true, required: true },
  tokenVersion: { type: Number, default: 0, required: true, min: 0 },
}, {
  timestamps: true,
  strict: "throw",
  collection: "users",
});

userSchema.index({ role: 1, isActive: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
