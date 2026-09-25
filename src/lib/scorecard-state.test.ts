import { describe, expect, it } from "vitest";
import { holesLabel, initialPosition, playedCount, signBlocker } from "./scorecard-state";

const positions = Array.from({ length: 18 }, (_, i) => ({ position: i + 1, hole: { number: i + 1, par: 4 } }));

describe("holesLabel", () => {
  it("nombra lo que se jugó", () => {
    expect(holesLabel({ holesPlayed: "completa", loops: 1, holes: 18 })).toBe("18 hoyos");
    expect(holesLabel({ holesPlayed: "ida", loops: 1, holes: 9 })).toBe("Ida");
    expect(holesLabel({ holesPlayed: "vuelta", loops: 1, holes: 9 })).toBe("Vuelta");
    expect(holesLabel({ holesPlayed: "completa", loops: 2, holes: 18 })).toBe("9 × 2");
    expect(holesLabel({ holesPlayed: "completa", loops: 1, holes: 9 })).toBe("9 hoyos");
  });
});

describe("signBlocker", () => {
  const base = { isOwner: true, locked: false, hasRating: true, dirty: false, played: 18, holesInRound: 18, playerName: "Agus" };
  it("se puede firmar", () => expect(signBlocker(base)).toBeNull());
  it("cada motivo, en orden", () => {
    expect(signBlocker({ ...base, locked: true })?.reason).toBe("locked");
    expect(signBlocker({ ...base, isOwner: false })?.message).toBe("Solo Agus puede firmar su tarjeta.");
    expect(signBlocker({ ...base, hasRating: false })?.reason).toBe("no-rating");
    expect(signBlocker({ ...base, played: 9 })?.message).toBe("Para firmar hacen falta 10 hoyos: hay 9.");
    expect(signBlocker({ ...base, played: 9, holesInRound: 9 })).toBeNull();
    expect(signBlocker({ ...base, dirty: true })?.reason).toBe("saving");
  });
});

describe("posición inicial y jugados", () => {
  it("abre en el primer hoyo sin anotar", () => {
    const scores = { 1: { strokes: 4, pickedUp: false }, 2: { strokes: null, pickedUp: true } };
    expect(initialPosition(positions, scores)).toBe(3);
    expect(playedCount(positions, scores)).toBe(2);
  });
  it("con la tarjeta completa, el último", () => {
    const full = Object.fromEntries(positions.map((p) => [p.position, { strokes: 4, pickedUp: false }]));
    expect(initialPosition(positions, full)).toBe(18);
  });
});
