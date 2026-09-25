import { ImageResponse } from "next/og";
import { BrandArt } from "@/components/brand-art";
import { BRAND_FONT, brandFont } from "@/lib/brand-font";
import { THEME_HEX } from "@/lib/theme-colors";

/**
 * Íconos del manifest, estáticos en el build: 192 y 512 ("any") y sus versiones maskable
 * (la marca dentro del 80 % central que Android no recorta).
 */
const ICONS = {
  "192": { size: 192, mark: 158 },
  "512": { size: 512, mark: 420 },
  "maskable-192": { size: 192, mark: 124 },
  "maskable-512": { size: 512, mark: 330 },
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name as keyof typeof ICONS];
  if (!icon) return new Response("No existe", { status: 404 });
  return new ImageResponse(
    <BrandArt
      width={icon.size}
      height={icon.size}
      mark={icon.mark}
      background={THEME_HEX.board}
      glyph={THEME_HEX.papel}
      ring={THEME_HEX.rojoClaro}
      fontFamily={BRAND_FONT}
    />,
    { width: icon.size, height: icon.size, fonts: await brandFont() },
  );
}
