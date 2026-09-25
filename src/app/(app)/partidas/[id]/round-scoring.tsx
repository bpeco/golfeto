"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoundHole, RoundScorecard } from "@/lib/round-model";
import type { RatingForSign } from "@/lib/sign-estimate";
import { estimateSignature } from "@/lib/sign-estimate";
import { cardTotals, type HoleScore } from "@/lib/scorecard-totals";
import { initialPosition, playedCount, signBlocker } from "@/lib/scorecard-state";
import { saveHoleScore } from "../actions";
import { FocusMode } from "./focus-mode";
import { FullCard } from "./full-card";
import { PhotoFlow } from "./photo-flow";
import { PlayerSwitcher } from "./player-switcher";
import { ScoreBar } from "./score-bar";
import { SignSheet } from "./sign-sheet";
import { useScoresAutosave, type CardScores } from "./use-scores-autosave";

export type ScoringCard = Pick<
  RoundScorecard,
  "id" | "playerId" | "playerName" | "isGuest" | "isLegacy" | "legacyGross" | "signedAt" | "signature" | "scores"
> & {
  /** Hándicap de cancha (de la firma, o estimado con el índice actual). */
  courseHandicap: number | null;
  /** Hándicap efectivo del golfista hoy (para estimar la firma). */
  ownerIndex: number | null;
  isOwner: boolean;
};

export type Position = { position: number; hole: RoundHole };

/**
 * Dueño del estado de la partida: qué tarjeta se mira (?j=, espejado sin navegar), el modo
 * (hoyo a hoyo o tarjeta completa), el hoyo actual y los golpes con guardado automático.
 */
export function RoundScoring({
  roundId,
  courseId,
  positions,
  loops,
  cards,
  initialCardId,
  rating,
  photos,
  saveAction = saveHoleScore,
}: {
  roundId: string;
  courseId: string;
  positions: Position[];
  loops: number;
  cards: ScoringCard[];
  initialCardId: string | undefined;
  rating: RatingForSign | null;
  photos: { id: string; url: string | null }[];
  /** Para el playground: guardado de mentira. */
  saveAction?: typeof saveHoleScore;
}) {
  const router = useRouter();
  const serverScores = useMemo<CardScores>(() => Object.fromEntries(cards.map((c) => [c.id, c.scores])), [cards]);
  const [cardId, setCardId] = useState(initialCardId ?? cards[0]?.id ?? "");
  const [mode, setMode] = useState<"hoyo" | "tarjeta">("hoyo");
  const [position, setPosition] = useState(() => initialPosition(positions, serverScores[initialCardId ?? ""] ?? {}));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [signOpen, setSignOpen] = useState(false);

  const { scores, update, status, dirtyCards, retry, syncFromServer } = useScoresAutosave({
    initial: serverScores,
    holeLabel: (_card, p) => `hoyo ${positions[p - 1]?.hole.number ?? p}`,
    save: (card, p, s) =>
      saveAction({ scorecardId: card, holeId: positions[p - 1].hole.id, position: p, strokes: s.strokes, pickedUp: s.pickedUp }),
  });

  // Después de un refresh (firma, foto) llegan golpes nuevos del servidor.
  useEffect(() => {
    syncFromServer(serverScores);
  }, [serverScores, syncFromServer]);

  const card = cards.find((c) => c.id === cardId) ?? cards[0];
  if (!card) return null;
  const cardScores = scores[card.id] ?? {};
  const locked = !!card.signedAt || card.isLegacy;
  const holesInRound = positions.length === 18 ? 18 : 9;
  const totals = cardTotals(positions, cardScores, { loops, courseHandicap: card.courseHandicap });
  const blocker = signBlocker({
    isOwner: card.isOwner,
    locked,
    hasRating: !!rating,
    dirty: dirtyCards.has(card.id),
    played: playedCount(positions, cardScores),
    holesInRound,
    playerName: card.playerName,
  });

  function selectCard(id: string) {
    setCardId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("j", id);
    window.history.replaceState(window.history.state, "", url);
  }

  function goTo(next: number) {
    if (next < 1 || next > positions.length || next === position) return;
    setDirection(next > position ? 1 : -1);
    setPosition(next);
  }

  function setScore(p: number, s: HoleScore) {
    update(card.id, p, s);
  }

  return (
    <div className="pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <PlayerSwitcher cards={cards} scores={scores} positions={positions} selectedId={card.id} onSelect={selectCard} />

      {mode === "hoyo" ? (
        <FocusMode
          card={card}
          locked={locked}
          positions={positions}
          position={position}
          direction={direction}
          scores={cardScores}
          holesInRound={holesInRound}
          roundId={roundId}
          onGo={goTo}
          onScore={setScore}
          onUnsigned={() => router.refresh()}
        />
      ) : (
        <FullCard
          positions={positions}
          loops={loops}
          cards={cards}
          scores={scores}
          selectedId={card.id}
          position={position}
          onCellTap={(id, p) => {
            selectCard(id);
            setDirection(1);
            setPosition(p);
            setMode("hoyo");
          }}
        />
      )}

      <PhotoFlow
        roundId={roundId}
        holesInRound={positions.length}
        players={cards.map((c) => ({ id: c.id, name: c.playerName, locked: !!c.signedAt || c.isLegacy }))}
        photos={photos}
        onApplied={() => router.refresh()}
      />

      <ScoreBar
        totals={totals}
        legacyGross={card.isLegacy ? card.legacyGross : null}
        courseHandicap={card.courseHandicap}
        status={status}
        onRetry={retry}
        mode={mode}
        onToggleMode={() => setMode(mode === "hoyo" ? "tarjeta" : "hoyo")}
        signState={card.isOwner && !locked ? (blocker ? { disabled: true, reason: blocker.reason === "saving" ? undefined : blocker.message } : { disabled: false }) : null}
        onSign={() => setSignOpen(true)}
        noRatingHref={blocker?.reason === "no-rating" ? `/canchas/${courseId}/editar` : undefined}
      />

      {card.isOwner && !locked && rating && (
        <SignSheet
          open={signOpen}
          onOpenChange={setSignOpen}
          roundId={roundId}
          cardId={card.id}
          estimate={estimateSignature(positions, cardScores, rating, card.ownerIndex)}
          toPar={totals.toPar}
        />
      )}
    </div>
  );
}
