import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:promote --workspace @brainscan/server -- doctor@example.com");
  process.exit(1);
}

try {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || "brainscan_conversion" });
  const user = await User.findOneAndUpdate({ email, role: "doctor" }, { $set: { role: "admin" } }, { new: true }).select("email role");
  if (!user) throw new Error("No doctor account found for that email");
  console.log(`Admin role assigned to ${user.email}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
