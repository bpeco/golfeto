import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Bloque de carga: pulso lento de dos tonos, sin shimmer. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse-slow rounded-sm bg-muted motion-reduce:animate-none", className)} {...props} />;
}
