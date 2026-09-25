"use client";

import type { ReactNode } from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cn } from "@/lib/utils";

/** Grupo segmentado con reglas (como las columnas de la tarjeta), no píldoras sueltas. */
export function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex w-full divide-x divide-input overflow-hidden rounded-md border border-input bg-card", className)}
      {...props}
    />
  );
}

export function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "flex min-h-tap flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground",
        "transition-colors duration-120 outline-none select-none",
        "hover:bg-accent focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        "data-pressed:bg-foreground data-pressed:text-background",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Un solo valor elegido (el caso común). El grupo de Base UI permite "des-apretar" el ítem
 * activo y quedar vacío; acá eso se ignora: siempre hay uno elegido.
 */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  disabled,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      disabled={disabled}
      onValueChange={(next) => {
        const picked = next.find((v) => v !== value) ?? next[0];
        if (picked) onValueChange(picked as T);
      }}
      className={className}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
