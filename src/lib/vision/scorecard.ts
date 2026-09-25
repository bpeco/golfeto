import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, VISION_MODEL, type ImageInput } from "./client";

export const scorecardExtractionSchema = z.object({
  rows: z.array(
    z.object({
      /** Nombre tal como está escrito en la fila. */
      name: z.string(),
      /** Golpes por columna en el orden de la tarjeta; null si la celda está vacía o ilegible. */
      strokes: z.array(z.number().int().nullable()),
      /** Total escrito en la tarjeta, si hay. */
      writtenTotal: z.number().int().nullable(),
      /** Celdas dudosas (índice desde 0) para que el usuario las revise. */
      uncertain: z.array(z.number().int()),
    }),
  ),
  /** Números de hoyo detectados en la cabecera, en orden; vacío si no se ven. */
  holeNumbers: z.array(z.number().int()),
  notes: z.string(),
});

export type ScorecardExtraction = z.infer<typeof scorecardExtractionSchema>;

/**
 * Lee una foto de tarjeta de papel con varios jugadores y devuelve una fila por jugador.
 * Nunca se toma como definitivo: la app propone y el golfista confirma (Q6 del diseño).
 */
export async function extractScorecard(
  image: ImageInput,
  ctx: { holesInRound: number; playerNames: string[] },
): Promise<ScorecardExtraction> {
  const res = await anthropic().messages.parse({
    model: VISION_MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: [
      "Sos un lector de tarjetas de golf argentinas escritas a mano.",
      "La foto muestra una tarjeta de papel con una fila por jugador y una columna por hoyo (normalmente 1-9, OUT, 10-18, IN, TOTAL).",
      "Devolvé una fila por jugador con los golpes por hoyo EN ORDEN, ignorando columnas de subtotal (OUT/IN/TOT) y las filas de par, hándicap de hoyo o distancias.",
      `Se jugaron ${ctx.holesInRound} hoyos; strokes debe tener exactamente ${ctx.holesInRound} elementos (null donde no se lee).`,
      ctx.playerNames.length ? `Jugadores de esta partida: ${ctx.playerNames.join(", ")}. Si el nombre escrito es una abreviatura o apodo, dejalo tal como está escrito; no lo reemplaces.` : "",
      "Si un número es dudoso, ponelo igual y marcá su índice en uncertain. Si una celda tiene una X o un guion, es null.",
    ]
      .filter(Boolean)
      .join("\n"),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
          { type: "text", text: "Extraé los golpes de esta tarjeta." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(scorecardExtractionSchema) },
  });

  if (res.stop_reason === "refusal") throw new Error("El modelo no pudo procesar la imagen");
  if (!res.parsed_output) throw new Error("No se pudo interpretar la tarjeta");
  return res.parsed_output;
}

export const courseCardSchema = z.object({
  courseName: z.string().nullable(),
  club: z.string().nullable(),
  holes: z.array(
    z.object({
      number: z.number().int(),
      par: z.number().int(),
      strokeIndex: z.number().int().nullable(),
    }),
  ),
  tees: z.array(
    z.object({
      /** Nombre/color del tee tal como figura (Blancas, Azules, Negras, etc.). */
      name: z.string(),
      courseRating: z.number().nullable(),
      slope: z.number().int().nullable(),
      /** Distancia por hoyo en el mismo orden que holes; null si no se lee. */
      distances: z.array(z.number().int().nullable()),
      unit: z.enum(["metros", "yardas", "desconocida"]),
    }),
  ),
  notes: z.string(),
});

export type CourseCardExtraction = z.infer<typeof courseCardSchema>;

/** Lee la tarjeta impresa del club: par, hándicap de hoyo y distancias/rating por tee. */
export async function extractCourseCard(image: ImageInput): Promise<CourseCardExtraction> {
  const res = await anthropic().messages.parse({
    model: VISION_MODEL,
    max_tokens: 6000,
    thinking: { type: "adaptive" },
    system: [
      "Sos un lector de tarjetas impresas de canchas de golf argentinas.",
      "Extraé para cada hoyo el par y el hándicap de hoyo (también llamado 'Hcp', 'Índice' o 'S.I.'), y para cada tee (identificado por color) la distancia por hoyo, el Course Rating y el Slope si figuran.",
      "Ignorá columnas de subtotales (OUT/IN/TOTAL). Indicá la unidad de distancia. Si algo no está, usá null.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
          { type: "text", text: "Extraé los datos de esta tarjeta de cancha." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(courseCardSchema) },
  });
  if (res.stop_reason === "refusal") throw new Error("El modelo no pudo procesar la imagen");
  if (!res.parsed_output) throw new Error("No se pudo interpretar la tarjeta");
  return res.parsed_output;
}
