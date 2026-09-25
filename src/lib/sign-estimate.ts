/**
 * Lo que va a quedar congelado al firmar, calculado en el cliente con el mismo motor WHS que
 * usa la acción `signScorecard` (src/lib/handicap/course.ts). Se muestra como "estimado":
 * el servidor recalcula con el hándicap vigente en ese momento.
 */
import {
  adjustedGrossScore,
  courseHandicap,
  courseHandicap9,
  differentialFrom9Holes,
  scoreDifferential,
} from "./handicap/course";
import type { HoleScore } from "./scorecard-totals";

export type RatingForSign = { courseRating: number; slope: number; par: number; holesInRound: 9 | 18 };

export type SignEstimate = {
  holesPlayed: number;
  holesInRound: number;
  pickedUp: number;
  gross: number;
  courseHandicap: number;
  adjustedGross: number;
  differential: number;
  /** Alcanza el mínimo de hoyos del WHS (10 de 18, 9 de 9). */
  acceptable: boolean;
};

export function estimateSignature(
  positions: { position: number; hole: { number: number; par: number; strokeIndex: number | null } }[],
  scores: Record<number, HoleScore | undefined>,
  rating: RatingForSign,
  handicapIndex: number | null,
): SignEstimate {
  const ch = rating.holesInRound === 9 ? courseHandicap9(handicapIndex ?? 0, rating) : courseHandicap(handicapIndex ?? 0, rating);
  const results = positions.map(({ position, hole }) => ({
    hole: { number: hole.number, par: hole.par, strokeIndex: hole.strokeIndex ?? 18 },
    strokes: scores[position]?.strokes ?? null,
    pickedUp: scores[position]?.pickedUp ?? false,
  }));
  const ags = adjustedGrossScore(results, handicapIndex == null ? null : ch, rating.holesInRound);
  let differential = scoreDifferential(ags.adjustedGross, rating);
  if (rating.holesInRound === 9) differential = differentialFrom9Holes(differential, handicapIndex);
  return {
    holesPlayed: ags.holesPlayed,
    holesInRound: rating.holesInRound,
    pickedUp: results.filter((r) => r.pickedUp).length,
    gross: ags.gross,
    courseHandicap: ch,
    adjustedGross: ags.adjustedGross,
    differential,
    acceptable: ags.acceptable,
  };
}
