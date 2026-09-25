import { describe, expect, it } from "vitest";
import { parseFlash } from "./flash-shared";

describe("parseFlash", () => {
  const value = encodeURIComponent(JSON.stringify({ message: "Grupo creado", tone: "success" }));
  it("lee el mensaje codificado una o dos veces", () => {
    expect(parseFlash(value)).toEqual({ message: "Grupo creado", tone: "success" });
    expect(parseFlash(encodeURIComponent(value))).toEqual({ message: "Grupo creado", tone: "success" });
  });
  it("ignora basura y tonos desconocidos", () => {
    expect(parseFlash(undefined)).toBeNull();
    expect(parseFlash("%7Bnope")).toBeNull();
    expect(parseFlash(encodeURIComponent(JSON.stringify({ message: "" })))).toBeNull();
    expect(parseFlash(encodeURIComponent(JSON.stringify({ message: "Hola", tone: "<script>" })))!.tone).toBe("success");
  });
});
