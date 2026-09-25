import { z } from "@/lib/zod";

export const groupNameSchema = z.object({
  name: z
    .string({ error: "Poné un nombre" })
    .trim()
    .min(1, "Poné un nombre")
    .max(80, "Hasta 80 letras"),
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .transform((c) => c.toUpperCase());
