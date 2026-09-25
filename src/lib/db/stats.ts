import { createClient } from "@/lib/supabase/server";
import { getPlayerHandicap, type PlayerHandicap } from "./handicap";

export type SignedCard = {
  scorecardId: string;
  roundId: string;
  playedOn: string;
  dateApproximate: boolean;
  courseName: string;
  gross: number;
  par: number;
  differential: number;
  courseHandicap: number;
  isLegacy: boolean;
};

export type PlayerStats = {
  playerId: string;
  name: string;
  handicap: PlayerHandicap;
  cards: SignedCard[];
  avgGross: number | null;
  bestGross: number | null;
  avgToPar: number | null;
  last5AvgGross: number | null;
};

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const supabase = await createClient();
  const [{ data: player }, { data: cards }, handicap] = await Promise.all([
    supabase.from("players").select("id, display_name").eq("id", playerId).maybeSingle(),
    supabase
      .from("scorecards")
      .select(
        "id, round_id, is_legacy, round:rounds!scorecards_round_id_fkey!inner(played_on, date_approximate, course_version:course_versions!rounds_course_version_id_fkey(course:courses!inner(name))), signature:scorecard_signatures!scorecards_current_signature_fk(gross, par, differential, course_handicap)",
      )
      .eq("player_id", playerId)
      .not("signed_at", "is", null),
    getPlayerHandicap(playerId),
  ]);
  if (!player) return null;

  const signed: SignedCard[] = (cards ?? [])
    .filter((c) => c.signature?.gross != null)
    .map((c) => ({
      scorecardId: c.id,
      roundId: c.round_id,
      playedOn: c.round.played_on,
      dateApproximate: c.round.date_approximate,
      courseName: c.round.course_version.course.name,
      gross: c.signature!.gross!,
      par: c.signature!.par ?? 0,
      differential: Number(c.signature!.differential),
      courseHandicap: c.signature!.course_handicap ?? 0,
      isLegacy: c.is_legacy,
    }))
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.scorecardId.localeCompare(a.scorecardId));

  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

  return {
    playerId,
    name: player.display_name,
    handicap,
    cards: signed,
    avgGross: avg(signed.map((c) => c.gross)),
    bestGross: signed.length ? Math.min(...signed.map((c) => c.gross)) : null,
    avgToPar: avg(signed.map((c) => c.gross - c.par)),
    last5AvgGross: avg(signed.slice(0, 5).map((c) => c.gross)),
  };
}

export type HeadToHead = {
  otherId: string;
  otherName: string;
  sharedRounds: { roundId: string; playedOn: string; courseName: string; mine: number; theirs: number }[];
  wins: number;
  losses: number;
  ties: number;
};

/** Partidas jugadas juntos (ambas tarjetas firmadas) y quién hizo menos golpes en cada una. */
export function headToHead(me: PlayerStats, other: PlayerStats): HeadToHead {
  const theirs = new Map(other.cards.map((c) => [c.roundId, c]));
  const shared = me.cards
    .filter((c) => theirs.has(c.roundId))
    .map((c) => ({
      roundId: c.roundId,
      playedOn: c.playedOn,
      courseName: c.courseName,
      mine: c.gross,
      theirs: theirs.get(c.roundId)!.gross,
    }));
  return {
    otherId: other.playerId,
    otherName: other.name,
    sharedRounds: shared,
    wins: shared.filter((r) => r.mine < r.theirs).length,
    losses: shared.filter((r) => r.mine > r.theirs).length,
    ties: shared.filter((r) => r.mine === r.theirs).length,
  };
}
