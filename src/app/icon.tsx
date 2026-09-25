import { ImageResponse } from "next/og";
import { BrandArt } from "@/components/brand-art";
import { BRAND_FONT, brandFont } from "@/lib/brand-font";
import { THEME_HEX } from "@/lib/theme-colors";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Favicon / ícono genérico: la G con el círculo de birdie sobre verde de pizarra. */
export default async function Icon() {
  return new ImageResponse(
    <BrandArt width={512} height={512} mark={420} background={THEME_HEX.board} glyph={THEME_HEX.papel} ring={THEME_HEX.rojoClaro} fontFamily={BRAND_FONT} />,
    { ...size, fonts: await brandFont() },
  );
}
