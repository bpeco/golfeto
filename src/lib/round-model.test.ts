import { describe, expect, it } from "vitest";
import { layoutForCourseChange } from "./round-model";

describe("layoutForCourseChange", () => {
  it("18 hoyos en una cancha de 18: completa, una vuelta", () => {
    expect(layoutForCourseChange(18, 18)).toEqual({ holesPlayed: "completa", loops: 1 });
  });
  it("18 hoyos en una cancha de 9: dos vueltas", () => {
    expect(layoutForCourseChange(9, 18)).toEqual({ holesPlayed: "completa", loops: 2 });
  });
  it("9 hoyos en una cancha de 9: una vuelta", () => {
    expect(layoutForCourseChange(9, 9)).toEqual({ holesPlayed: "completa", loops: 1 });
  });
  it("9 hoyos en una cancha de 18: la ida, o la vuelta si se elige", () => {
    expect(layoutForCourseChange(18, 9)).toEqual({ holesPlayed: "ida", loops: 1 });
    expect(layoutForCourseChange(18, 9, "vuelta")).toEqual({ holesPlayed: "vuelta", loops: 1 });
  });
});
