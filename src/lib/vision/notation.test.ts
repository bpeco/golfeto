import { describe, expect, it } from "vitest";
import { toStrokes } from "./notation";

const pars = [4, 5, 3, 4];

describe("toStrokes", () => {
  it("deja los golpes como están", () => {
    expect(toStrokes([5, 6, null, 4], pars, "golpes")).toEqual([5, 6, null, 4]);
  });

  it("suma el par a lo anotado sobre el par", () => {
    expect(toStrokes([1, 0, -1, 2], pars, "sobrePar")).toEqual([5, 5, 2, 6]);
  });

  it("vacía lo imposible (menos de 1 golpe o sin par)", () => {
    expect(toStrokes([-4, null, 0], pars, "sobrePar")).toEqual([null, null, 3]);
    expect(toStrokes([1], [null], "sobrePar")).toEqual([null]);
    expect(toStrokes([0, 31], pars, "golpes")).toEqual([null, null]);
  });
});
