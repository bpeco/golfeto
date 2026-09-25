"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { courseInputSchema } from "./schema";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyDbError, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { flash } from "@/lib/flash";

/**
 * Crea la cancha (si `courseId` es null) o una versión nueva de una existente
 * (cierra la vigente en `validFrom`). ADR-0001: la historia no se toca.
 */
export async function saveCourse(courseId: string | null, raw: unknown): Promise<ActionResult<{ courseId: string }>> {
  const parsed = courseInputSchema.safeParse(raw);
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  let id: string;

  if (!courseId) {
    const { data, error } = await supabase
      .from("courses")
      .insert({ name: input.name, club: input.club, city: input.city })
      .select("id")
      .single();
    if (error) return fail(friendlyDbError(error));
    id = data.id;
  } else {
    id = courseId;
    const { error } = await supabase.from("courses").update({ name: input.name, club: input.club, city: input.city }).eq("id", id);
    if (error) return fail(friendlyDbError(error));
    // Cerrar la versión vigente el día anterior a la nueva.
    const { data: open } = await supabase
      .from("course_versions")
      .select("id, valid_from")
      .eq("course_id", id)
      .is("valid_to", null)
      .is("deleted_at", null);
    for (const v of open ?? []) {
      if (v.valid_from >= input.validFrom) return fail("La versión vigente empieza en o después de la fecha elegida: elegí una fecha posterior.", { validFrom: "Tiene que ser posterior a la versión vigente" });
      const { error } = await supabase.from("course_versions").update({ valid_to: input.validFrom }).eq("id", v.id);
      if (error) return fail(friendlyDbError(error));
    }
  }

  const { data: version, error: vErr } = await supabase
    .from("course_versions")
    .insert({ course_id: id, holes_count: input.holesCount, valid_from: input.validFrom })
    .select("id")
    .single();
  if (vErr) return fail(friendlyDbError(vErr));

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
  if (hErr) return fail(friendlyDbError(hErr));
  const holeIdByNumber = new Map(holes.map((h) => [h.number, h.id]));

  for (const t of input.tees) {
    const { data: tee, error: tErr } = await supabase
      .from("tee_sets")
      .insert({ course_version_id: version.id, name: t.name, course_rating: t.courseRating, slope: t.slope })
      .select("id")
      .single();
    if (tErr) return fail(friendlyDbError(tErr));
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
      if (dErr) return fail(friendlyDbError(dErr));
    }
  }

  revalidatePath("/canchas");
  revalidatePath(`/canchas/${id}`);
  return ok({ courseId: id });
}

export async function saveCourseAndRedirect(courseId: string | null, raw: unknown): Promise<ActionResult<{ courseId: string }>> {
  const result = await saveCourse(courseId, raw);
  if (!result.ok) return result;
  await flash(courseId ? "Guardamos la versión nueva de la cancha." : "Cancha creada.");
  redirect(`/canchas/${result.data.courseId}`);
}
