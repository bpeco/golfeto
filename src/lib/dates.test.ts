import { describe, expect, it } from "vitest";
import { todayInArgentina } from "./dates";

describe("todayInArgentina", () => {
  it("usa la hora de Buenos Aires, no UTC", () => {
    expect(todayInArgentina(new Date("2026-09-26T01:30:00Z"))).toBe("2026-09-25"); // 22:30 en Argentina
    expect(todayInArgentina(new Date("2026-09-26T03:30:00Z"))).toBe("2026-09-26");
  });
});
