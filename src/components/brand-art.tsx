import { GLYPH_SCALE, RING_PATH, RING_STROKE } from "@/lib/brand";

/**
 * La marca para ImageResponse (íconos y splash): solo estilos en línea y flex (lo que entiende
 * satori). `mark` es el lado del cuadro de la marca dentro del lienzo.
 */
export function BrandArt({
  width,
  height,
  mark,
  background,
  glyph,
  ring,
  fontFamily,
}: {
  width: number;
  height: number;
  mark: number;
  background: string;
  glyph: string;
  ring: string;
  fontFamily: string;
}) {
  return (
    <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", background }}>
      <div style={{ width: mark, height: mark, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={mark} height={mark} viewBox="0 0 100 100" style={{ position: "absolute", top: 0, left: 0 }}>
          <path d={RING_PATH} fill="none" stroke={ring} strokeWidth={RING_STROKE} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          style={{
            display: "flex",
            fontFamily,
            fontWeight: 800,
            fontSize: mark * GLYPH_SCALE,
            lineHeight: 1,
            color: glyph,
            // La G de esta cara queda un poco alta con line-height 1: se compensa.
            marginTop: mark * 0.015,
          }}
        >
          G
        </div>
      </div>
    </div>
  );
}
