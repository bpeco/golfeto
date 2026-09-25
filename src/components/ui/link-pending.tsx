"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Velo que atenúa un link mientras la navegación está pendiente. Va adentro de un <Link>
 * con `relative`. Aparece recién a los 120 ms para no parpadear en navegaciones rápidas.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      data-pending={pending || undefined}
      className={cn(
        "pointer-events-none absolute inset-0 bg-background/55 opacity-0 transition-opacity duration-120",
        pending && "opacity-100 delay-120",
        className,
      )}
    />
  );
}
