"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

/**
 * Celda numérica de 44 px para grillas (distancias, hándicap de hoyo, revisión de la foto).
 * `uncertain` la marca con un anillo ámbar punteado: el modelo no estaba seguro de ese número.
 */
export function CellInput({
  className,
  uncertain = false,
  ...props
}: ComponentProps<"input"> & { uncertain?: boolean }) {
  const a11y = useFieldControl(props);
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      data-uncertain={uncertain || undefined}
      className={cn(
        "h-tap w-full min-w-0 rounded-sm border border-input bg-card px-1 text-center font-display text-lg font-bold tabular-nums",
        "outline-none transition-[border-color,box-shadow] duration-120 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        "data-uncertain:border-dashed data-uncertain:border-warn-ink data-uncertain:bg-warn/15",
        className,
      )}
      {...props}
      {...a11y}
    />
  );
}
