/**
 * Modelo puro de una partida (tipos, orden de hoyos, rating efectivo). Sin Supabase: lo usan
 * el servidor, los componentes cliente y el playground.
 */
import type { Database } from "@/lib/supabase/database.types";

export type HolesPlayed = Database["public"]["Enums"]["round_holes"];

export type RoundHole = { id: string; number: number; par: number; strokeIndex: number | null; meters: number | null };

export type RoundScorecard = {
  id: string;
  playerId: string;
  playerName: string;
  isGuest: boolean;
  isLegacy: boolean;
  legacyGross: number | null;
  signedAt: string | null;
  signature: { courseHandicap: number; gross: number; adjustedGross: number; differential: number; handicapIndex: number | null } | null;
  /** Por posición (1..18). */
  scores: Record<number, { strokes: number | null; pickedUp: boolean }>;
};

export type RoundDetail = {
  id: string;
  playedOn: string;
  dateApproximate: boolean;
  holesPlayed: HolesPlayed;
  loops: number;
  createdBy: string;
  notes: string | null;
  course: { id: string; name: string; club: string | null; holesCount: number; versionId: string };
  tee: { id: string; name: string; courseRating: number | null; slope: number | null };
  holes: RoundHole[];
  /** Hoyos en el orden en que se jugaron (posición 1..N). */
  positions: { position: number; hole: RoundHole }[];
  scorecards: RoundScorecard[];
  photos: { id: string; storagePath: string; createdAt: string }[];
};

/** Hoyos en orden de juego: ida/vuelta, o dos vueltas de una cancha de 9. */
export function positionsFor(holes: RoundHole[], holesPlayed: HolesPlayed, loops: number) {
  const sorted = [...holes].sort((a, b) => a.number - b.number);
  let seq: RoundHole[];
  if (holesPlayed === "ida") seq = sorted.filter((h) => h.number <= 9);
  else if (holesPlayed === "vuelta") seq = sorted.filter((h) => h.number > 9);
  else seq = loops === 2 ? [...sorted, ...sorted] : sorted;
  return seq.map((hole, i) => ({ position: i + 1, hole }));
}

/** Rating y par efectivos para lo que se jugó (WHS: 9 hoyos usan rating de 9; dos vueltas duplican). */
export function effectiveTeeRating(round: Pick<RoundDetail, "holesPlayed" | "loops" | "course" | "tee" | "holes">) {
  const cr = round.tee.courseRating;
  const slope = round.tee.slope;
  if (cr == null || slope == null) return null;
  const parAll = round.holes.reduce((s, h) => s + h.par, 0);
  if (round.course.holesCount === 9) {
    // El tee de una cancha de 9 guarda rating de 9 hoyos.
    return round.loops === 2
      ? { courseRating: cr * 2, slope, par: parAll * 2, holesInRound: 18 as const }
      : { courseRating: cr, slope, par: parAll, holesInRound: 9 as const };
  }
  if (round.holesPlayed === "completa") return { courseRating: cr, slope, par: parAll, holesInRound: 18 as const };
  // Ida o vuelta en cancha de 18: sin rating oficial de 9, se aproxima con la mitad del CR.
  const half = round.holes.filter((h) => (round.holesPlayed === "ida" ? h.number <= 9 : h.number > 9));
  return { courseRating: cr / 2, slope, par: half.reduce((s, h) => s + h.par, 0), holesInRound: 9 as const };
}
