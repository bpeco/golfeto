import { z } from "@/lib/zod";

const holeSchema = z.object({
  number: z.number().int().min(1).max(18),
  par: z.number({ error: "Par entre 3 y 6" }).int("Par entre 3 y 6").min(3, "Par entre 3 y 6").max(6, "Par entre 3 y 6"),
  strokeIndex: z.number({ error: "Hcp entre 1 y 18" }).int("Hcp entre 1 y 18").min(1, "Hcp entre 1 y 18").max(18, "Hcp entre 1 y 18").nullable(),
});

const teeSchema = z.object({
  name: z.string().trim().min(1, "Poné el color del tee").max(40, "Hasta 40 letras"),
  courseRating: z.number({ error: "CR entre 40 y 90" }).min(40, "CR entre 40 y 90").max(90, "CR entre 40 y 90").nullable(),
  slope: z.number({ error: "Slope entre 55 y 155" }).int("Slope entre 55 y 155").min(55, "Slope entre 55 y 155").max(155, "Slope entre 55 y 155").nullable(),
  /** metros por número de hoyo; faltantes = sin dato */
  distances: z.record(z.string(), z.number({ error: "Entre 50 y 800 m" }).int("Entre 50 y 800 m").min(50, "Entre 50 y 800 m").max(800, "Entre 50 y 800 m")),
});

export const courseInputSchema = z
  .object({
    name: z.string().trim().min(1, "Poné el nombre de la cancha").max(120, "Hasta 120 letras"),
    club: z.string().trim().max(120, "Hasta 120 letras").optional().transform((v) => v || null),
    city: z.string().trim().max(120, "Hasta 120 letras").optional().transform((v) => v || null),
    holesCount: z.union([z.literal(9), z.literal(18)]),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha"),
    holes: z.array(holeSchema),
    tees: z.array(teeSchema).min(1, "Cargá al menos un tee"),
  })
  .superRefine((v, ctx) => {
    if (v.holes.length !== v.holesCount) ctx.addIssue({ code: "custom", path: ["holes"], message: `Faltan hoyos: hay ${v.holes.length} de ${v.holesCount}` });
    const seen = new Map<number, number>();
    v.holes.forEach((h, i) => {
      if (h.strokeIndex == null) return;
      if (h.strokeIndex > v.holesCount) ctx.addIssue({ code: "custom", path: ["holes", i, "strokeIndex"], message: `Hcp entre 1 y ${v.holesCount}` });
      else if (seen.has(h.strokeIndex)) ctx.addIssue({ code: "custom", path: ["holes", i, "strokeIndex"], message: `El Hcp ${h.strokeIndex} está repetido` });
      seen.set(h.strokeIndex, i);
    });
  });

export type CourseInput = z.input<typeof courseInputSchema>;
