import Anthropic from "@anthropic-ai/sdk";

/** Modelo de visión. Sonnet 5 por defecto (decisión de diseño: ~US$0,006 por foto); se puede cambiar por entorno. */
export const VISION_MODEL = process.env.GALF_VISION_MODEL ?? "claude-sonnet-5";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY");
  client ??= new Anthropic();
  return client;
}

export type ImageInput = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export function toImageInput(bytes: ArrayBuffer | Buffer, mediaType: string): ImageInput {
  const mt = (["image/jpeg", "image/png", "image/webp"].includes(mediaType) ? mediaType : "image/jpeg") as ImageInput["mediaType"];
  return { data: Buffer.from(bytes as ArrayBuffer).toString("base64"), mediaType: mt };
}
