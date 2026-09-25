"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * − valor +. En `lg` los botones son de 56 px (zona del pulgar). Sin valor, cualquiera de los
 * dos botones pone `emptyValue` (en la partida, el par del hoyo). Teclado: flechas y +/−.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 30, // el tope de la base (y de la foto)
  emptyValue,
  disabled = false,
  size = "md",
  label,
  decrementLabel = "Un golpe menos",
  incrementLabel = "Un golpe más",
  children,
  className,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  emptyValue?: number;
  disabled?: boolean;
  size?: "md" | "lg";
  label: string;
  decrementLabel?: string;
  incrementLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const start = emptyValue ?? min;
  const canDec = !disabled && (value == null || value > min);
  const canInc = !disabled && (value == null || value < max);

  function step(delta: 1 | -1) {
    if (delta < 0 ? !canDec : !canInc) return;
    haptics.tap();
    onChange(value == null ? start : Math.min(max, Math.max(min, value + delta)));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowRight", "+", "="].includes(e.key)) {
      e.preventDefault();
      step(1);
    } else if (["ArrowDown", "ArrowLeft", "-"].includes(e.key)) {
      e.preventDefault();
      step(-1);
    }
  }

  const button = cn(
    "flex shrink-0 items-center justify-center rounded-full border-2 border-foreground/80 bg-card text-foreground",
    "transition-[transform,background-color] duration-120 ease-out active:scale-[0.94] active:bg-accent motion-reduce:active:scale-100",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "aria-disabled:border-border aria-disabled:text-muted-foreground aria-disabled:opacity-60 aria-disabled:active:scale-100 aria-disabled:active:bg-card",
    size === "lg" ? "size-thumb [&_svg]:size-7" : "size-tap [&_svg]:size-5",
  );

  return (
    <div role="group" aria-label={label} onKeyDown={onKeyDown} className={cn("flex items-center justify-between gap-4", className)}>
      {/* aria-disabled y no disabled: al llegar al tope el botón conserva el foco del teclado. */}
      <button type="button" className={button} aria-disabled={!canDec} aria-label={decrementLabel} onClick={() => step(-1)}>
        <Minus aria-hidden strokeWidth={2.5} />
      </button>
      <div aria-live="polite" className="flex min-w-0 flex-1 items-center justify-center">
        {children}
      </div>
      <button type="button" className={button} aria-disabled={!canInc} aria-label={incrementLabel} onClick={() => step(1)}>
        <Plus aria-hidden strokeWidth={2.5} />
      </button>
    </div>
  );
}
