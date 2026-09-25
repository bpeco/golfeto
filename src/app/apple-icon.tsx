import { ImageResponse } from "next/og";
import { BrandArt } from "@/components/brand-art";
import { BRAND_FONT, brandFont } from "@/lib/brand-font";
import { THEME_HEX } from "@/lib/theme-colors";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícono de "Agregar a inicio" en iOS: opaco y cuadrado (iOS le pone las esquinas). */
export default async function AppleIcon() {
  return new ImageResponse(
    <BrandArt width={180} height={180} mark={138} background={THEME_HEX.board} glyph={THEME_HEX.papel} ring={THEME_HEX.rojoClaro} fontFamily={BRAND_FONT} />,
    { ...size, fonts: await brandFont() },
  );
}
