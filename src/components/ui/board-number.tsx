"use client";

import NumberFlow from "@number-flow/react";
import { fmtIndex, fmtToPar, MINUS } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  md: "text-numeral",
  lg: "text-numeral-lg",
  xl: "text-numeral-xl",
} as const;

/**
 * Numeral de pizarra (cara condensada, tabular). `kind`:
 * - index: Hándicap Index con coma ("21,3"; los plus con "+").
 * - int: entero (gross, puesto).
 * - toPar: "E", "+3", "−2", coloreado bajo/sobre par salvo que se fije `tone`.
 * Con `animate`, rueda de un valor al siguiente (NumberFlow; respeta "reducir movimiento").
 */
export function BoardNumber({
  value,
  kind = "int",
  size = "lg",
  animate = false,
  tone,
  className,
}: {
  value: number | null | undefined;
  kind?: "index" | "int" | "toPar";
  size?: keyof typeof SIZES;
  animate?: boolean;
  tone?: "auto" | "none";
  className?: string;
}) {
  const autoTone = (tone ?? (kind === "toPar" ? "auto" : "none")) === "auto" && value != null && value !== 0;
  const toneClass = autoTone ? (value! < 0 ? "text-score-under" : "text-score-over") : undefined;
  const base = cn("font-display font-bold tabular-nums leading-none", SIZES[size], toneClass, className);

  if (value == null) return <span className={cn(base, "text-muted-foreground")}>—</span>;

  if (!animate || (kind === "toPar" && value === 0)) {
    const text = kind === "index" ? fmtIndex(value) : kind === "toPar" ? fmtToPar(value) : String(value);
    return <span className={base}>{text}</span>;
  }

  if (kind === "index") {
    return (
      <NumberFlow
        className={base}
        value={Math.abs(value)}
        prefix={value < 0 ? "+" : undefined}
        locales="es-AR"
        format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
      />
    );
  }
  if (kind === "toPar") {
    return <NumberFlow className={base} value={Math.abs(value)} prefix={value > 0 ? "+" : MINUS} />;
  }
  return <NumberFlow className={base} value={value} />;
}
