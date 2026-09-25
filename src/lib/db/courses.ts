import { createClient } from "@/lib/supabase/server";

export type CourseSummary = {
  id: string;
  name: string;
  club: string | null;
  city: string | null;
  version: { id: string; holesCount: number; validFrom: string } | null;
  tees: { id: string; name: string; courseRating: number | null; slope: number | null }[];
};

/** Canchas activas con su versión vigente hoy y los tees de esa versión. */
export async function listCourses(): Promise<CourseSummary[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("courses")
    .select("id, name, club, city, versions:course_versions(id, holes_count, valid_from, valid_to, tees:tee_sets(id, name, course_rating, slope))")
    .is("deleted_at", null)
    .order("name");

  return (data ?? []).map((c) => {
    const current =
      c.versions.find((v) => v.valid_from <= today && (v.valid_to == null || v.valid_to > today)) ??
      c.versions.sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0] ??
      null;
    return {
      id: c.id,
      name: c.name,
      club: c.club,
      city: c.city,
      version: current ? { id: current.id, holesCount: current.holes_count, validFrom: current.valid_from } : null,
      tees: (current?.tees ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        courseRating: t.course_rating == null ? null : Number(t.course_rating),
        slope: t.slope,
      })),
    };
  });
}

export type CourseDetail = {
  id: string;
  name: string;
  club: string | null;
  city: string | null;
  version: {
    id: string;
    holesCount: number;
    validFrom: string;
    validTo: string | null;
    holes: { id: string; number: number; par: number; strokeIndex: number | null; dogleg: string | null }[];
    tees: {
      id: string;
      name: string;
      courseRating: number | null;
      slope: number | null;
      distances: Record<string, number>;
    }[];
  } | null;
  versionCount: number;
};

/** Cancha con la versión vigente en `asOf` (hoy por defecto), hoyos, tees y distancias. */
export async function getCourse(courseId: string, asOf?: string): Promise<CourseDetail | null> {
  const supabase = await createClient();
  const date = asOf ?? new Date().toISOString().slice(0, 10);
  const { data: c } = await supabase
    .from("courses")
    .select(
      "id, name, club, city, versions:course_versions(id, holes_count, valid_from, valid_to, holes(id, number, par, stroke_index, dogleg), tees:tee_sets(id, name, course_rating, slope, distances:tee_hole_distances!tee_hole_distances_tee_set_id_course_version_id_fkey(hole_id, meters)))",
    )
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!c) return null;

  const versions = c.versions.sort((a, b) => b.valid_from.localeCompare(a.valid_from));
  const v = versions.find((x) => x.valid_from <= date && (x.valid_to == null || x.valid_to > date)) ?? versions[0] ?? null;

  return {
    id: c.id,
    name: c.name,
    club: c.club,
    city: c.city,
    versionCount: versions.length,
    version: v
      ? {
          id: v.id,
          holesCount: v.holes_count,
          validFrom: v.valid_from,
          validTo: v.valid_to,
          holes: v.holes
            .map((h) => ({ id: h.id, number: h.number, par: h.par, strokeIndex: h.stroke_index, dogleg: h.dogleg }))
            .sort((a, b) => a.number - b.number),
          tees: v.tees.map((t) => ({
            id: t.id,
            name: t.name,
            courseRating: t.course_rating == null ? null : Number(t.course_rating),
            slope: t.slope,
            distances: Object.fromEntries(t.distances.map((d) => [d.hole_id, d.meters])),
          })),
        }
      : null,
  };
}
