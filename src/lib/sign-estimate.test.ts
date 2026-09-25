import { describe, expect, it } from "vitest";
import { estimateSignature } from "./sign-estimate";

const PARS = [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 5, 3, 4, 4, 5, 4, 3, 4];
const positions = PARS.map((par, i) => ({ position: i + 1, hole: { number: i + 1, par, strokeIndex: i + 1 } }));
const rating = { courseRating: 70.3, slope: 125, par: 71, holesInRound: 18 as const };

describe("estimateSignature", () => {
  it("coincide con el cálculo de la firma: bogey en todos, índice 20", () => {
    const scores = Object.fromEntries(PARS.map((p, i) => [i + 1, { strokes: p + 1, pickedUp: false }]));
    const e = estimateSignature(positions, scores, rating, 20);
    expect(e.courseHandicap).toBe(21);
    expect(e.gross).toBe(89);
    expect(e.adjustedGross).toBe(89);
    expect(e.differential).toBe(16.9); // 113/125 × (89 − 70.3) = 16,90
    expect(e.acceptable).toBe(true);
  });
  it("sin Hándicap Index topea cada hoyo a par + 5, igual que la firma", () => {
    // Bogey en todos salvo el 1 (par 4): 11 golpes → cuenta 9.
    const scores = Object.fromEntries(PARS.map((p, i) => [i + 1, { strokes: i === 0 ? 11 : p + 1, pickedUp: false }]));
    const e = estimateSignature(positions, scores, rating, null);
    expect(e.gross).toBe(95);
    expect(e.adjustedGross).toBe(93);
    expect(e.differential).toBe(20.5); // 113/125 × (93 − 70.3) = 20,52
  });
  it("con menos de 10 hoyos no alcanza", () => {
    const scores = Object.fromEntries([1, 2, 3].map((p) => [p, { strokes: 5, pickedUp: false }]));
    const e = estimateSignature(positions, scores, rating, 20);
    expect(e.holesPlayed).toBe(3);
    expect(e.acceptable).toBe(false);
  });
  it("cuenta los Hoyos no terminados", () => {
    const scores = Object.fromEntries(PARS.map((p, i) => [i + 1, i === 4 ? { strokes: null, pickedUp: true } : { strokes: p, pickedUp: false }]));
    expect(estimateSignature(positions, scores, rating, 10).pickedUp).toBe(1);
  });
});
