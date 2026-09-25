import { describe, expect, it } from "vitest";
import { isTabActive } from "./nav";

describe("isTabActive", () => {
  it("Inicio solo en la raíz", () => {
    expect(isTabActive("/", "/", true)).toBe(true);
    expect(isTabActive("/partidas", "/", true)).toBe(false);
  });
  it("las demás pestañas incluyen sus subrutas", () => {
    expect(isTabActive("/partidas", "/partidas")).toBe(true);
    expect(isTabActive("/partidas/abc", "/partidas")).toBe(true);
    expect(isTabActive("/partidas/nueva", "/partidas")).toBe(true);
    expect(isTabActive("/perfilx", "/perfil")).toBe(false);
    expect(isTabActive("/grupos/nuevo", "/grupos")).toBe(true);
  });
});
