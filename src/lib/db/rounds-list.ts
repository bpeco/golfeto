import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { RoundRowData } from "@/components/ui/round-row";

export type PendingCard = { roundId: string; courseName: string; playedOn: string; dateApproximate: boolean; holes: number };

/**
 * Partidas visibles para el golfista (las de sus grupos y las suyas), más nuevas primero,
 * con cada jugador y su gross firmado. `pending`: la tarjeta propia más reciente sin firmar.
 */
export const listRecentRounds = cache(async (meId: string, limit = 5): Promise<{ rounds: RoundRowData[]; pending: PendingCard | null }> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rounds")
    .select(
      "id, played_on, date_approximate, course_version:course_versions!rounds_course_version_id_fkey(course:courses!inner(name)), scorecards(player_id, signed_at, is_legacy, legacy_gross, player:players!scorecards_player_id_fkey(display_name, user_id), signature:scorecard_signatures!scorecards_current_signature_fk(gross), hole_scores(count))",
    )
    .is("deleted_at", null)
    .order("played_on", { ascending: false })
    .limit(limit);

  let pending: PendingCard | null = null;
  const rounds: RoundRowData[] = (data ?? []).map((r) => {
    const cards = r.scorecards
      .map((s) => ({
        playerId: s.player_id,
        name: s.player?.display_name ?? "?",
        gross: s.signature?.gross ?? (s.is_legacy ? s.legacy_gross : null),
        signed: !!s.signed_at,
        guest: !s.player?.user_id,
      }))
      .sort((a, b) => (a.playerId === meId ? -1 : b.playerId === meId ? 1 : a.name.localeCompare(b.name)));
    const mine = r.scorecards.find((s) => s.player_id === meId);
    if (!pending && mine && !mine.signed_at && !mine.is_legacy) {
      pending = {
        roundId: r.id,
        courseName: r.course_version.course.name,
        playedOn: r.played_on,
        dateApproximate: r.date_approximate,
        holes: mine.hole_scores[0]?.count ?? 0,
      };
    }
    return { id: r.id, courseName: r.course_version.course.name, playedOn: r.played_on, dateApproximate: r.date_approximate, cards };
  });
  return { rounds, pending };
});
