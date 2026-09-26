"use server";

import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap, type PlayerHandicap } from "@/lib/db/handicap";
import { effectiveTeeRating, getRound, positionsFor } from "@/lib/db/rounds";
import { layoutForCourseChange } from "@/lib/round-model";
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
import { courseChangeSchema, roundInputSchema, teeRatingSchema } from "./schema";

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

/**
 * Pasa la partida a otra cancha y tee (se cargó en la equivocada). Conserva cuántos hoyos se jugaron
 * y los golpes por posición: el golpe del 5.º hoyo jugado queda en el 5.º hoyo de la cancha nueva.
 * Solo sin tarjetas firmadas: la firma congeló el cálculo con la cancha vieja (la base también lo exige).
 */
export async function changeRoundCourse(roundId: string, raw: unknown): Promise<ActionResult<{ courseName: string }>> {
  const parsed = courseChangeSchema.safeParse(raw);
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;
  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida. Puede haber sido dada de baja.");
  const signed = round.scorecards.filter((s) => s.signedAt);
  if (signed.length) {
    return fail(`Hay tarjetas firmadas (${signed.map((s) => s.playerName).join(", ")}). Para cambiar la cancha, primero hay que desfirmarlas.`);
  }

  const supabase = await createClient();
  const { data: version, error } = await supabase
    .from("course_versions")
    .select("id, holes_count, valid_from, valid_to, course:courses!inner(name), holes(id, number, par, stroke_index), tees:tee_sets(id)")
    .eq("id", input.courseVersionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return fail(friendlyDbError(error));
  if (!version) return fail("No encontramos esa cancha.", { courseVersionId: "Elegí otra cancha" });
  if (version.valid_from > round.playedOn || (version.valid_to != null && version.valid_to <= round.playedOn)) {
    return fail("Esa cancha no tenía esa versión el día de la partida.", { courseVersionId: "Elegí otra cancha" });
  }
  if (!version.tees.some((t) => t.id === input.teeSetId)) return fail("Elegí un tee de esa cancha.", { teeSetId: "Elegí un tee de esa cancha" });

  const layout = layoutForCourseChange(version.holes_count, round.positions.length, input.nine);
  const holes = version.holes.map((h) => ({ id: h.id, number: h.number, par: h.par, strokeIndex: h.stroke_index, meters: null }));
  const positions = positionsFor(holes, layout.holesPlayed, layout.loops);
  if (positions.length !== round.positions.length) {
    return fail(`La cancha nueva tiene ${positions.length} hoyos para esta partida y se jugaron ${round.positions.length}.`);
  }

  const { error: rpcError } = await supabase.rpc("change_round_course", {
    p_round_id: roundId,
    p_course_version_id: version.id,
    p_tee_set_id: input.teeSetId,
    p_holes_played: layout.holesPlayed,
    p_loops: layout.loops,
    p_hole_map: positions.map((p) => ({ position: p.position, hole_id: p.hole.id })),
  });
  if (rpcError) return fail(friendlyDbError(rpcError));

  revalidatePath(`/partidas/${roundId}`);
  revalidatePath("/partidas");
  revalidatePath("/");
  return ok({ courseName: version.course.name });
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
    // Sin ningún índice (ni calculado ni declarado) no hay net double bogey: el tope es par + 5.
    const ags = adjustedGrossScore(results, index == null ? null : ch, rating.holesInRound);
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
