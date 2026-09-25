"use client";

import { Lock } from "lucide-react";
import { cardTotals } from "@/lib/scorecard-totals";
import { cn } from "@/lib/utils";
import type { CardScores } from "./use-scores-autosave";
import type { Position, ScoringCard } from "./round-scoring";

/**
 * Qué tarjeta se está mirando: una pestaña por jugador con su gross (o —), candado si firmó
 * y "inv." si es invitado. Seleccionar no navega (se espeja en ?j=).
 */
export function PlayerSwitcher({
  cards,
  scores,
  positions,
  selectedId,
  onSelect,
}: {
  cards: ScoringCard[];
  scores: CardScores;
  positions: Position[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Tarjeta de" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {cards.map((c) => {
        const t = cardTotals(positions, scores[c.id] ?? {});
        const gross = c.isLegacy ? c.legacyGross : t.withStrokes > 0 ? t.gross : null;
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(c.id)}
            className={cn(
              "flex min-h-tap shrink-0 items-center gap-1.5 rounded-md border px-3 text-base font-semibold outline-none",
              "transition-colors duration-120 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground hover:bg-accent",
            )}
          >
            <span className="max-w-28 truncate">{c.playerName}</span>
            <span className={cn("font-display text-lg tabular-nums", gross == null && "opacity-60")}>{gross ?? "—"}</span>
            {(c.signedAt || c.isLegacy) && <Lock aria-label={c.isLegacy ? "histórica" : "firmada"} className="size-3.5 opacity-80" />}
            {c.isGuest && <span className="text-xs font-normal opacity-80">inv.</span>}
          </button>
        );
      })}
    </div>
  );
}
