import { describe, expect, it } from "vitest";
import {
  applyCaps,
  effectiveIndex,
  exceptionalReduction,
  handicapHistory,
  rawHandicapIndex,
  selectionFor,
} from "./index-calc";

describe("selectionFor (Regla 5.2a)", () => {
  it("cubre toda la tabla", () => {
    expect(selectionFor(2)).toBeNull();
    expect(selectionFor(3)).toEqual({ use: 1, adjustment: -2 });
    expect(selectionFor(4)).toEqual({ use: 1, adjustment: -1 });
    expect(selectionFor(5)).toEqual({ use: 1, adjustment: 0 });
    expect(selectionFor(6)).toEqual({ use: 2, adjustment: -1 });
    expect(selectionFor(8)).toEqual({ use: 2, adjustment: 0 });
    expect(selectionFor(11)).toEqual({ use: 3, adjustment: 0 });
    expect(selectionFor(14)).toEqual({ use: 4, adjustment: 0 });
    expect(selectionFor(16)).toEqual({ use: 5, adjustment: 0 });
    expect(selectionFor(18)).toEqual({ use: 6, adjustment: 0 });
    expect(selectionFor(19)).toEqual({ use: 7, adjustment: 0 });
    expect(selectionFor(20)).toEqual({ use: 8, adjustment: 0 });
    expect(selectionFor(35)).toEqual({ use: 8, adjustment: 0 });
  });
});

describe("rawHandicapIndex", () => {
  it("null con menos de 3 tarjetas", () => {
    expect(rawHandicapIndex([20, 21])).toBeNull();
  });
  it("3 tarjetas: la mejor menos 2", () => {
    expect(rawHandicapIndex([25.1, 22.4, 30.0])).toBe(20.4);
  });
  it("20 tarjetas: promedio de las 8 mejores", () => {
    const diffs = Array.from({ length: 20 }, (_, i) => 10 + i); // 10..29
    expect(rawHandicapIndex(diffs)).toBe(13.5); // (10+…+17)/8
  });
  it("solo mira las 20 más recientes", () => {
    const diffs = [...Array.from({ length: 20 }, () => 30), 5, 5, 5];
    expect(rawHandicapIndex(diffs)).toBe(30);
  });
  it("tope 54.0", () => {
    expect(rawHandicapIndex([60, 61, 62, 63, 64])).toBe(54);
  });
});

describe("applyCaps (Regla 5.8)", () => {
  it("sin Low Index no hay tope", () => {
    expect(applyCaps(30, null)).toBe(30);
  });
  it("hasta +3.0 no cambia", () => {
    expect(applyCaps(22.9, 20)).toBe(22.9);
  });
  it("soft cap: la suba por encima de 3.0 se reduce a la mitad", () => {
    expect(applyCaps(25.0, 20)).toBe(24.0); // 3 + (5−3)/2
  });
  it("hard cap: nunca más de +5.0", () => {
    expect(applyCaps(30.0, 20)).toBe(25.0);
  });
});

describe("exceptionalReduction (Regla 5.9)", () => {
  it("7.0 a 9.9 mejor que el Index → −1", () => {
    expect(exceptionalReduction(13.0, 20.0)).toBe(-1);
  });
  it("10.0 o más → −2", () => {
    expect(exceptionalReduction(10.0, 20.0)).toBe(-2);
  });
  it("menos de 7.0 → 0", () => {
    expect(exceptionalReduction(14.0, 20.0)).toBe(0);
  });
});

describe("handicapHistory", () => {
  const score = (i: number, d: number) => ({
    id: `s${i}`,
    playedOn: `2026-01-${String(i).padStart(2, "0")}`,
    differential: d,
  });

  it("devuelve null hasta la tercera tarjeta y luego el Index", () => {
    const h = handicapHistory([score(1, 25), score(2, 27), score(3, 24)]);
    expect(h.map((p) => p.handicapIndex)).toEqual([null, null, 22.0]);
  });

  it("ordena por fecha aunque lleguen desordenadas", () => {
    const h = handicapHistory([score(3, 24), score(1, 25), score(2, 27)]);
    expect(h.map((p) => p.scoreId)).toEqual(["s1", "s2", "s3"]);
  });

  it("aplica reducción excepcional al récord", () => {
    const h = handicapHistory([score(1, 25), score(2, 25), score(3, 25), score(4, 13)]);
    // Index tras 3 tarjetas: 23.0. La cuarta (13.0) está 10 por debajo → −2 a todo.
    expect(h[2].handicapIndex).toBe(23.0);
    expect(h[3].differential).toBe(11.0);
    // 4 tarjetas: mejor (11) − 1 = 10.0
    expect(h[3].handicapIndex).toBe(10.0);
  });

  it("con 20 tarjetas aparece el Low Index y limita subas", () => {
    const scores = Array.from({ length: 20 }, (_, i) => score(i + 1, 20));
    scores.push({ id: "s21", playedOn: "2026-02-01", differential: 40 });
    scores.push({ id: "s22", playedOn: "2026-02-02", differential: 40 });
    const h = handicapHistory(scores);
    expect(h[19].handicapIndex).toBe(20.0);
    // El Low Index mira el año previo: tras 3 tarjetas el Index fue 18.0 (20 − 2).
    expect(h[19].lowHandicapIndex).toBe(18.0);
    // Forzamos una subida grande:
    const rising = [
      ...Array.from({ length: 20 }, (_, i) => score(i + 1, 20)),
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `r${i}`,
        playedOn: `2026-03-${String(i + 1).padStart(2, "0")}`,
        differential: 30,
      })),
    ];
    const last = handicapHistory(rising).at(-1)!;
    // crudo sería 30.0; Low 18 → hard cap 23.0
    expect(last.handicapIndex).toBe(23.0);
  });
});

describe("effectiveIndex", () => {
  it("prefiere el calculado", () => {
    expect(effectiveIndex(18.2, 20)).toEqual({ value: 18.2, source: "calculado" });
  });
  it("usa el declarado si no hay calculado", () => {
    expect(effectiveIndex(null, 20)).toEqual({ value: 20, source: "declarado" });
  });
  it("null si no hay ninguno", () => {
    expect(effectiveIndex(null, null)).toEqual({ value: null, source: null });
  });
});
