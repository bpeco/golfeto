import { describe, expect, it } from "vitest";
import { isPublicPath, playgroundEnabled } from "./public-paths";

describe("isPublicPath", () => {
  it("deja pasar login, auth, manifest e íconos", () => {
    for (const p of ["/login", "/auth/callback", "/auth/signout", "/manifest.webmanifest", "/icon", "/apple-icon", "/icons/192", "/splash/1179x2556-light", "/favicon.ico"]) {
      expect(isPublicPath(p, { playground: false }), p).toBe(true);
    }
  });

  it("exige sesión en el resto", () => {
    for (const p of ["/", "/partidas", "/partidas/abc", "/grupos", "/perfil", "/unirse/ABC123", "/loginx", "/iconsx"]) {
      expect(isPublicPath(p, { playground: false }), p).toBe(false);
    }
  });

  it("el playground solo es público si está habilitado", () => {
    expect(isPublicPath("/dev/playground", { playground: false })).toBe(false);
    expect(isPublicPath("/dev/playground", { playground: true })).toBe(true);
    expect(isPublicPath("/developer", { playground: true })).toBe(false);
  });
});

describe("playgroundEnabled", () => {
  it("siempre en desarrollo; en un build de producción solo en Preview o con GALF_PLAYGROUND=1", () => {
    expect(playgroundEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(playgroundEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(playgroundEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(playgroundEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
    expect(playgroundEnabled({ NODE_ENV: "production", GALF_PLAYGROUND: "1" })).toBe(true);
  });
});
