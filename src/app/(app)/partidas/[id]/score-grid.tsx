"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SaveStatus } from "@/components/ui/save-status";
import { ScoreMark } from "@/components/ui/score-mark";
import { StrokeDots } from "@/components/ui/stroke-dots";
import { useConfirm } from "@/components/ui/use-confirm";
import type { RoundDetail, RoundScorecard } from "@/lib/round-model";
import { strokesOnHole } from "@/lib/handicap/course";
import { cardTotals } from "@/lib/scorecard-totals";
import { estimateSignature, type RatingForSign } from "@/lib/sign-estimate";
import { fmtIndex, fmtToPar } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { saveHoleScore, unsignScorecard } from "../actions";
import { SignSheet } from "./sign-sheet";
import { useHoleAutosave } from "./use-hole-autosave";

/** TEMPORAL (Fase 3): grilla de la Fase 1 con el feedback nuevo; la reemplaza el modo foco de la Fase 5. */
export function ScoreGrid({
  round,
  card,
  isOwner,
  courseHcp,
  rating,
  ownerIndex,
}: {
  round: RoundDetail;
  card: RoundScorecard;
  isOwner: boolean;
  /** Hándicap de cancha estimado para mostrar neto en vivo; null si no hay rating o índice. */
  courseHcp: number | null;
  rating: RatingForSign | null;
  ownerIndex: number | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [signOpen, setSignOpen] = useState(false);
  const locked = !!card.signedAt || card.isLegacy;
  const holeNumber = (position: number) => round.positions[position - 1]?.hole.number ?? position;
  const { scores, update, status, dirty, retry } = useHoleAutosave({
    initial: card.scores,
    holeLabel: (p) => `hoyo ${holeNumber(p)}`,
    save: (position, s) =>
      saveHoleScore({ scorecardId: card.id, holeId: round.positions[position - 1].hole.id, position, strokes: s.strokes, pickedUp: s.pickedUp }),
  });

  const holesInRound = round.positions.length;
  const totals = cardTotals(round.positions, scores, { loops: round.loops, courseHandicap: courseHcp });

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
      const r = await unsignScorecard(round.id, card.id, res.reason);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast("Desfirmada", { description: r.data.indexAfter != null ? `Tu Hándicap Index vuelve a ${fmtIndex(r.data.indexAfter)}.` : undefined });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {card.isLegacy ? (
        <Notice tone="info">Tarjeta histórica: total {card.legacyGross} golpes, sin detalle por hoyo.</Notice>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b-2 border-line-strong text-sm text-muted-foreground">
                <th className="h-10 px-1 text-left font-semibold">Hoyo</th>
                <th className="px-1 font-semibold">Par</th>
                <th className="px-1 font-semibold">Hcp</th>
                <th className="px-1 font-semibold">Golpes</th>
                <th className="px-1 font-semibold">
                  <span className="sr-only">No terminado</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {round.positions.map(({ position, hole }) => {
                const s = scores[position] ?? { strokes: null, pickedUp: false };
                const received = courseHcp != null && hole.strokeIndex != null ? strokesOnHole(courseHcp, hole.strokeIndex, holesInRound) : 0;
                return (
                  <tr key={position} className={position === 10 && holesInRound === 18 ? "border-t-2 border-line-strong" : "border-t border-border"}>
                    <td className="px-1 font-display text-lg font-bold">{hole.number}</td>
                    <td className="px-1 text-center text-muted-foreground">{hole.par}</td>
                    <td className="px-1 text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {hole.strokeIndex ?? "—"}
                        <StrokeDots count={received} />
                      </span>
                    </td>
                    <td className="px-1">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Un golpe menos en el hoyo ${hole.number}`}
                          disabled={locked || s.pickedUp || (s.strokes ?? 2) <= 1}
                          onClick={() => {
                            haptics.tap();
                            update(position, { strokes: Math.max(1, (s.strokes ?? hole.par + 1) - 1), pickedUp: false });
                          }}
                        >
                          <Minus />
                        </Button>
                        <ScoreMark strokes={s.strokes} par={hole.par} pickedUp={s.pickedUp} size="sm" animate />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Un golpe más en el hoyo ${hole.number}`}
                          disabled={locked || s.pickedUp || (s.strokes ?? 0) >= 20}
                          onClick={() => {
                            haptics.tap();
                            update(position, { strokes: (s.strokes ?? hole.par - 1) + 1, pickedUp: false });
                          }}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </td>
                    <td className="px-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-pressed={s.pickedUp}
                        aria-label={`No terminé el hoyo ${hole.number}`}
                        disabled={locked}
                        className={s.pickedUp ? "bg-warn/25" : "text-muted-foreground"}
                        onClick={() => {
                          haptics.warn();
                          update(position, s.pickedUp ? { strokes: null, pickedUp: false } : { strokes: null, pickedUp: true });
                        }}
                      >
                        /
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!card.isLegacy && (
        <div className="flex items-baseline justify-between border-t-2 border-line-strong pt-3">
          <p className="text-base">
            Gross <strong className="font-display text-2xl tabular-nums">{totals.withStrokes ? totals.gross : "—"}</strong>{" "}
            {totals.withStrokes > 0 && <span className={totals.toPar > 0 ? "text-score-over" : totals.toPar < 0 ? "text-score-under" : "text-muted-foreground"}>({fmtToPar(totals.toPar)})</span>}
            <span className="ml-3 text-sm text-muted-foreground">{totals.net != null ? `Neto ${totals.net}` : courseHcp != null ? "Neto al terminar" : ""}</span>
          </p>
          <SaveStatus state={status} onRetry={retry} />
        </div>
      )}

      {card.signedAt ? (
        <Notice
          tone="success"
          title="Firmada"
          action={
            isOwner ? (
              <Button variant="secondary" size="sm" pending={pending} onClick={unsign}>
                Desfirmar
              </Button>
            ) : undefined
          }
        >
          {card.signature && `Gross ${card.signature.gross}, ajustado ${card.signature.adjustedGross}, hándicap de cancha ${card.signature.courseHandicap}, diferencial ${card.signature.differential.toFixed(1).replace(".", ",")}`}
        </Notice>
      ) : isOwner ? (
        rating ? (
          <>
            <Button size="lg" className="w-full" disabled={dirty} onClick={() => setSignOpen(true)}>
              {dirty ? "Guardando…" : "Firmar mi tarjeta"}
            </Button>
            <SignSheet
              open={signOpen}
              onOpenChange={setSignOpen}
              roundId={round.id}
              cardId={card.id}
              estimate={estimateSignature(round.positions, scores, rating, ownerIndex)}
              toPar={totals.toPar}
            />
          </>
        ) : (
          <Notice tone="warn" title="Sin rating">
            Cargá CR y Slope del tee en la cancha para poder firmar.
          </Notice>
        )
      ) : (
        <p className="text-center text-sm text-muted-foreground">Solo {card.playerName} puede firmar esta tarjeta.</p>
      )}
    </div>
  );
}
