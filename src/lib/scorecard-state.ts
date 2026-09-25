/**
 * Reglas puras de la pantalla de Partida: qué se muestra y qué se puede hacer con una tarjeta.
 * Los totales viven en scorecard-totals.ts; el cálculo WHS en handicap/.
 */
import type { HolesPlayed } from "./round-model";
import { nextUnplayed, type HoleScore, type PositionedHole } from "./scorecard-totals";

/** "18 hoyos", "Ida", "Vuelta", "9 × 2", "9 hoyos". */
export function holesLabel(r: { holesPlayed: HolesPlayed; loops: number; holes: number }) {
  if (r.holesPlayed === "ida") return "Ida";
  if (r.holesPlayed === "vuelta") return "Vuelta";
  if (r.loops === 2) return "9 × 2";
  return `${r.holes} hoyos`;
}

/** Hoyos con golpes o marcados como no terminados (lo que cuenta el WHS como jugado). */
export function playedCount(positions: PositionedHole[], scores: Record<number, HoleScore | undefined>) {
  return positions.filter(({ position }) => {
    const s = scores[position];
    return !!s && (s.strokes != null || s.pickedUp);
  }).length;
}

export type SignBlocker = null | { reason: "not-owner" | "locked" | "no-rating" | "holes" | "saving"; message: string };

/**
 * Por qué no se puede firmar (o null si se puede). El mínimo del WHS: 10 hoyos en una
 * partida de 18, los 9 en una de 9.
 */
export function signBlocker(o: {
  isOwner: boolean;
  locked: boolean;
  hasRating: boolean;
  dirty: boolean;
  played: number;
  holesInRound: number;
  playerName: string;
}): SignBlocker {
  if (o.locked) return { reason: "locked", message: "La tarjeta ya está firmada." };
  if (!o.isOwner) return { reason: "not-owner", message: `Solo ${o.playerName} puede firmar su tarjeta.` };
  if (!o.hasRating) return { reason: "no-rating", message: "Sin rating: cargalo en la cancha para poder firmar." };
  const min = o.holesInRound === 18 ? 10 : 9;
  if (o.played < min) return { reason: "holes", message: `Para firmar hacen falta ${min} hoyos: hay ${o.played}.` };
  if (o.dirty) return { reason: "saving", message: "Guardando los últimos golpes…" };
  return null;
}

/** Dónde abrir la partida: el primer hoyo sin anotar, o el último si ya está completa. */
export function initialPosition(positions: PositionedHole[], scores: Record<number, HoleScore | undefined>) {
  return nextUnplayed(positions, scores) ?? positions.at(-1)?.position ?? 1;
}

/** Filas leídas de la foto (golpes por posición, 0-based) sobre los golpes de la tarjeta. */
export function mergePhotoRow(scores: Record<number, HoleScore>, strokes: (number | null)[]): Record<number, HoleScore> {
  const next = { ...scores };
  strokes.forEach((v, i) => {
    if (v != null && v >= 1 && v <= 30) next[i + 1] = { strokes: v, pickedUp: false };
  });
  return next;
}
