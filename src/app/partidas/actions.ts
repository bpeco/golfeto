"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap } from "@/lib/db/handicap";
import { effectiveTeeRating, getRound } from "@/lib/db/rounds";
import {
  adjustedGrossScore,
  courseHandicap,
  courseHandicap9,
  differentialFrom9Holes,
  scoreDifferential,
} from "@/lib/handicap/course";
import { roundInputSchema } from "./schema";

export async function createRound(raw: unknown): Promise<{ error?: string; roundId?: string }> {
  const parsed = roundInputSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const input = parsed.data;
  const me = await requirePlayer();
  const supabase = await createClient();

  const { data: format } = await supabase.from("round_formats").select("id").eq("code", "medal").single();
  if (!format) return { error: "Falta el formato medal" };

  // Invitados nuevos: se crean como golfistas sin cuenta.
  const guestIds: string[] = [];
  for (const g of input.guests) {
    const { data, error } = await supabase.from("players").insert({ display_name: g.name }).select("id").single();
    if (error) return { error: error.message };
    guestIds.push(data.id);
    if (g.declaredHandicap != null) {
      await supabase.from("player_declared_handicaps").insert({ player_id: data.id, value: g.declaredHandicap });
    }
  }

  const playerIds = Array.from(new Set([...input.playerIds, ...guestIds]));
  if (playerIds.length === 0) return { error: "Elegí al menos un jugador" };

  const { data: round, error: rErr } = await supabase
    .from("rounds")
    .insert({
      course_version_id: input.courseVersionId,
      tee_set_id: input.teeSetId,
      format_id: format.id,
      played_on: input.playedOn,
      holes_played: input.holesPlayed,
      loops: input.loops,
      created_by: me.id,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (rErr) return { error: rErr.message };

  const { error: sErr } = await supabase
    .from("scorecards")
    .insert(playerIds.map((player_id) => ({ round_id: round.id, player_id })));
  if (sErr) return { error: sErr.message };

  revalidatePath("/");
  revalidatePath("/partidas");
  return { roundId: round.id };
}

export async function createRoundAndRedirect(raw: unknown) {
  const r = await createRound(raw);
  if (r.error) return r;
  redirect(`/partidas/${r.roundId}`);
}

export async function saveHoleScore(input: {
  scorecardId: string;
  holeId: string;
  position: number;
  strokes: number | null;
  pickedUp: boolean;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("hole_scores")
    .select("id")
    .eq("scorecard_id", input.scorecardId)
    .eq("position", input.position)
    .is("deleted_at", null)
    .maybeSingle();

  const empty = input.strokes == null && !input.pickedUp;
  if (existing) {
    const { error } = empty
      ? await supabase.from("hole_scores").delete().eq("id", existing.id)
      : await supabase.from("hole_scores").update({ strokes: input.strokes, picked_up: input.pickedUp }).eq("id", existing.id);
    if (error) return { error: error.message };
  } else if (!empty) {
    const { error } = await supabase.from("hole_scores").insert({
      scorecard_id: input.scorecardId,
      hole_id: input.holeId,
      position: input.position,
      strokes: input.strokes,
      picked_up: input.pickedUp,
    });
    if (error) return { error: error.message };
  }
  return {};
}

/**
 * Firma: calcula hándicap de cancha, score ajustado y diferencial con el motor WHS
 * y los congela en la firma (RPC sign_scorecard). Solo el dueño puede firmar (la DB lo exige).
 */
export async function signScorecard(roundId: string, scorecardId: string): Promise<{ error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { error: "Partida inexistente" };
  const card = round.scorecards.find((s) => s.id === scorecardId);
  if (!card) return { error: "Tarjeta inexistente" };

  const rating = effectiveTeeRating(round);
  if (!rating) return { error: "El tee no tiene Course Rating y Slope; cargalos en la cancha para poder firmar." };

  const hcp = await getPlayerHandicap(card.playerId);
  const index = hcp.effective;
  const source = hcp.source === "calculado" ? "index" : hcp.source === "declarado" ? "declarado" : "ninguno";
  const usedIndex = index ?? 0;
  const ch = rating.holesInRound === 9 ? courseHandicap9(usedIndex, rating) : courseHandicap(usedIndex, rating);

  let adjustedGross: number;
  if (card.isLegacy) {
    if (card.legacyGross == null) return { error: "La tarjeta histórica no tiene total" };
    adjustedGross = card.legacyGross;
  } else {
    const results = round.positions.map(({ position, hole }) => {
      const sc = card.scores[position];
      return {
        hole: { number: hole.number, par: hole.par, strokeIndex: hole.strokeIndex ?? 18 },
        strokes: sc?.strokes ?? null,
        pickedUp: sc?.pickedUp ?? false,
      };
    });
    // Sin ningún índice (ni calculado ni declarado) no hay net double bogey: el tope es par + 5.
    const ags = adjustedGrossScore(results, index == null ? null : ch, rating.holesInRound);
    if (!ags.acceptable) {
      return { error: `Faltan hoyos: hay ${ags.holesPlayed} cargados y se necesitan al menos ${rating.holesInRound === 18 ? 10 : 9}.` };
    }
    adjustedGross = ags.adjustedGross;
  }

  let differential = scoreDifferential(adjustedGross, rating);
  if (rating.holesInRound === 9) differential = differentialFrom9Holes(differential, index);

  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_scorecard", {
    p_scorecard_id: scorecardId,
    p_handicap_source: source,
    // La firma guarda null cuando no había ningún índice; el tipo generado no admite null.
    p_handicap_index: (index ?? null) as unknown as number,
    p_course_handicap: ch,
    p_adjusted_gross: adjustedGross,
    p_differential: differential,
  });
  if (error) return { error: error.message };

  await snapshotIndex(card.playerId);
  revalidatePath(`/partidas/${roundId}`);
  revalidatePath("/");
  return {};
}

export async function unsignScorecard(roundId: string, scorecardId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unsign_scorecard", { p_scorecard_id: scorecardId });
  if (error) return { error: error.message };
  const { data: card } = await supabase.from("scorecards").select("player_id").eq("id", scorecardId).single();
  if (card) await snapshotIndex(card.player_id);
  revalidatePath(`/partidas/${roundId}`);
  revalidatePath("/");
  return {};
}

/** Guarda el Index recalculado como evento (serie para el gráfico). */
async function snapshotIndex(playerId: string) {
  const h = await getPlayerHandicap(playerId);
  if (h.computed == null) return;
  const supabase = await createClient();
  await supabase.from("handicap_index_snapshots").insert({
    player_id: playerId,
    value: h.computed,
    counted_scorecards: Math.min(20, h.signedCount),
  });
}

export async function deleteRound(roundId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("rounds").delete().eq("id", roundId);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/partidas");
  redirect("/partidas");
}
