import { z } from "zod";

export const reportDraftSchema = z.object({
  scanId: z.string().trim().min(1).max(40),
  doctorNotes: z.string().trim().max(5000).optional().default(""),
  recommendation: z.string().trim().max(3000).optional().default(""),
}).strict().refine((value) => value.doctorNotes.length > 0 || value.recommendation.length > 0, {
  message: "Add review notes or a recommendation before saving a draft",
});
