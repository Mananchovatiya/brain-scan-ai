import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(40).optional().default(""),
  medicalRegistrationNumber: z.string().trim().min(1).max(80),
  specialization: z.string().trim().min(2).max(120),
  clinic: z.string().trim().min(2).max(160),
}).strict();

export const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  medicalRegistrationNumber: z.string().trim().max(80).optional(),
  specialization: z.string().trim().max(120).optional(),
  clinic: z.string().trim().max(160).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one profile field",
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
}).strict();
