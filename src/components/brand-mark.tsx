import { GLYPH_SCALE, RING_PATH, RING_STROKE } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * La marca en la app (login, vacíos): la G en la cara de numerales y el círculo de lapicera.
 * Con `animated`, el círculo se dibuja una vez (CSS, arranca en el primer pintado; nada con
 * "reducir movimiento").
 */
export function BrandMark({ size = 120, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center text-foreground", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden className={cn("absolute inset-0 size-full overflow-visible text-score-under", animated && "reveal-ring")}>
        <path d={RING_PATH} pathLength={1} fill="none" stroke="currentColor" strokeWidth={RING_STROKE} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span aria-hidden className="relative font-display leading-none font-extrabold" style={{ fontSize: size * GLYPH_SCALE, marginTop: size * 0.015 }}>
        G
      </span>
    </span>
  );
}
