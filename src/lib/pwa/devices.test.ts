import { describe, expect, it } from "vitest";
import { SPLASH_DEVICES, parseSplashSpec, splashSpec, startupImages } from "./devices";

describe("splash de iOS", () => {
  it("10 tamaños × claro/oscuro", () => {
    expect(SPLASH_DEVICES).toHaveLength(10);
    expect(startupImages()).toHaveLength(20);
  });
  it("el spec va y vuelve", () => {
    const spec = splashSpec({ width: 390, height: 844, dpr: 3 }, "dark");
    expect(spec).toBe("1170x2532-dark");
    expect(parseSplashSpec(spec)).toEqual({ width: 1170, height: 2532, theme: "dark" });
  });
  it("rechaza tamaños desconocidos", () => {
    expect(parseSplashSpec("100x100-light")).toBeNull();
    expect(parseSplashSpec("1170x2532-sepia")).toBeNull();
  });
  it("media query exacta por dispositivo y tema", () => {
    expect(startupImages()[0].media).toBe(
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)",
    );
  });
});
