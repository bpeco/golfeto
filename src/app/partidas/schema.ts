import { z } from "zod";

export const roundInputSchema = z.object({
  courseVersionId: z.string().uuid(),
  teeSetId: z.string().uuid(),
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holesPlayed: z.enum(["completa", "ida", "vuelta"]),
  loops: z.union([z.literal(1), z.literal(2)]),
  playerIds: z.array(z.string().uuid()),
  guests: z.array(z.object({ name: z.string().trim().min(1).max(80), declaredHandicap: z.number().min(-10).max(54).nullable() })),
  notes: z.string().trim().max(500).optional(),
});

export type RoundInput = z.input<typeof roundInputSchema>;
