import { describe, expect, it } from "vitest";
import { cardTotals, nextUnplayed, segmentsFor, type HoleScore } from "./scorecard-totals";

const PARS = [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 5, 3, 4, 4, 5, 4, 3, 4];
const eighteen = PARS.map((par, i) => ({ position: i + 1, hole: { number: i + 1, par } }));
const nine = eighteen.slice(0, 9);
const scoresFrom = (xs: (number | "x" | null)[]): Record<number, HoleScore> =>
  Object.fromEntries(xs.map((s, i) => [i + 1, s === "x" ? { strokes: null, pickedUp: true } : { strokes: s, pickedUp: false }]));

describe("segmentsFor", () => {
  it("Ida y Vuelta en 18 hoyos; vueltas numeradas en 9 × 2; nada en 9", () => {
    expect(segmentsFor(eighteen, 1).map((s) => s.label)).toEqual(["Ida", "Vuelta"]);
    expect(segmentsFor(eighteen, 2).map((s) => s.label)).toEqual(["1.ª vuelta", "2.ª vuelta"]);
    expect(segmentsFor(nine, 1)).toEqual([]);
  });
});

describe("cardTotals", () => {
  it("suma ida, vuelta y total con el par de cada tramo", () => {
    const t = cardTotals(eighteen, scoresFrom(PARS.map((p) => p + 1)), { courseHandicap: 20 });
    expect(t.segments.map((s) => [s.label, s.par, s.gross, s.toPar])).toEqual([
      ["Ida", 35, 44, 9],
      ["Vuelta", 36, 45, 9],
    ]);
    expect(t.par).toBe(71);
    expect(t.gross).toBe(89);
    expect(t.toPar).toBe(18);
    expect(t.complete).toBe(true);
    expect(t.net).toBe(69);
  });

  it("tarjeta a medias: suma lo jugado y no da neto", () => {
    const t = cardTotals(eighteen, scoresFrom([5, 4, 3, 6, 6, 5, 2, 5, "x", 5, 6, 4]), { courseHandicap: 23 });
    expect(t.gross).toBe(51);
    expect(t.withStrokes).toBe(11);
    expect(t.pickedUp).toBe(1);
    expect(t.segments[0].played).toBe(9);
    expect(t.segments[1].played).toBe(3);
    expect(t.complete).toBe(false);
    expect(t.net).toBeNull();
  });

  it("un Hoyo no terminado impide el neto aunque estén todos marcados", () => {
    const xs: (number | "x")[] = PARS.map((p) => p);
    xs[4] = "x";
    const t = cardTotals(eighteen, scoresFrom(xs), { courseHandicap: 10 });
    expect(t.complete).toBe(false);
    expect(t.net).toBeNull();
  });
});

describe("nextUnplayed", () => {
  it("devuelve el primer hoyo vacío o null", () => {
    expect(nextUnplayed(eighteen, scoresFrom([4, 4, "x"]))).toBe(4);
    expect(nextUnplayed(nine, scoresFrom(PARS.slice(0, 9)))).toBeNull();
    expect(nextUnplayed(eighteen, {})).toBe(1);
  });
});
