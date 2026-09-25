"use client";

import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Initials } from "@/components/ui/initials";
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
  // Patrón de pestañas: una sola parada de Tab (la elegida) y las flechas pasan de tarjeta.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = cards.findIndex((c) => c.id === selectedId);
    const next =
      e.key === "ArrowRight" ? (i + 1) % cards.length : e.key === "ArrowLeft" ? (i - 1 + cards.length) % cards.length : e.key === "Home" ? 0 : e.key === "End" ? cards.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(cards[next].id);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }

  return (
    <div role="tablist" aria-label="Tarjeta de" onKeyDown={onKeyDown} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
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
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(c.id)}
            className={cn(
              "flex min-h-tap shrink-0 items-center gap-1.5 rounded-md border pr-3 pl-1.5 text-base font-semibold outline-none",
              "transition-colors duration-120 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground hover:bg-accent",
            )}
          >
            <Initials name={c.playerName} size="sm" className={active ? "bg-background/15 text-background" : undefined} />
            <span className="max-w-28 truncate">{c.playerName}</span>
            <span className={cn("font-display text-lg tabular-nums", gross == null && "opacity-60")}>{gross ?? "—"}</span>
            {(c.signedAt || c.isLegacy) && <Lock aria-label={c.isLegacy ? "histórica" : "firmada"} className="size-3.5 opacity-80" />}
            {c.isGuest && (
              <Badge tone="guest" className={active ? "border-background/50 text-background/80" : undefined}>
                Invitado
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
