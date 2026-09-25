"use server";

import { revalidatePath } from "next/cache";
import { fmtCount } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getRound } from "@/lib/db/rounds";
import { toImageInput, VISION_MODEL } from "@/lib/vision/client";
import { extractScorecard, type ScorecardExtraction } from "@/lib/vision/scorecard";
import { suggestAssignments } from "@/lib/vision/match";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action-result";
import { saveHoleScore } from "../actions";

const BUCKET = "scorecard-photos";

export type ExtractionResult = {
  photoId: string;
  extraction: ScorecardExtraction;
  /** scorecardId sugerido por fila (o null). */
  suggestions: (string | null)[];
};

/** Paso 1: sube la foto de la partida y la registra. Queda guardada aunque la lectura falle. */
export async function uploadScorecardPhoto(formData: FormData): Promise<ActionResult<{ photoId: string }>> {
  const roundId = String(formData.get("roundId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || !roundId) return fail("Falta la foto.");

  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${roundId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type || "image/jpeg" });
  if (upErr) return fail(`No se pudo subir la foto. ${friendlyDbError(upErr)}`);

  const { data: photo, error: phErr } = await supabase.from("round_photos").insert({ round_id: roundId, storage_path: path }).select("id").single();
  if (phErr) return fail(friendlyDbError(phErr));
  revalidatePath(`/partidas/${roundId}`);
  return ok({ photoId: photo.id });
}

/** Paso 2: lee una foto ya subida con el modelo de visión y propone a quién es cada fila. */
export async function readScorecardPhoto(roundId: string, photoId: string): Promise<ActionResult<ExtractionResult>> {
  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida.");
  const photo = round.photos.find((p) => p.id === photoId);
  if (!photo) return fail("No encontramos la foto.");

  const supabase = await createClient();
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(photo.storagePath);
  if (dlErr || !blob) return fail(`No pudimos abrir la foto. ${friendlyDbError(dlErr)}`);

  let extraction: ScorecardExtraction;
  try {
    extraction = await extractScorecard(toImageInput(await blob.arrayBuffer(), blob.type), {
      holesInRound: round.positions.length,
      playerNames: round.scorecards.map((s) => s.playerName),
    });
  } catch (e) {
    console.error("Lectura de tarjeta", e);
    return fail("No pudimos leer la foto. Quedó guardada; probá leerla de nuevo o sacá otra más de frente y con buena luz.");
  }

  // Registro de la lectura cruda: si falla no frena al usuario, pero queda en el log.
  const { error: logErr } = await supabase.from("round_photo_extractions").insert({ round_photo_id: photoId, model: VISION_MODEL, raw_output: extraction });
  if (logErr) console.error("No se guardó la lectura cruda", logErr);

  const suggestions = suggestAssignments(
    extraction.rows.map((r) => r.name),
    round.scorecards.map((s) => ({ id: s.id, name: s.playerName })),
  );
  return ok({ photoId, extraction, suggestions });
}

/** Escribe los golpes confirmados en las tarjetas elegidas (nunca sobre una firmada). */
export async function applyExtraction(
  roundId: string,
  assignments: { scorecardId: string; strokes: (number | null)[] }[],
): Promise<ActionResult<{ applied: number; strokes: number }>> {
  const round = await getRound(roundId);
  if (!round) return fail("No encontramos la partida.");
  let applied = 0;
  let saved = 0;
  for (const a of assignments) {
    const card = round.scorecards.find((s) => s.id === a.scorecardId);
    if (!card || card.signedAt || card.isLegacy) continue;
    for (const { position, hole } of round.positions) {
      const strokes = a.strokes[position - 1];
      if (strokes == null || strokes < 1 || strokes > 30) continue;
      const r = await saveHoleScore({ scorecardId: card.id, holeId: hole.id, position, strokes, pickedUp: false });
      if (!r.ok) {
        // Lo que ya se escribió tiene que verse (y ser la base del autosave).
        if (saved > 0) revalidatePath(`/partidas/${roundId}`);
        return fail(`${r.error} Se cargaron ${fmtCount(saved, "hoyo")} antes del error.`);
      }
      saved++;
    }
    applied++;
  }
  revalidatePath(`/partidas/${roundId}`);
  return ok({ applied, strokes: saved });
}

export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
