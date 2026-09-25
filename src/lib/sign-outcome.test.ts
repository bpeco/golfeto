import { describe, expect, it } from "vitest";
import { signOutcomeText } from "./sign-outcome";

describe("signOutcomeText", () => {
  it("el índice cambia", () => {
    expect(signOutcomeText({ indexBefore: 21.3, sourceBefore: "calculado", indexAfter: 20.8, sourceAfter: "calculado", signedCount: 12 })).toBe(
      "Con esta tarjeta tu Hándicap Index pasa de 21,3 a 20,8.",
    );
  });
  it("el índice no cambia", () => {
    expect(signOutcomeText({ indexBefore: 21.3, sourceBefore: "calculado", indexAfter: 21.3, sourceAfter: "calculado", signedCount: 12 })).toBe(
      "Tu Hándicap Index sigue en 21,3.",
    );
  });
  it("primer índice calculado", () => {
    expect(signOutcomeText({ indexBefore: 18.4, sourceBefore: "declarado", indexAfter: 22.4, sourceAfter: "calculado", signedCount: 3 })).toBe(
      "Ya tenés Hándicap Index: 22,4.",
    );
  });
  it("todavía faltan tarjetas", () => {
    expect(signOutcomeText({ indexBefore: null, sourceBefore: null, indexAfter: null, sourceAfter: null, signedCount: 1 })).toBe(
      "Te faltan 2 tarjetas firmadas para tener Hándicap Index.",
    );
    expect(signOutcomeText({ indexBefore: 18.4, sourceBefore: "declarado", indexAfter: 18.4, sourceAfter: "declarado", signedCount: 2 })).toBe(
      "Te falta 1 tarjeta firmada para tener Hándicap Index.",
    );
  });
});
