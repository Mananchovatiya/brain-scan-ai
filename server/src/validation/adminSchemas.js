import { z } from "zod";

export const doctorStatusSchema = z.object({ isActive: z.boolean() }).strict();
