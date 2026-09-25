"use server";

import { toImageInput } from "@/lib/vision/client";
import { extractCourseCard, type CourseCardExtraction } from "@/lib/vision/scorecard";

/** Lee la tarjeta impresa del club para prellenar el formulario de cancha. */
export async function readCourseCard(formData: FormData): Promise<{ error?: string; card?: CourseCardExtraction }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Falta la foto" };
  try {
    const card = await extractCourseCard(toImageInput(await file.arrayBuffer(), file.type));
    return { card };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falló la lectura" };
  }
}
