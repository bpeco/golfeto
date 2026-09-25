import { z } from "@/lib/zod";

export const declaredHandicapSchema = z
  .number({ error: "Escribí tu índice, por ejemplo 18,4" })
  .min(-10, "Va de +10 (plus) a 54")
  .max(54, "Va de +10 (plus) a 54")
  .transform((v) => Math.round(v * 10) / 10);

export const displayNameSchema = z
  .string({ error: "Poné tu nombre" })
  .trim()
  .min(1, "Poné tu nombre")
  .max(80, "Hasta 80 letras");
