"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRound } from "@/lib/db/rounds";
import { toImageInput, VISION_MODEL } from "@/lib/vision/client";
import { extractScorecard, type ScorecardExtraction } from "@/lib/vision/scorecard";
import { suggestAssignments } from "@/lib/vision/match";
import { saveHoleScore } from "../actions";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action-result";

export type ExtractionResult = {
  photoId: string;
  extraction: ScorecardExtraction;
  /** scorecardId sugerido por fila (o null). */
  suggestions: (string | null)[];
};

/** Sube la foto de la partida, la registra y la lee con el modelo de visión. */
export async function uploadAndExtract(formData: FormData): Promise<ActionResult<ExtractionResult>> {
  const roundId = String(formData.get("roundId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || !roundId) return fail("Falta la foto.");

  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida.");

  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${roundId}/${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage.from("scorecard-photos").upload(path, bytes, { contentType: file.type || "image/jpeg" });
  if (upErr) return fail(`No se pudo subir la foto. ${friendlyDbError(upErr)}`);

  const { data: photo, error: phErr } = await supabase
    .from("round_photos")
    .insert({ round_id: roundId, storage_path: path })
    .select("id")
    .single();
  if (phErr) return fail(friendlyDbError(phErr));

  let extraction: ScorecardExtraction;
  try {
    extraction = await extractScorecard(toImageInput(bytes, file.type), {
      holesInRound: round.positions.length,
      playerNames: round.scorecards.map((s) => s.playerName),
    });
  } catch (e) {
    console.error("Lectura de tarjeta", e);
    return fail("No pudimos leer la foto. La foto quedó guardada; probá con otra más de frente y con buena luz.");
  }

  await supabase.from("round_photo_extractions").insert({ round_photo_id: photo.id, model: VISION_MODEL, raw_output: extraction });

  const suggestions = suggestAssignments(
    extraction.rows.map((r) => r.name),
    round.scorecards.map((s) => ({ id: s.id, name: s.playerName })),
  );

  revalidatePath(`/partidas/${roundId}`);
  return ok({ photoId: photo.id, extraction, suggestions });
}

/** Escribe los golpes confirmados por el usuario en las tarjetas elegidas (nunca sobre una firmada). */
export async function applyExtraction(
  roundId: string,
  assignments: { scorecardId: string; strokes: (number | null)[] }[],
): Promise<ActionResult<{ applied: number; strokes: number }>> {
  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida.");
  let applied = 0;
  let strokesSaved = 0;
  for (const a of assignments) {
    const card = round.scorecards.find((s) => s.id === a.scorecardId);
    if (!card || card.signedAt || card.isLegacy) continue;
    for (const { position, hole } of round.positions) {
      const strokes = a.strokes[position - 1];
      if (strokes == null || strokes < 1 || strokes > 30) continue;
      const r = await saveHoleScore({ scorecardId: card.id, holeId: hole.id, position, strokes, pickedUp: false });
      if (!r.ok) return fail(`${r.error} Se cargaron ${strokesSaved} golpes antes del error.`);
      strokesSaved++;
    }
    applied++;
  }
  revalidatePath(`/partidas/${roundId}`);
  return ok({ applied, strokes: strokesSaved });
}

export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from("scorecard-photos").createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
