"use server";

import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap, type PlayerHandicap } from "@/lib/db/handicap";
import { effectiveTeeRating, getRound } from "@/lib/db/rounds";
import { fail, friendlyDbError, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { todayInArgentina } from "@/lib/dates";
import { flash } from "@/lib/flash";
import {
  adjustedGrossScore,
  courseHandicap,
  courseHandicap9,
  differentialFrom9Holes,
  minimumHolesToSign,
  scoreDifferential,
} from "@/lib/handicap/course";
import { roundInputSchema, teeRatingSchema } from "./schema";

export async function createRound(raw: unknown): Promise<ActionResult<{ roundId: string }>> {
  const parsed = roundInputSchema.safeParse(raw);
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;
  if (input.playerIds.length + input.guests.length === 0) return fail("Elegí al menos un jugador", { players: "Elegí al menos un jugador" });
  const me = await requirePlayer();
  const supabase = await createClient();

  const { data: format } = await supabase.from("round_formats").select("id").eq("code", "medal").single();
  if (!format) return fail("Falta el formato medal en la base. Avisale al dueño del proyecto.");

  // Invitados nuevos: se crean como golfistas sin cuenta.
  const guestIds: string[] = [];
  for (const g of input.guests) {
    const { data, error } = await supabase.from("players").insert({ display_name: g.name }).select("id").single();
    if (error) return fail(friendlyDbError(error));
    guestIds.push(data.id);
    if (g.declaredHandicap != null) {
      const { error: hErr } = await supabase
        .from("player_declared_handicaps")
        .insert({ player_id: data.id, value: g.declaredHandicap, valid_from: todayInArgentina() });
      if (hErr) return fail(friendlyDbError(hErr));
    }
  }

  const playerIds = Array.from(new Set([...input.playerIds, ...guestIds]));

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
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (rErr) return fail(friendlyDbError(rErr));

  const { error: sErr } = await supabase.from("scorecards").insert(playerIds.map((player_id) => ({ round_id: round.id, player_id })));
  if (sErr) return fail(friendlyDbError(sErr));

  revalidatePath("/");
  revalidatePath("/partidas");
  return ok({ roundId: round.id });
}

export async function createRoundAndRedirect(raw: unknown): Promise<ActionResult<{ roundId: string }>> {
  const r = await createRound(raw);
  if (!r.ok) return r;
  await flash("Partida creada. A anotar.");
  redirect(`/partidas/${r.data.roundId}`, RedirectType.replace);
}

export async function saveHoleScore(input: {
  scorecardId: string;
  holeId: string;
  position: number;
  strokes: number | null;
  pickedUp: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("hole_scores")
    .select("id")
    .eq("scorecard_id", input.scorecardId)
    .eq("position", input.position)
    .is("deleted_at", null)
    .maybeSingle();
  if (readErr) return fail(friendlyDbError(readErr));

  const empty = input.strokes == null && !input.pickedUp;
  if (existing) {
    const { error } = empty
      ? await supabase.from("hole_scores").delete().eq("id", existing.id)
      : await supabase.from("hole_scores").update({ strokes: input.strokes, picked_up: input.pickedUp }).eq("id", existing.id);
    if (error) return fail(friendlyDbError(error));
  } else if (!empty) {
    const { error } = await supabase.from("hole_scores").insert({
      scorecard_id: input.scorecardId,
      hole_id: input.holeId,
      position: input.position,
      strokes: input.strokes,
      picked_up: input.pickedUp,
    });
    if (error) return fail(friendlyDbError(error));
  }
  return ok();
}

/**
 * Carga CR y Slope en el tee de la partida cuando no los tiene. No crea una versión nueva de la
 * cancha (eso dejaría a la partida en el tee viejo, todavía sin rating): completa el mismo tee.
 * Solo si falta: un tee con rating no se toca desde acá (puede tener tarjetas firmadas).
 */
export async function setRoundTeeRating(roundId: string, raw: unknown): Promise<ActionResult> {
  const parsed = teeRatingSchema.safeParse(raw);
  if (!parsed.success) return fromZod(parsed.error);
  await requirePlayer();
  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida.");
  if (round.tee.courseRating != null && round.tee.slope != null) return fail(`Las ${round.tee.name} ya tienen CR y Slope.`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("tee_sets")
    .update({ course_rating: parsed.data.courseRating, slope: parsed.data.slope })
    .eq("id", round.tee.id);
  if (error) return fail(friendlyDbError(error));
  revalidatePath(`/partidas/${roundId}`);
  revalidatePath(`/canchas/${round.course.id}`);
  return ok();
}

export type SignSummary = {
  gross: number;
  adjustedGross: number;
  courseHandicap: number;
  differential: number;
  indexBefore: number | null;
  sourceBefore: PlayerHandicap["source"];
  indexAfter: number | null;
  sourceAfter: PlayerHandicap["source"];
  signedCount: number;
};

/**
 * Firma: calcula hándicap de cancha, score ajustado y diferencial con el motor WHS
 * y los congela en la firma (RPC sign_scorecard). Solo el dueño puede firmar (la DB lo exige).
 * Devuelve el índice antes y después para mostrarlo en el momento.
 */
export async function signScorecard(roundId: string, scorecardId: string): Promise<ActionResult<SignSummary>> {
  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida. Puede haber sido dada de baja.");
  const card = round.scorecards.find((s) => s.id === scorecardId);
  if (!card) return fail("No encontramos la tarjeta.");

  const rating = effectiveTeeRating(round);
  if (!rating) return fail("El tee no tiene Course Rating y Slope: cargalos en la cancha para poder firmar.");

  const before = await getPlayerHandicap(card.playerId);
  const index = before.effective;
  const source = before.source === "calculado" ? "index" : before.source === "declarado" ? "declarado" : "ninguno";
  const usedIndex = index ?? 0;
  const ch = rating.holesInRound === 9 ? courseHandicap9(usedIndex, rating) : courseHandicap(usedIndex, rating);

  let adjustedGross: number;
  let gross: number;
  if (card.isLegacy) {
    if (card.legacyGross == null) return fail("La tarjeta histórica no tiene total.");
    adjustedGross = card.legacyGross;
    gross = card.legacyGross;
  } else {
    const results = round.positions.map(({ position, hole }) => {
      const sc = card.scores[position];
      return {
        hole: { number: hole.number, par: hole.par, strokeIndex: hole.strokeIndex ?? 18 },
        strokes: sc?.strokes ?? null,
        pickedUp: sc?.pickedUp ?? false,
      };
    });
    const ags = adjustedGrossScore(results, ch, rating.holesInRound);
    if (!ags.acceptable) {
      return fail(`Faltan hoyos: hay ${ags.holesPlayed} cargados y se necesitan al menos ${minimumHolesToSign(rating.holesInRound)}.`);
    }
    adjustedGross = ags.adjustedGross;
    gross = ags.gross;
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
  if (error) return fail(friendlyDbError(error));

  const after = await snapshotIndex(card.playerId);
  revalidatePath(`/partidas/${roundId}`);
  revalidatePath("/");
  return ok({
    gross,
    adjustedGross,
    courseHandicap: ch,
    differential,
    indexBefore: before.effective,
    sourceBefore: before.source,
    indexAfter: after.effective,
    sourceAfter: after.source,
    signedCount: after.signedCount,
  });
}

export async function unsignScorecard(
  roundId: string,
  scorecardId: string,
  reason?: string,
): Promise<ActionResult<{ indexAfter: number | null; sourceAfter: PlayerHandicap["source"] }>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unsign_scorecard", { p_scorecard_id: scorecardId, p_reason: reason?.trim() || undefined });
  if (error) return fail(friendlyDbError(error));
  const { data: card } = await supabase.from("scorecards").select("player_id").eq("id", scorecardId).single();
  const after = card ? await snapshotIndex(card.player_id) : null;
  revalidatePath(`/partidas/${roundId}`);
  revalidatePath("/");
  return ok({ indexAfter: after?.effective ?? null, sourceAfter: after?.source ?? null });
}

/** Recalcula el hándicap y guarda el Index como evento (serie para el gráfico). */
async function snapshotIndex(playerId: string): Promise<PlayerHandicap> {
  const h = await getPlayerHandicap(playerId);
  if (h.computed != null) {
    const supabase = await createClient();
    await supabase.from("handicap_index_snapshots").insert({
      player_id: playerId,
      value: h.computed,
      counted_scorecards: Math.min(20, h.signedCount),
    });
  }
  return h;
}

export async function deleteRound(roundId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("rounds").delete().eq("id", roundId);
  if (error) return fail(friendlyDbError(error));
  revalidatePath("/");
  revalidatePath("/partidas");
  await flash("Partida dada de baja.", "info");
  redirect("/partidas", RedirectType.replace);
}
