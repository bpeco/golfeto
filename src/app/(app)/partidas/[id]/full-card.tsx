"use client";

import { ScorecardGrid } from "@/components/ui/scorecard-grid";
import type { CardScores } from "./use-scores-autosave";
import type { Position, ScoringCard } from "./round-scoring";

/** La tarjeta completa: todos los jugadores como columnas; tocar una celda abre ese hoyo. */
export function FullCard({
  positions,
  loops,
  cards,
  scores,
  selectedId,
  position,
  onCellTap,
}: {
  positions: Position[];
  loops: number;
  cards: ScoringCard[];
  scores: CardScores;
  selectedId: string;
  position: number;
  onCellTap: (cardId: string, position: number) => void;
}) {
  return (
    <section aria-label="Tarjeta completa" className="mt-4">
      <ScorecardGrid
        mode="scores"
        caption="Tarjeta completa de la partida"
        positions={positions}
        loops={loops}
        columns={cards.map((c) => ({
          id: c.id,
          name: c.playerName,
          scores: scores[c.id] ?? {},
          locked: !!c.signedAt || c.isLegacy,
          legacyGross: c.isLegacy ? c.legacyGross : null,
          courseHandicap: c.courseHandicap,
        }))}
        highlight={{ columnId: selectedId, position }}
        onCellTap={onCellTap}
      />
      <p className="mt-2 text-sm text-muted-foreground">Tocá una celda para anotar ese hoyo. Los puntitos son los golpes que recibe cada uno.</p>
    </section>
  );
}
