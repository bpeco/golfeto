import { z } from "zod";

const holeSchema = z.object({
  number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  strokeIndex: z.number().int().min(1).max(18).nullable(),
});

const teeSchema = z.object({
  name: z.string().trim().min(1).max(40),
  courseRating: z.number().min(40).max(90).nullable(),
  slope: z.number().int().min(55).max(155).nullable(),
  /** metros por número de hoyo; faltantes = sin dato */
  distances: z.record(z.string(), z.number().int().min(50).max(800)),
});

export const courseInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  club: z.string().trim().max(120).optional().transform((v) => v || null),
  city: z.string().trim().max(120).optional().transform((v) => v || null),
  holesCount: z.union([z.literal(9), z.literal(18)]),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holes: z.array(holeSchema),
  tees: z.array(teeSchema).min(1),
});

export type CourseInput = z.input<typeof courseInputSchema>;
