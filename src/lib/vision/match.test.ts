import { describe, expect, it } from "vitest";
import { suggestAssignments } from "./match";

const players = [
  { id: "a", name: "Agustín Pérez" },
  { id: "m", name: "Manuel García" },
  { id: "j", name: "Javier López" },
  { id: "b", name: "Bautista Peco" },
];

describe("suggestAssignments", () => {
  it("empareja apodos y abreviaturas escritas a mano", () => {
    expect(suggestAssignments(["Agus", "Manu", "Javo", "Bauti"], players)).toEqual(["a", "m", "j", "b"]);
  });
  it("no asigna dos filas al mismo jugador", () => {
    expect(suggestAssignments(["Agus", "Agustin"], players)).toEqual(["a", null]);
  });
  it("deja null lo que no se parece a nadie", () => {
    expect(suggestAssignments(["Pedro"], players)).toEqual([null]);
  });
});
