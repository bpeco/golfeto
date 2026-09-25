"use client";

import { Check, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Estado del guardado automático de golpes. Se anuncia sin robar el foco. */
export function SaveStatus({ state, onRetry, className }: { state: SaveState; onRetry?: () => void; className?: string }) {
  return (
    <span aria-live="polite" className={cn("inline-flex min-h-6 items-center gap-1.5 text-sm", className)}>
      {state === "saving" && (
        <>
          <Spinner className="size-3.5" label="Guardando" />
          <span className="text-muted-foreground">Guardando…</span>
        </>
      )}
      {state === "saved" && (
        <>
          <Check aria-hidden className="size-4 text-primary" strokeWidth={3} />
          <span className="text-muted-foreground">Guardado</span>
        </>
      )}
      {state === "error" && (
        <>
          <CloudOff aria-hidden className="size-4 text-destructive" />
          <span className="text-destructive">No se guardó</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="ml-1 min-h-tap rounded-sm px-1 font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Reintentar
            </button>
          )}
        </>
      )}
    </span>
  );
}
