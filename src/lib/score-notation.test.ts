import { describe, expect, it } from "vitest";
import { notationFor, notationLabel } from "./score-notation";

describe("notationFor", () => {
  it("forma según el resultado en un par 4", () => {
    expect(notationFor(2, 4).shape).toBe("double-circle");
    expect(notationFor(3, 4).shape).toBe("circle");
    expect(notationFor(4, 4).shape).toBe("none");
    expect(notationFor(5, 4).shape).toBe("square");
    expect(notationFor(6, 4).shape).toBe("double-square");
    expect(notationFor(9, 4).shape).toBe("double-square");
  });
  it("tono: rojo bajo par, azul sobre par", () => {
    expect(notationFor(3, 4).tone).toBe("under");
    expect(notationFor(4, 4).tone).toBe("par");
    expect(notationFor(7, 4).tone).toBe("over");
  });
  it("hoyo no terminado y sin golpes", () => {
    expect(notationFor(null, 4, true)).toMatchObject({ shape: "slash", tone: "picked-up", toPar: null });
    expect(notationFor(null, 4)).toMatchObject({ shape: "none", tone: "empty", toPar: null });
  });
  it("hoyo en uno y albatros", () => {
    expect(notationFor(1, 3).name).toBe("hoyo en uno");
    expect(notationFor(2, 5).name).toBe("albatros");
  });
});

describe("notationLabel", () => {
  it("se lee bien en voz alta", () => {
    expect(notationLabel(5, 4)).toBe("5 golpes, bogey");
    expect(notationLabel(1, 3)).toBe("1 golpe, hoyo en uno");
    expect(notationLabel(null, 4, true)).toBe("Hoyo no terminado");
    expect(notationLabel(null, 4)).toBe("Sin golpes");
  });
});
