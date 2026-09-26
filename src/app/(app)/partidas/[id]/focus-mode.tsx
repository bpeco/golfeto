"use client";

import { useRef, useTransition } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ScoreMark } from "@/components/ui/score-mark";
import { Stepper } from "@/components/ui/stepper";
import { StrokeDots } from "@/components/ui/stroke-dots";
import { useConfirm } from "@/components/ui/use-confirm";
import { strokesOnHole } from "@/lib/handicap/course";
import { fmtDecimal, fmtIndex } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { notationLabel } from "@/lib/score-notation";
import type { HoleScore } from "@/lib/scorecard-totals";
import { cn } from "@/lib/utils";
import { unsignScorecard } from "../actions";
import type { Position, ScoringCard } from "./round-scoring";

/**
 * Hoyo a hoyo: el hoyo, los golpes que recibe el jugador, el numeral grande con su marca sobre
 * el stepper de 56 px, "No terminé el hoyo" y la tira de hoyos. Deslizar a los costados cambia
 * de hoyo. Las tarjetas firmadas o históricas se ven, no se tocan.
 */
export function FocusMode({
  card,
  locked,
  positions,
  position,
  direction,
  scores,
  holesInRound,
  roundId,
  onGo,
  onScore,
  onUnsigned,
}: {
  card: ScoringCard;
  locked: boolean;
  positions: Position[];
  position: number;
  /** Hacia dónde se movió el usuario por última vez; 0 = recién abierta (no desliza). */
  direction: -1 | 0 | 1;
  scores: Record<number, HoleScore>;
  holesInRound: number;
  roundId: string;
  onGo: (position: number) => void;
  onScore: (position: number, score: HoleScore) => void;
  onUnsigned: () => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const { hole } = positions[position - 1];
  const s = scores[position];
  const received = card.courseHandicap != null && hole.strokeIndex != null ? strokesOnHole(card.courseHandicap, hole.strokeIndex, holesInRound) : 0;
  const loop = positions.length === 18 && positions[9]?.hole.number === 1 ? (position > 9 ? 2 : 1) : null;

  return (
    <section aria-label={`Hoyo ${hole.number}`} className="mt-4">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-numeral-lg font-bold">
            Hoyo {hole.number}
            {loop && <span className="ml-2 align-middle font-sans text-sm font-semibold text-muted-foreground">{loop}.ª vuelta</span>}
          </h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-base text-muted-foreground">
            <span>
              Par <strong className="text-foreground">{hole.par}</strong>
            </span>
            <span>
              <abbr title="Hándicap de hoyo" className="no-underline">
                Hcp
              </abbr>{" "}
              <strong className="text-foreground">{hole.strokeIndex ?? "—"}</strong>
            </span>
            {hole.meters != null && <span>{hole.meters} m</span>}
          </p>
        </div>
        <div className="-mr-2 flex shrink-0">
          <Button variant="ghost" size="icon" aria-label="Hoyo anterior" disabled={position === 1} onClick={() => onGo(position - 1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Hoyo siguiente" disabled={position === positions.length} onClick={() => onGo(position + 1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mt-1 min-h-6">{received !== 0 && <StrokeDots count={received} withText />}</div>

      <div
        className="touch-pan-y"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onGo(position + (dx < 0 ? 1 : -1));
        }}
      >
        <div key={position} className={cn("mt-4", direction === 1 && "hole-in-next", direction === -1 && "hole-in-prev")}>
          {card.isLegacy ? (
            <LockedHole title="Tarjeta histórica" body={`Total ${card.legacyGross ?? "—"} golpes, sin detalle por hoyo.`} />
          ) : locked ? (
            <SignedHole card={card} score={s} par={hole.par} roundId={roundId} onUnsigned={onUnsigned} />
          ) : (
            <>
              <Stepper
                size="lg"
                label={`Golpes de ${card.playerName} en el hoyo ${hole.number}`}
                value={s?.pickedUp ? null : (s?.strokes ?? null)}
                emptyValue={hole.par}
                disabled={s?.pickedUp}
                onChange={(v) => onScore(position, { strokes: v, pickedUp: false })}
              >
                <ScoreMark strokes={s?.strokes} par={hole.par} pickedUp={s?.pickedUp} size="lg" animate />
              </Stepper>
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  aria-pressed={!!s?.pickedUp}
                  className={cn(s?.pickedUp && "bg-warn/25 hover:bg-warn/30")}
                  onClick={() => {
                    haptics.warn();
                    onScore(position, s?.pickedUp ? { strokes: null, pickedUp: false } : { strokes: null, pickedUp: true });
                  }}
                >
                  No terminé el hoyo
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <HoleStrip positions={positions} scores={scores} current={position} onPick={onGo} label={`Hoyos de ${card.playerName}`} />
    </section>
  );
}

function LockedHole({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-muted px-4 py-3">
      <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

function SignedHole({ card, score, par, roundId, onUnsigned }: { card: ScoringCard; score?: HoleScore; par: number; roundId: string; onUnsigned: () => void }) {
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const sig = card.signature;

  async function unsign() {
    const res = await confirm({
      title: "¿Desfirmar tu tarjeta?",
      body: "Deja de contar para tu hándicap hasta que la vuelvas a firmar. Queda registrado el motivo.",
      confirmLabel: "Desfirmar",
      tone: "destructive",
      reason: { label: "Motivo (opcional)", placeholder: "Me equivoqué en el hoyo 7" },
    });
    if (!res.ok) return;
    start(async () => {
      const r = await unsignScorecard(roundId, card.id, res.reason);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast("Desfirmada", { description: r.data.indexAfter != null ? `Tu Hándicap Index vuelve a ${fmtIndex(r.data.indexAfter)}.` : undefined });
      onUnsigned();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-center">
        <ScoreMark strokes={score?.strokes} par={par} pickedUp={score?.pickedUp} size="lg" />
      </div>
      <LockedHole
        title={card.isOwner ? "Firmaste esta tarjeta" : `${card.playerName} ya firmó`}
        body={
          sig
            ? `Gross ${sig.gross}, ajustado ${sig.adjustedGross}, hándicap de cancha ${sig.courseHandicap}, diferencial ${fmtDecimal(sig.differential)}.`
            : "La tarjeta firmada no se puede cambiar."
        }
        action={
          card.isOwner ? (
            <Button variant="secondary" size="sm" pending={pending} pendingLabel="Desfirmando…" onClick={unsign}>
              Desfirmar
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

/**
 * La tira de hoyos como en la tarjeta: dos filas (Ida / Vuelta) de 9, los golpes debajo del
 * número con la marca de la tarjeta de papel (círculo birdie, cuadrado bogey…). El hoyo actual
 * se marca con un recuadro, no invirtiendo la celda, para que las marcas conserven su color.
 */
function HoleStrip({
  positions,
  scores,
  current,
  onPick,
  label,
}: {
  positions: Position[];
  scores: Record<number, HoleScore>;
  current: number;
  onPick: (p: number) => void;
  label: string;
}) {
  return (
    // De borde a borde (-mx-4): con 9 columnas es la única forma de acercarse a los 44 px de ancho
    // por hoyo en un teléfono de 390 px (43 px; 48 px en los de 430).
    <div role="group" aria-label={label} className="-mx-4 mt-6 grid grid-cols-9 border-t border-border">
      {positions.map(({ position, hole }) => {
        const s = scores[position];
        const active = position === current;
        return (
          <button
            key={position}
            type="button"
            onClick={() => onPick(position)}
            aria-current={active ? "step" : undefined}
            aria-label={`Hoyo ${hole.number}, ${notationLabel(s?.strokes, hole.par, s?.pickedUp).toLowerCase()}`}
            className={cn(
              "relative flex h-15 flex-col items-center justify-center gap-0.5 border-b border-border leading-none outline-none",
              "transition-colors duration-150 active:bg-accent motion-reduce:transition-none",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              position % 9 !== 0 && "border-r",
              active ? "ring-2 ring-foreground ring-inset" : "hover:bg-accent",
            )}
          >
            <span className={cn("text-xs", active ? "font-bold text-foreground" : "text-muted-foreground")}>{hole.number}</span>
            {s?.strokes == null && !s?.pickedUp ? (
              <span aria-hidden className="flex size-7 items-center justify-center font-display text-base text-muted-foreground">
                ·
              </span>
            ) : (
              <ScoreMark strokes={s.strokes} par={hole.par} pickedUp={s.pickedUp} size="xs" />
            )}
          </button>
        );
      })}
    </div>
  );
}
