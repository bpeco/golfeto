import { describe, expect, it } from "vitest";
import { MINUS, fmtCount, fmtDecimal, fmtDelta, fmtIndex, fmtToPar, formatDate, formatMonth, formatRoundDate, parseDecimal, parseHandicap } from "./format";

describe("fechas", () => {
  it("día y mes corto en español, con o sin año", () => {
    expect(formatDate("2026-09-12")).toBe("12 sep 2026");
    expect(formatDate("2026-01-05", { year: false })).toBe("5 ene");
    expect(formatDate("2026-12-31T10:00:00Z")).toBe("31 dic 2026");
  });
  it("marca la fecha aproximada del historial", () => {
    expect(formatRoundDate("2026-09-12", true, { year: false })).toBe("aprox. 12 sep");
    expect(formatRoundDate("2026-09-12", false)).toBe("12 sep 2026");
  });
  it("encabezado de mes", () => {
    expect(formatMonth("2026-09-12")).toBe("Septiembre 2026");
  });
});

describe("números", () => {
  it("índice con coma y plus con +", () => {
    expect(fmtIndex(21.3)).toBe("21,3");
    expect(fmtIndex(18)).toBe("18,0");
    expect(fmtIndex(-2)).toBe("+2,0");
    expect(fmtIndex(null)).toBe("—");
  });
  it("respecto del par", () => {
    expect(fmtToPar(0)).toBe("E");
    expect(fmtToPar(3)).toBe("+3");
    expect(fmtToPar(-2)).toBe(`${MINUS}2`);
  });
  it("delta con signo tipográfico", () => {
    expect(fmtDelta(-0.4)).toBe(`${MINUS}0,4`);
    expect(fmtDelta(0.25)).toBe("+0,3");
    expect(fmtDelta(0)).toBe("0,0");
  });
  it("decimal genérico", () => {
    expect(fmtDecimal(70.3)).toBe("70,3");
    expect(fmtDecimal(-0.04)).toBe("0,0");
  });
  it("cantidades en singular y plural", () => {
    expect(fmtCount(1, "tarjeta")).toBe("1 tarjeta");
    expect(fmtCount(12, "tarjeta")).toBe("12 tarjetas");
    expect(fmtCount(2, "golfista")).toBe("2 golfistas");
  });
  it("lee coma o punto decimal", () => {
    expect(parseDecimal("18,4")).toBe(18.4);
    expect(parseDecimal(" 18.4 ")).toBe(18.4);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal(`${MINUS}2`)).toBe(-2);
  });
});

describe("parseHandicap", () => {
  it("lee el índice como se escribe, con + para los plus (adentro negativos)", () => {
    expect(parseHandicap("18,4")).toBe(18.4);
    expect(parseHandicap("+2,5")).toBe(-2.5);
    expect(parseHandicap(" +0,3 ")).toBe(-0.3);
    expect(parseHandicap("-2,5")).toBe(-2.5);
    expect(parseHandicap("+")).toBeNull();
    expect(parseHandicap("")).toBeNull();
  });

  it("es la inversa de fmtIndex", () => {
    for (const v of [18.4, 0, -2.5, 54]) expect(parseHandicap(fmtIndex(v))).toBe(v);
  });
});
