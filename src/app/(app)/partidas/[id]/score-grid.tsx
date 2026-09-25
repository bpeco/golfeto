"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/legacy";
import type { RoundDetail, RoundScorecard } from "@/lib/db/rounds";
import { strokesOnHole } from "@/lib/handicap/course";
import { saveHoleScore, signScorecard, unsignScorecard } from "../actions";

type Score = { strokes: number | null; pickedUp: boolean };

export function ScoreGrid({
  round,
  card,
  isOwner,
  courseHcp,
}: {
  round: RoundDetail;
  card: RoundScorecard;
  isOwner: boolean;
  /** Hándicap de cancha estimado para mostrar neto en vivo; null si no hay rating o índice. */
  courseHcp: number | null;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<number, Score>>(card.scores);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(0);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const locked = !!card.signedAt || card.isLegacy;

  function update(position: number, holeId: string, next: Score) {
    setScores((s) => ({ ...s, [position]: next }));
    clearTimeout(timers.current[position]);
    timers.current[position] = setTimeout(async () => {
      setSaving((n) => n + 1);
      const r = await saveHoleScore({ scorecardId: card.id, holeId, position, strokes: next.strokes, pickedUp: next.pickedUp });
      setSaving((n) => n - 1);
      if (r.error) setError(r.error);
    }, 400);
  }

  const holesInRound = round.positions.length;
  let gross = 0;
  let played = 0;
  let toPar = 0;
  for (const { position, hole } of round.positions) {
    const s = scores[position];
    if (s?.strokes != null) {
      gross += s.strokes;
      played += 1;
      toPar += s.strokes - hole.par;
    }
  }
  const net = courseHcp != null && played === holesInRound ? gross - courseHcp : null;

  return (
    <div className="space-y-3">
      <ErrorBanner message={error} />
      {card.isLegacy ? (
        <p className="rounded-xl bg-background px-3 py-2 text-sm">
          Tarjeta histórica: total {card.legacyGross} golpes, sin detalle por hoyo.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Hoyo</th>
                <th className="px-1 py-2">Par</th>
                <th className="px-1 py-2">Hcp</th>
                <th className="px-1 py-2">Golpes</th>
                <th className="px-1 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {round.positions.map(({ position, hole }) => {
                const s = scores[position] ?? { strokes: null, pickedUp: false };
                const received = courseHcp != null && hole.strokeIndex != null ? strokesOnHole(courseHcp, hole.strokeIndex, holesInRound) : 0;
                const diff = s.strokes != null ? s.strokes - hole.par : null;
                return (
                  <tr key={position} className={`border-t border-border ${position === 10 && holesInRound === 18 ? "border-t-2" : ""}`}>
                    <td className="px-2 py-1">
                      <span className="font-medium">{hole.number}</span>
                      {round.loops === 2 && <span className="ml-1 text-xs text-muted-foreground">v{position > 9 ? 2 : 1}</span>}
                      {hole.meters != null && <span className="ml-1 text-xs text-muted-foreground">{hole.meters}m</span>}
                    </td>
                    <td className="px-1 py-1 text-center text-muted-foreground">{hole.par}</td>
                    <td className="px-1 py-1 text-center text-muted-foreground">
                      {hole.strokeIndex ?? "—"}
                      {received > 0 && <span className="text-primary">{"•".repeat(received)}</span>}
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={locked || s.pickedUp}
                          className="h-8 w-8 rounded-full border border-border text-lg leading-none disabled:opacity-30"
                          onClick={() => update(position, hole.id, { strokes: Math.max(1, (s.strokes ?? hole.par + 1) - 1), pickedUp: false })}
                        >
                          −
                        </button>
                        <span className={`w-8 text-center text-lg font-bold tabular-nums ${scoreColor(diff)}`}>
                          {s.pickedUp ? "X" : s.strokes ?? "·"}
                        </span>
                        <button
                          type="button"
                          disabled={locked || s.pickedUp}
                          className="h-8 w-8 rounded-full border border-border text-lg leading-none disabled:opacity-30"
                          onClick={() => update(position, hole.id, { strokes: (s.strokes ?? hole.par - 1) + 1, pickedUp: false })}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        disabled={locked}
                        title="No terminó el hoyo"
                        className={`rounded-md px-1.5 py-0.5 text-xs ${s.pickedUp ? "bg-warn/25 text-warn-foreground" : "text-muted-foreground"} disabled:opacity-30`}
                        onClick={() => update(position, hole.id, s.pickedUp ? { strokes: null, pickedUp: false } : { strokes: null, pickedUp: true })}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-background font-semibold">
              <tr>
                <td className="px-2 py-2" colSpan={3}>
                  Gross {played < holesInRound ? `(${played}/${holesInRound})` : ""}
                </td>
                <td className="px-1 py-2 text-center text-lg tabular-nums">{played ? gross : "·"}</td>
                <td className="px-1 py-2 text-center text-xs text-muted-foreground">{played ? (toPar > 0 ? `+${toPar}` : toPar) : ""}</td>
              </tr>
              {courseHcp != null && (
                <tr className="border-t border-border">
                  <td className="px-2 py-2 text-sm" colSpan={3}>Neto (hcp de cancha {courseHcp})</td>
                  <td className="px-1 py-2 text-center text-lg tabular-nums">{net ?? "·"}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}

      {card.signedAt ? (
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold">Firmada</p>
            {card.signature && (
              <p className="text-xs text-muted-foreground">
                Gross {card.signature.gross} · ajustado {card.signature.adjustedGross} · hcp cancha {card.signature.courseHandicap} · diferencial {card.signature.differential.toFixed(1)}
              </p>
            )}
          </div>
          {isOwner && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await unsignScorecard(round.id, card.id);
                  if (r.error) setError(r.error);
                  else router.refresh();
                })
              }
            >
              Desfirmar
            </Button>
          )}
        </div>
      ) : isOwner ? (
        <Button
          className="w-full"
          disabled={pending || saving > 0}
          onClick={() =>
            start(async () => {
              const r = await signScorecard(round.id, card.id);
              if (r.error) setError(r.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Firmando…" : "Firmar mi tarjeta"}
        </Button>
      ) : (
        <p className="text-center text-xs text-muted-foreground">Solo {card.playerName} puede firmar esta tarjeta.</p>
      )}
    </div>
  );
}

function scoreColor(diff: number | null) {
  if (diff == null) return "";
  if (diff <= -2) return "text-score-under";
  if (diff === -1) return "text-score-under";
  if (diff === 0) return "";
  if (diff === 1) return "text-score-over";
  return "text-score-over";
}
