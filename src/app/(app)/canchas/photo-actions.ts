"use server";

import { toImageInput } from "@/lib/vision/client";
import { extractCourseCard, type CourseCardExtraction } from "@/lib/vision/scorecard";
import { fail, ok, type ActionResult } from "@/lib/action-result";

/** Lee la tarjeta impresa del club para prellenar el formulario de cancha. */
export async function readCourseCard(formData: FormData): Promise<ActionResult<CourseCardExtraction>> {
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Falta la foto.");
  try {
    return ok(await extractCourseCard(toImageInput(await file.arrayBuffer(), file.type)));
  } catch (e) {
    console.error("Lectura de tarjeta de cancha", e);
    return fail("No pudimos leer la tarjeta. Probá con una foto más de frente y con buena luz, o cargala a mano.");
  }
}
