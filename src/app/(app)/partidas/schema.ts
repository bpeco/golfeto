import { z } from "@/lib/zod";

const uuid = (message: string) => z.string({ error: message }).uuid(message);

export const roundInputSchema = z.object({
  courseVersionId: uuid("Elegí una cancha"),
  teeSetId: uuid("Elegí el tee"),
  playedOn: z.string({ error: "Elegí la fecha" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha"),
  holesPlayed: z.enum(["completa", "ida", "vuelta"], { error: "Elegí cuántos hoyos" }),
  loops: z.union([z.literal(1), z.literal(2)], { error: "Elegí las vueltas" }),
  playerIds: z.array(z.string().uuid()),
  guests: z.array(
    z.object({
      name: z.string().trim().min(1, "Poné el nombre del invitado").max(80, "Hasta 80 letras"),
      declaredHandicap: z.number({ error: "Hándicap de +10 (plus) a 54" }).min(-10, "Hándicap de +10 (plus) a 54").max(54, "Hándicap de +10 (plus) a 54").nullable(),
    }),
  ),
  notes: z.string().trim().max(500, "Hasta 500 letras").optional(),
});

export type RoundInput = z.input<typeof roundInputSchema>;

/** CR y Slope del tee de una partida que no los tenía (para poder firmar). CR de 9 hoyos ~35. */
export const teeRatingSchema = z.object({
  courseRating: z.number({ error: "CR entre 20 y 90" }).min(20, "CR entre 20 y 90").max(90, "CR entre 20 y 90"),
  slope: z.number({ error: "Slope entre 55 y 155" }).int("Slope entre 55 y 155").min(55, "Slope entre 55 y 155").max(155, "Slope entre 55 y 155"),
});
