import { ImageResponse } from "next/og";
import { BrandArt } from "@/components/brand-art";
import { BRAND_FONT, brandFont } from "@/lib/brand-font";
import { SPLASH_DEVICES, parseSplashSpec, splashSpec } from "@/lib/pwa/devices";
import { THEME_HEX } from "@/lib/theme-colors";

/**
 * Imágenes de arranque de iOS (20 PNG estáticos): la marca centrada sobre papel o pizarra,
 * nada más, como pide Apple (que imite la primera pantalla y no anime).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SPLASH_DEVICES.flatMap((d) => (["light", "dark"] as const).map((theme) => ({ spec: splashSpec(d, theme) })));
}

export async function GET(_request: Request, { params }: RouteContext<"/splash/[spec]">) {
  const parsed = parseSplashSpec((await params).spec);
  if (!parsed) return new Response("No existe", { status: 404 });
  const { width, height, theme } = parsed;
  const dark = theme === "dark";
  return new ImageResponse(
    <BrandArt
      width={width}
      height={height}
      mark={Math.round(width * 0.36)}
      background={dark ? THEME_HEX.pizarra : THEME_HEX.papel}
      glyph={dark ? THEME_HEX.papel : THEME_HEX.tinta}
      ring={dark ? THEME_HEX.rojoClaro : THEME_HEX.rojo}
      fontFamily={BRAND_FONT}
    />,
    { width, height, fonts: await brandFont() },
  );
}
