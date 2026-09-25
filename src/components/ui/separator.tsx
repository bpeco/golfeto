import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Regla de la tarjeta: horizontal por defecto; `strong` es la regla después del hoyo 9. */
export function Separator({
  className,
  orientation = "horizontal",
  strong = false,
  decorative = true,
  ...props
}: ComponentProps<"div"> & { orientation?: "horizontal" | "vertical"; strong?: boolean; decorative?: boolean }) {
  return (
    <div
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0",
        strong ? "bg-line-strong" : "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
