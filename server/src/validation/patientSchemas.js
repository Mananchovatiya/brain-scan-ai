import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  dateOfBirth: z.string().date(),
  gender: z.enum(["Female", "Male", "Other", "Prefer not to say"]),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  emergencyContactName: z.string().trim().max(120).optional().default(""),
  emergencyContactPhone: z.string().trim().max(40).optional().default(""),
  emergencyContactRelationship: z.string().trim().max(60).optional().default(""),
}).strict();
