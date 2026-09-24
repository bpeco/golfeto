import { describe, expect, it } from "vitest";
import {
  adjustedGrossScore,
  courseHandicap,
  courseHandicap9,
  differentialFrom9Holes,
  netDoubleBogey,
  scoreDifferential,
  strokesOnHole,
  type HoleResult,
  type HoleSpec,
} from "./course";

// Miraflores blancas (valores aproximados de la investigación): par 71, CR 70.3, slope 125.
const miraflores = { courseRating: 70.3, slope: 125, par: 71 };

describe("courseHandicap", () => {
  it("aplica Index × Slope/113 + (CR − Par) y redondea", () => {
    // 20.0 × 125/113 = 22.12; + (70.3 − 71) = 21.42 → 21
    expect(courseHandicap(20.0, miraflores)).toBe(21);
  });
  it("ejemplo USGA: 12.4 en slope 130, CR 72.1, par 72 → 14", () => {
    expect(courseHandicap(12.4, { courseRating: 72.1, slope: 130, par: 72 })).toBe(14);
  });
  it("hándicap plus queda negativo", () => {
    expect(courseHandicap(-2.0, { courseRating: 74.0, slope: 140, par: 72 })).toBe(0); // −2.48 + 2 = −0.48 → 0
    expect(courseHandicap(-4.0, { courseRating: 72.0, slope: 113, par: 72 })).toBe(-4);
  });
  it("9 hoyos usa la mitad del Index", () => {
    expect(courseHandicap9(20.0, { courseRating: 35.2, slope: 120, par: 36 })).toBe(10); // 10×1.062 − 0.8 = 9.82
  });
});

describe("strokesOnHole", () => {
  it("reparte 21 golpes: 2 en índices 1–3, 1 en el resto", () => {
    expect(strokesOnHole(21, 1)).toBe(2);
    expect(strokesOnHole(21, 3)).toBe(2);
    expect(strokesOnHole(21, 4)).toBe(1);
    expect(strokesOnHole(21, 18)).toBe(1);
  });
  it("con 5 golpes solo reciben los índices 1–5", () => {
    expect(strokesOnHole(5, 5)).toBe(1);
    expect(strokesOnHole(5, 6)).toBe(0);
  });
  it("hándicap plus da golpes desde los hoyos más fáciles", () => {
    expect(strokesOnHole(-2, 18)).toBe(-1);
    expect(strokesOnHole(-2, 17)).toBe(-1);
    expect(strokesOnHole(-2, 16)).toBe(0);
  });
  it("en 9 hoyos reparte sobre 9", () => {
    expect(strokesOnHole(10, 1, 9)).toBe(2);
    expect(strokesOnHole(10, 2, 9)).toBe(1);
  });
});

describe("netDoubleBogey", () => {
  it("par + 2 + golpes recibidos", () => {
    expect(netDoubleBogey(4, 1)).toBe(7);
    expect(netDoubleBogey(5, 0)).toBe(7);
    expect(netDoubleBogey(3, -1)).toBe(4);
  });
});

const par4 = (n: number, si: number): HoleSpec => ({ number: n, par: 4, strokeIndex: si });
const played = (hole: HoleSpec, strokes: number | null, pickedUp = false): HoleResult => ({
  hole,
  strokes,
  pickedUp,
});

function eighteenPar4s(): HoleSpec[] {
  return Array.from({ length: 18 }, (_, i) => par4(i + 1, i + 1));
}

describe("adjustedGrossScore", () => {
  it("topea cada hoyo a net double bogey", () => {
    const holes = eighteenPar4s();
    // hándicap 18: 1 golpe por hoyo → NDB = 7 en todos.
    const results = holes.map((h) => played(h, h.number === 1 ? 10 : 5));
    const r = adjustedGrossScore(results, 18);
    expect(r.gross).toBe(10 + 17 * 5);
    expect(r.adjustedGross).toBe(7 + 17 * 5);
    expect(r.acceptable).toBe(true);
  });
  it("hoyo levantado vale net double bogey y cuenta como jugado", () => {
    const holes = eighteenPar4s();
    const results = holes.map((h) => played(h, h.number === 5 ? null : 5, h.number === 5));
    const r = adjustedGrossScore(results, 0);
    expect(r.adjustedGross).toBe(17 * 5 + 6);
    expect(r.holesPlayed).toBe(18);
  });
  it("hoyo no jugado vale par neto y no cuenta como jugado", () => {
    const holes = eighteenPar4s();
    const results = holes.map((h) => played(h, h.number > 12 ? null : 5));
    const r = adjustedGrossScore(results, 18);
    expect(r.holesPlayed).toBe(12);
    expect(r.adjustedGross).toBe(12 * 5 + 6 * 5); // par 4 + 1 recibido
    expect(r.acceptable).toBe(true);
  });
  it("con menos de 10 hoyos jugados la tarjeta no es aceptable", () => {
    const holes = eighteenPar4s();
    const results = holes.map((h) => played(h, h.number > 9 ? null : 5));
    expect(adjustedGrossScore(results, 0).acceptable).toBe(false);
  });
});

describe("scoreDifferential", () => {
  it("ejemplo: 95 ajustado en CR 70.3 slope 125 → 22.3", () => {
    // 113/125 × (95 − 70.3) = 0.904 × 24.7 = 22.33
    expect(scoreDifferential(95, miraflores)).toBe(22.3);
  });
  it("aplica PCC", () => {
    expect(scoreDifferential(95, miraflores, 1)).toBe(21.4);
  });
});

describe("differentialFrom9Holes", () => {
  it("sin Index duplica", () => {
    expect(differentialFrom9Holes(11.2, null)).toBe(22.4);
  });
  it("con Index suma el esperado 0.52 × HI + 1.2", () => {
    expect(differentialFrom9Holes(11.2, 20)).toBe(22.8);
  });
});
