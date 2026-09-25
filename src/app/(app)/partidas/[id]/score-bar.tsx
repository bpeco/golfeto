"use client";

import Link from "next/link";
import { ClipboardList, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { fmtToPar } from "@/lib/format";
import type { CardTotals } from "@/lib/scorecard-totals";
import { cn } from "@/lib/utils";

/**
 * Barra fija arriba de las pestañas: gross y respecto del par, neto (al terminar), el estado
 * del guardado, y las dos acciones de la zona del pulgar: cambiar de modo y firmar.
 */
export function ScoreBar({
  totals,
  legacyGross,
  courseHandicap,
  status,
  onRetry,
  mode,
  onToggleMode,
  signState,
  onSign,
  noRatingHref,
}: {
  totals: CardTotals;
  legacyGross: number | null;
  courseHandicap: number | null;
  status: SaveState;
  onRetry: () => void;
  mode: "hoyo" | "tarjeta";
  onToggleMode: () => void;
  /** null = esta tarjeta no la firma quien mira (o ya está firmada). */
  signState: { disabled: boolean; reason?: string } | null;
  onSign: () => void;
  noRatingHref?: string;
}) {
  const gross = legacyGross ?? (totals.withStrokes > 0 ? totals.gross : null);
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 shadow-raised backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pt-2 pb-3">
        <div className="flex min-h-9 items-center justify-between gap-3" aria-live="polite">
          <p className="flex items-baseline gap-2 text-base">
            <span className="text-muted-foreground">Gross</span>
            <strong className="font-display text-2xl tabular-nums">{gross ?? "—"}</strong>
            {legacyGross == null && totals.withStrokes > 0 && (
              <span className={cn("font-semibold tabular-nums", totals.toPar < 0 ? "text-score-under" : totals.toPar > 0 ? "text-score-over" : "text-muted-foreground")}>
                {fmtToPar(totals.toPar)}
              </span>
            )}
            {legacyGross == null && courseHandicap != null && (
              <span className="ml-1 text-sm text-muted-foreground">{totals.net != null ? `Neto ${totals.net}` : "Neto al terminar"}</span>
            )}
          </p>
          {legacyGross == null && status !== "idle" && <SaveStatus state={status} onRetry={onRetry} />}
        </div>
        <div className={cn("mt-2 grid gap-2", signState ? "grid-cols-2" : "grid-cols-1")}>
          <Button variant="secondary" onClick={onToggleMode}>
            {mode === "hoyo" ? (
              <>
                <Grid3x3 /> Tarjeta completa
              </>
            ) : (
              <>
                <ClipboardList /> Hoyo a hoyo
              </>
            )}
          </Button>
          {signState && (
            <Button disabled={signState.disabled} onClick={onSign}>
              Firmar
            </Button>
          )}
        </div>
        {signState?.reason && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {signState.reason}
            {noRatingHref && (
              <>
                {" "}
                <Link href={noRatingHref} className="font-semibold text-primary underline underline-offset-4">
                  Editar la cancha
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
