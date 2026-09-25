import { cn } from "@/lib/utils";

/**
 * Golpes recibidos en un hoyo, como los puntitos que se marcan en la tarjeta: 1–3 puntos,
 * "×4" desde cuatro. Negativos (hándicap plus: da golpes) van huecos.
 */
export function StrokeDots({ count, className, withText = false }: { count: number; className?: string; withText?: boolean }) {
  if (count === 0) return null;
  const n = Math.abs(count);
  const gives = count < 0;
  const text = gives ? `Das ${n} ${n === 1 ? "golpe" : "golpes"}` : `Recibís ${n} ${n === 1 ? "golpe" : "golpes"}`;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span role="img" aria-label={text} className="inline-flex items-center gap-0.5">
        {n <= 3 ? (
          Array.from({ length: n }, (_, i) => (
            <span key={i} aria-hidden className={cn("size-1.5 rounded-full", gives ? "ring-1 ring-foreground" : "bg-foreground")} />
          ))
        ) : (
          <>
            <span aria-hidden className={cn("size-1.5 rounded-full", gives ? "ring-1 ring-foreground" : "bg-foreground")} />
            <span aria-hidden className="text-xs font-semibold tabular-nums">×{n}</span>
          </>
        )}
      </span>
      {withText && <span className="text-sm text-muted-foreground">{text}</span>}
    </span>
  );
}
