import { cn } from "@/lib/utils";

/**
 * Base de todos los controles de texto: 44 px, 16 px de letra (iOS no hace zoom), error en rojo.
 * En un módulo sin "use client" para poder usarla también desde Server Components.
 */
export const controlClass = cn(
  "w-full min-w-0 rounded-sm border border-input bg-card text-base text-foreground",
  "placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-120",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
);
