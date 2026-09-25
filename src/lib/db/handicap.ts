import { createClient } from "@/lib/supabase/server";
import { effectiveIndex, handicapHistory, type IndexPoint } from "@/lib/handicap/index-calc";

export type PlayerHandicap = {
  playerId: string;
  /** Index calculado por la app (null con menos de 3 tarjetas firmadas). */
  computed: number | null;
  declared: number | null;
  effective: number | null;
  source: "calculado" | "declarado" | null;
  signedCount: number;
  history: IndexPoint[];
};

/**
 * Hándicap vigente de un golfista: recorre sus tarjetas firmadas (snapshot de la
 * firma vigente) en orden cronológico y aplica el WHS. La verdad está en las firmas;
 * esto se recalcula en cada lectura, es barato (≤ decenas de filas por golfista).
 */
export async function getPlayerHandicap(playerId: string): Promise<PlayerHandicap> {
  const supabase = await createClient();

  const [{ data: cards }, { data: declaredRows }] = await Promise.all([
    supabase
      .from("scorecards")
      .select("id, signed_at, round:rounds!inner(played_on), signature:scorecard_signatures!scorecards_current_signature_fk(differential)")
      .eq("player_id", playerId)
      .not("signed_at", "is", null),
    supabase
      .from("player_declared_handicaps")
      .select("value, valid_from")
      .eq("player_id", playerId)
      .order("valid_from", { ascending: false })
      .limit(1),
  ]);

  const scores = (cards ?? [])
    .filter((c) => c.signature?.differential != null)
    .map((c) => ({
      id: c.id,
      playedOn: c.round.played_on,
      differential: Number(c.signature!.differential),
    }));

  const history = handicapHistory(scores);
  const computed = history.at(-1)?.handicapIndex ?? null;
  const declared = declaredRows?.[0]?.value != null ? Number(declaredRows[0].value) : null;
  const eff = effectiveIndex(computed, declared);

  return {
    playerId,
    computed,
    declared,
    effective: eff.value,
    source: eff.source,
    signedCount: scores.length,
    history,
  };
}

export async function getHandicapsFor(playerIds: string[]): Promise<Map<string, PlayerHandicap>> {
  const entries = await Promise.all(playerIds.map(async (id) => [id, await getPlayerHandicap(id)] as const));
  return new Map(entries);
}
