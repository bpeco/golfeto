"use client";

import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";
import { controlClass } from "./control-class";

/**
 * Select nativo con la piel del sistema. En el teléfono abre el selector del sistema operativo
 * (rueda en iOS, lista en Android): más rápido con una mano que un popup propio, y accesible gratis.
 */
export function Select({ className, children, size = "default", ...props }: Omit<ComponentProps<"select">, "size"> & { size?: "default" | "sm" }) {
  const a11y = useFieldControl(props);
  return (
    <div data-slot="select" className={cn("relative", size === "sm" ? "w-auto" : "w-full", className)}>
      <select
        className={cn(controlClass, "appearance-none pr-9", size === "sm" ? "h-9 pl-2 text-base" : "h-tap pl-3")}
        {...props}
        {...a11y}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
