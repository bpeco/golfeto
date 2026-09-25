import { describe, expect, it } from "vitest";
import { teeColor } from "./tee-color";

describe("teeColor", () => {
  it("reconoce los colores habituales con cualquier forma de escribirlos", () => {
    expect(teeColor("Blancas")).toBe("blancas");
    expect(teeColor("blanco")).toBe("blancas");
    expect(teeColor("AZULES")).toBe("azules");
    expect(teeColor(" Amarillas ")).toBe("amarillas");
    expect(teeColor("Doradas")).toBe("amarillas");
    expect(teeColor("Rojas")).toBe("rojas");
    expect(teeColor("Negras")).toBe("negras");
    expect(teeColor("Verdes")).toBe("verdes");
  });
  it("sin color para nombres desconocidos", () => {
    expect(teeColor("Campeonato")).toBeNull();
    expect(teeColor("")).toBeNull();
  });
});
