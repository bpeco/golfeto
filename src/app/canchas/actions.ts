"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { courseInputSchema } from "./schema";
import { createClient } from "@/lib/supabase/server";



/**
 * Crea la cancha (si `courseId` es null) o una versión nueva de una existente
 * (cierra la vigente en `validFrom`). ADR-0001: la historia no se toca.
 */
export async function saveCourse(courseId: string | null, raw: unknown): Promise<{ error?: string; courseId?: string }> {
  const parsed = courseInputSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const input = parsed.data;
  if (input.holes.length !== input.holesCount) return { error: `Faltan hoyos: hay ${input.holes.length} de ${input.holesCount}` };

  const supabase = await createClient();
  let id = courseId;

  if (!id) {
    const { data, error } = await supabase
      .from("courses")
      .insert({ name: input.name, club: input.club, city: input.city })
      .select("id")
      .single();
    if (error) return { error: error.message };
    id = data.id;
  } else {
    const { error } = await supabase.from("courses").update({ name: input.name, club: input.club, city: input.city }).eq("id", id);
    if (error) return { error: error.message };
    // Cerrar la versión vigente el día anterior a la nueva.
    const { data: open } = await supabase
      .from("course_versions")
      .select("id, valid_from")
      .eq("course_id", id)
      .is("valid_to", null)
      .is("deleted_at", null);
    for (const v of open ?? []) {
      if (v.valid_from >= input.validFrom) return { error: "La versión vigente empieza en o después de la fecha elegida" };
      const { error } = await supabase.from("course_versions").update({ valid_to: input.validFrom }).eq("id", v.id);
      if (error) return { error: error.message };
    }
  }

  const { data: version, error: vErr } = await supabase
    .from("course_versions")
    .insert({ course_id: id, holes_count: input.holesCount, valid_from: input.validFrom })
    .select("id")
    .single();
  if (vErr) return { error: vErr.message };

  const { data: holes, error: hErr } = await supabase
    .from("holes")
    .insert(
      input.holes.map((h) => ({
        course_version_id: version.id,
        number: h.number,
        par: h.par,
        stroke_index: h.strokeIndex,
      })),
    )
    .select("id, number");
  if (hErr) return { error: hErr.message };
  const holeIdByNumber = new Map(holes.map((h) => [h.number, h.id]));

  for (const t of input.tees) {
    const { data: tee, error: tErr } = await supabase
      .from("tee_sets")
      .insert({ course_version_id: version.id, name: t.name, course_rating: t.courseRating, slope: t.slope })
      .select("id")
      .single();
    if (tErr) return { error: tErr.message };
    const rows = Object.entries(t.distances)
      .filter(([n]) => holeIdByNumber.has(Number(n)))
      .map(([n, meters]) => ({
        course_version_id: version.id,
        tee_set_id: tee.id,
        hole_id: holeIdByNumber.get(Number(n))!,
        meters,
      }));
    if (rows.length) {
      const { error: dErr } = await supabase.from("tee_hole_distances").insert(rows);
      if (dErr) return { error: dErr.message };
    }
  }

  revalidatePath("/canchas");
  revalidatePath(`/canchas/${id}`);
  return { courseId: id };
}

export async function saveCourseAndRedirect(courseId: string | null, raw: unknown) {
  const result = await saveCourse(courseId, raw);
  if (result.error) return result;
  redirect(`/canchas/${result.courseId}`);
}
