/**
 * Pantallas de iPhone para las imágenes de arranque (apple-touch-startup-image): iOS solo usa
 * la que coincide exacto con ancho, alto y densidad del dispositivo. Solo vertical (la app
 * está fijada en portrait). Agregar acá cuando salga un tamaño nuevo.
 */
export type SplashDevice = { width: number; height: number; dpr: 2 | 3 };

export const SPLASH_DEVICES: SplashDevice[] = [
  { width: 375, height: 667, dpr: 2 }, // SE 2/3, 8
  { width: 414, height: 896, dpr: 2 }, // XR, 11
  { width: 360, height: 780, dpr: 3 }, // 12/13 mini
  { width: 375, height: 812, dpr: 3 }, // X, XS, 11 Pro
  { width: 390, height: 844, dpr: 3 }, // 12, 13, 14
  { width: 393, height: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 402, height: 874, dpr: 3 }, // 16 Pro
  { width: 428, height: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { width: 430, height: 932, dpr: 3 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { width: 440, height: 956, dpr: 3 }, // 16 Pro Max
];

export type SplashTheme = "light" | "dark";

export function splashSpec(d: SplashDevice, theme: SplashTheme) {
  return `${d.width * d.dpr}x${d.height * d.dpr}-${theme}`;
}

export function parseSplashSpec(spec: string): { width: number; height: number; theme: SplashTheme } | null {
  const m = spec.match(/^(\d+)x(\d+)-(light|dark)$/);
  if (!m) return null;
  const [width, height] = [Number(m[1]), Number(m[2])];
  const known = SPLASH_DEVICES.some((d) => d.width * d.dpr === width && d.height * d.dpr === height);
  return known ? { width, height, theme: m[3] as SplashTheme } : null;
}

/** Entradas para metadata.appleWebApp.startupImage. */
export function startupImages() {
  return SPLASH_DEVICES.flatMap((d) =>
    (["light", "dark"] as const).map((theme) => ({
      url: `/splash/${splashSpec(d, theme)}`,
      media: `(device-width: ${d.width}px) and (device-height: ${d.height}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
    })),
  );
}
