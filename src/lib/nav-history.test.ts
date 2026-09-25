import { beforeEach, describe, expect, it, vi } from "vitest";

// El módulo guarda estado propio: uno nuevo por test.
let nav: typeof import("./nav-history");
beforeEach(async () => {
  vi.resetModules();
  nav = await import("./nav-history");
});

describe("nav-history", () => {
  it("una navegación normal suma profundidad", () => {
    nav.trackPath("/partidas");
    expect(nav.canGoBack()).toBe(false);
    nav.trackPath("/partidas/nueva");
    expect(nav.canGoBack()).toBe(true);
  });

  it("un redirect que reemplaza no suma (Volver no cae en el formulario ni queda muerto)", () => {
    nav.trackPath("/partidas/nueva");
    nav.expectReplace();
    nav.trackPath("/partidas/abc");
    expect(nav.canGoBack()).toBe(false);
  });

  it("si la acción falla y se cancela, la próxima navegación cuenta", () => {
    nav.trackPath("/partidas/nueva");
    nav.expectReplace();
    nav.cancelReplace();
    nav.trackPath("/partidas");
    expect(nav.canGoBack()).toBe(true);
  });
});
