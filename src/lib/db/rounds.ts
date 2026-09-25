import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { positionsFor, type RoundDetail, type RoundHole } from "@/lib/round-model";

export { effectiveTeeRating, positionsFor } from "@/lib/round-model";
export type { HolesPlayed, RoundDetail, RoundHole, RoundScorecard } from "@/lib/round-model";

/** Cacheada por request: la página y su generateMetadata comparten la lectura. */
export const getRound = cache(async (roundId: string): Promise<RoundDetail | null> => {
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
});
