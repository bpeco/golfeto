import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type HolesPlayed = Database["public"]["Enums"]["round_holes"];

export type RoundHole = { id: string; number: number; par: number; strokeIndex: number | null; meters: number | null };

export type RoundScorecard = {
  id: string;
  playerId: string;
  playerName: string;
  isGuest: boolean;
  isLegacy: boolean;
  legacyGross: number | null;
  signedAt: string | null;
  signature: { courseHandicap: number; gross: number; adjustedGross: number; differential: number; handicapIndex: number | null } | null;
  /** Por posición (1..18). */
  scores: Record<number, { strokes: number | null; pickedUp: boolean }>;
};

export type RoundDetail = {
  id: string;
  playedOn: string;
  dateApproximate: boolean;
  holesPlayed: HolesPlayed;
  loops: number;
  createdBy: string;
  notes: string | null;
  course: { id: string; name: string; club: string | null; holesCount: number; versionId: string };
  tee: { id: string; name: string; courseRating: number | null; slope: number | null };
  holes: RoundHole[];
  /** Hoyos en el orden en que se jugaron (posición 1..N). */
  positions: { position: number; hole: RoundHole }[];
  scorecards: RoundScorecard[];
  photos: { id: string; storagePath: string; createdAt: string }[];
};

/** Hoyos en orden de juego: ida/vuelta, o dos vueltas de una cancha de 9. */
export function positionsFor(holes: RoundHole[], holesPlayed: HolesPlayed, loops: number) {
  const sorted = [...holes].sort((a, b) => a.number - b.number);
  let seq: RoundHole[];
  if (holesPlayed === "ida") seq = sorted.filter((h) => h.number <= 9);
  else if (holesPlayed === "vuelta") seq = sorted.filter((h) => h.number > 9);
  else seq = loops === 2 ? [...sorted, ...sorted] : sorted;
  return seq.map((hole, i) => ({ position: i + 1, hole }));
}

export async function getRound(roundId: string): Promise<RoundDetail | null> {
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("rounds")
    .select(
      `id, played_on, date_approximate, holes_played, loops, created_by, notes,
       course_version:course_versions!rounds_course_version_id_fkey(id, holes_count, course:courses!inner(id, name, club), holes(id, number, par, stroke_index)),
       tee:tee_sets!rounds_tee_set_id_course_version_id_fkey(id, name, course_rating, slope, distances:tee_hole_distances!tee_hole_distances_tee_set_id_course_version_id_fkey(hole_id, meters)),
       scorecards(id, player_id, is_legacy, legacy_gross, signed_at,
         player:players!scorecards_player_id_fkey(display_name, user_id),
         hole_scores(position, strokes, picked_up),
         signature:scorecard_signatures!scorecards_current_signature_fk(course_handicap, gross, adjusted_gross, differential, handicap_index)),
       photos:round_photos(id, storage_path, created_at)`,
    )
    .eq("id", roundId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!r) return null;

  const meters = new Map(r.tee.distances.map((d) => [d.hole_id, d.meters]));
  const holes: RoundHole[] = r.course_version.holes.map((h) => ({
    id: h.id,
    number: h.number,
    par: h.par,
    strokeIndex: h.stroke_index,
    meters: meters.get(h.id) ?? null,
  }));

  return {
    id: r.id,
    playedOn: r.played_on,
    dateApproximate: r.date_approximate,
    holesPlayed: r.holes_played,
    loops: r.loops,
    createdBy: r.created_by,
    notes: r.notes,
    course: {
      id: r.course_version.course.id,
      name: r.course_version.course.name,
      club: r.course_version.course.club,
      holesCount: r.course_version.holes_count,
      versionId: r.course_version.id,
    },
    tee: {
      id: r.tee.id,
      name: r.tee.name,
      courseRating: r.tee.course_rating == null ? null : Number(r.tee.course_rating),
      slope: r.tee.slope,
    },
    holes,
    positions: positionsFor(holes, r.holes_played, r.loops),
    scorecards: r.scorecards
      .map((s) => ({
        id: s.id,
        playerId: s.player_id,
        playerName: s.player?.display_name ?? "?",
        isGuest: !s.player?.user_id,
        isLegacy: s.is_legacy,
        legacyGross: s.legacy_gross,
        signedAt: s.signed_at,
        signature:
          s.signature && s.signature.course_handicap != null
            ? {
                courseHandicap: s.signature.course_handicap,
                gross: s.signature.gross!,
                adjustedGross: s.signature.adjusted_gross!,
                differential: Number(s.signature.differential),
                handicapIndex: s.signature.handicap_index == null ? null : Number(s.signature.handicap_index),
              }
            : null,
        scores: Object.fromEntries(s.hole_scores.map((hs) => [hs.position, { strokes: hs.strokes, pickedUp: hs.picked_up }])),
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName)),
    photos: r.photos.map((p) => ({ id: p.id, storagePath: p.storage_path, createdAt: p.created_at })),
  };
}

/** Rating y par efectivos para lo que se jugó (WHS: 9 hoyos usan rating de 9; dos vueltas duplican). */
export function effectiveTeeRating(round: Pick<RoundDetail, "holesPlayed" | "loops" | "course" | "tee" | "holes">) {
  const cr = round.tee.courseRating;
  const slope = round.tee.slope;
  if (cr == null || slope == null) return null;
  const parAll = round.holes.reduce((s, h) => s + h.par, 0);
  if (round.course.holesCount === 9) {
    // El tee de una cancha de 9 guarda rating de 9 hoyos.
    return round.loops === 2
      ? { courseRating: cr * 2, slope, par: parAll * 2, holesInRound: 18 as const }
      : { courseRating: cr, slope, par: parAll, holesInRound: 9 as const };
  }
  if (round.holesPlayed === "completa") return { courseRating: cr, slope, par: parAll, holesInRound: 18 as const };
  // Ida o vuelta en cancha de 18: sin rating oficial de 9, se aproxima con la mitad del CR.
  const half = round.holes.filter((h) => (round.holesPlayed === "ida" ? h.number <= 9 : h.number > 9));
  return { courseRating: cr / 2, slope, par: half.reduce((s, h) => s + h.par, 0), holesInRound: 9 as const };
}
