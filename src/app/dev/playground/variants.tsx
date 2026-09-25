"use client";

/**
 * PROTOTIPO (Puerta 1): tres variantes de Partida e Inicio con datos de mentira.
 *   A = el brief tal cual (papel + pizarra en el índice) — elegida, provisional
 *   B = más pizarra: fondo oscuro también en modo claro; Partida anota a todos en el hoyo
 *   C = más papel: todo grilla, sin pizarra; Partida abre en la tarjeta completa
 * Se borran B y C cuando el dueño confirme la Puerta 1 (ver DESIGN.md).
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, Ellipsis, Plus, TrendingDown } from "lucide-react";
import { Board, BoardLabel } from "@/components/ui/board";
import { BoardNumber } from "@/components/ui/board-number";
import { Button } from "@/components/ui/button";
import { Initials } from "@/components/ui/initials";
import { Leaderboard } from "@/components/ui/leaderboard";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { RoundRow } from "@/components/ui/round-row";
import { SaveStatus } from "@/components/ui/save-status";
import { ScoreMark } from "@/components/ui/score-mark";
import { ScorecardGrid } from "@/components/ui/scorecard-grid";
import { Section } from "@/components/ui/section";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { StrokeDots } from "@/components/ui/stroke-dots";
import { TeeChip } from "@/components/ui/tee-chip";
import { Badge } from "@/components/ui/badge";
import { strokesOnHole } from "@/lib/handicap/course";
import { cardTotals, type HoleScore } from "@/lib/scorecard-totals";
import { fmtDecimal, fmtIndex, fmtToPar, formatDate } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { ME_ID, courseHandicaps, groups, players, recentRounds, round } from "./fixtures";

type Scores = Record<string, Record<number, HoleScore>>;

function useRoundState() {
  const [scores, setScores] = useState<Scores>(() => Object.fromEntries(round.scorecards.map((c) => [c.id, { ...c.scores }])));
  const set = (cardId: string, position: number, s: HoleScore) => setScores((prev) => ({ ...prev, [cardId]: { ...prev[cardId], [position]: s } }));
  return { scores, set };
}

const me = players.find((p) => p.id === ME_ID)!;
const myHistory = me.handicap.history.filter((p) => p.handicapIndex != null);
const myDelta = myHistory.length >= 2 ? myHistory.at(-1)!.handicapIndex! - myHistory.at(-2)!.handicapIndex! : null;

// ——— Partida ———

export function PartidaVariant({ variant }: { variant: "A" | "B" | "C" }) {
  if (variant === "B") return <PartidaB />;
  if (variant === "C") return <PartidaC />;
  return <PartidaA />;
}

function RoundHeaderMock() {
  return (
    <div className="border-b border-border pb-3">
      <div className="flex min-h-14 items-center gap-2">
        <ChevronLeft aria-hidden className="size-6" />
        <h3 className="flex-1 truncate text-xl font-semibold">{round.course.name}</h3>
        <Ellipsis aria-hidden className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{formatDate(round.playedOn, { year: false })}</span>
        <TeeChip name={round.tee.name} size="sm" className="text-foreground" />
        <span>18 hoyos</span>
        <span>CR {fmtDecimal(round.tee.courseRating!)} / Slope {round.tee.slope}</span>
      </div>
    </div>
  );
}

function PartidaA() {
  const { scores, set } = useRoundState();
  const playable = round.scorecards.filter((c) => !c.isLegacy);
  const [cardId, setCardId] = useState("card-bauti");
  const [position, setPosition] = useState(7);
  const card = round.scorecards.find((c) => c.id === cardId)!;
  const hole = round.positions[position - 1].hole;
  const s = scores[cardId][position];
  const ch = courseHandicaps[cardId];
  const received = ch != null && hole.strokeIndex != null ? strokesOnHole(ch, hole.strokeIndex) : 0;
  const locked = !!card.signedAt;
  const totals = cardTotals(round.positions, scores[cardId], { courseHandicap: ch });

  return (
    <div className="relative pb-40">
      <RoundHeaderMock />
      <div role="tablist" aria-label="Tarjeta" className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4">
        {round.scorecards.map((c) => {
          const t = cardTotals(round.positions, scores[c.id]);
          const active = c.id === cardId;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={active}
              disabled={c.isLegacy}
              onClick={() => setCardId(c.id)}
              className={cn(
                "flex min-h-tap shrink-0 items-center gap-2 rounded-md border px-2.5 text-sm font-semibold",
                active ? "border-foreground bg-foreground text-background" : "border-input text-foreground",
                c.isLegacy && "opacity-60",
              )}
            >
              {c.playerName}
              <span className="font-display text-base tabular-nums">{c.isLegacy ? c.legacyGross : t.withStrokes ? t.gross : "—"}</span>
              {c.isGuest && <span className="text-xs font-normal opacity-80">inv.</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="font-display text-numeral-lg font-bold">Hoyo {hole.number}</p>
          <p className="mt-1 flex gap-4 text-base text-muted-foreground">
            <span>
              Par <strong className="text-foreground">{hole.par}</strong>
            </span>
            <span>
              Hcp <strong className="text-foreground">{hole.strokeIndex}</strong>
            </span>
            <span>{hole.meters} m</span>
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Hoyo anterior" disabled={position === 1} onClick={() => setPosition(position - 1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Hoyo siguiente" disabled={position === 18} onClick={() => setPosition(position + 1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mt-2 min-h-6">{received !== 0 && <StrokeDots count={received} withText />}</div>

      {locked ? (
        <Notice tone="info" className="mt-6" title={`${card.playerName} ya firmó`}>
          La tarjeta firmada no se puede cambiar.
        </Notice>
      ) : (
        <Stepper
          className="mt-6"
          size="lg"
          label={`Golpes de ${card.playerName} en el hoyo ${hole.number}`}
          value={s?.pickedUp ? null : (s?.strokes ?? null)}
          emptyValue={hole.par}
          disabled={s?.pickedUp}
          onChange={(v) => set(cardId, position, { strokes: v, pickedUp: false })}
        >
          <ScoreMark strokes={s?.strokes} par={hole.par} pickedUp={s?.pickedUp} size="lg" animate />
        </Stepper>
      )}
      {!locked && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            className={cn(s?.pickedUp && "bg-warn/20")}
            aria-pressed={!!s?.pickedUp}
            onClick={() => {
              haptics.warn();
              set(cardId, position, s?.pickedUp ? { strokes: null, pickedUp: false } : { strokes: null, pickedUp: true });
            }}
          >
            No terminé el hoyo
          </Button>
        </div>
      )}

      <HoleStrip
        className="mt-6"
        scores={scores[cardId]}
        current={position}
        onPick={setPosition}
        label={`Hoyos de ${playable.find((c) => c.id === cardId)?.playerName ?? card.playerName}`}
      />

      <div className="absolute inset-x-0 bottom-0 -mx-4 border-t border-border bg-background/95 px-4 pt-3 pb-4 shadow-raised">
        <div className="flex items-baseline justify-between">
          <p className="text-base">
            Gross <strong className="font-display text-2xl tabular-nums">{totals.withStrokes ? totals.gross : "—"}</strong>{" "}
            {totals.withStrokes > 0 && <span className={totals.toPar > 0 ? "text-score-over" : "text-score-under"}>({fmtToPar(totals.toPar)})</span>}
          </p>
          <SaveStatus state="saved" />
        </div>
        <p className="text-sm text-muted-foreground">{totals.net != null ? `Neto ${totals.net}` : "Neto al terminar"}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary">Tarjeta completa</Button>
          <Button disabled={totals.withStrokes + totals.pickedUp < 10}>Firmar</Button>
        </div>
      </div>
    </div>
  );
}

function HoleStrip({
  scores,
  current,
  onPick,
  label,
  className,
}: {
  scores: Record<number, HoleScore>;
  current: number;
  onPick: (p: number) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-9 border-t border-l border-border", className)}>
      {round.positions.map(({ position, hole }) => {
        const s = scores[position];
        const done = s && (s.strokes != null || s.pickedUp);
        return (
          <button
            key={position}
            type="button"
            onClick={() => onPick(position)}
            aria-current={position === current ? "step" : undefined}
            aria-label={`Hoyo ${hole.number}${s?.pickedUp ? ", no terminado" : s?.strokes != null ? `, ${s.strokes} golpes` : ""}`}
            className={cn(
              "flex h-tap flex-col items-center justify-center border-r border-b border-border text-xs leading-none",
              position === 9 && "border-r-line-strong",
              position === current && "bg-foreground text-background",
            )}
          >
            <span className={cn(position === current ? "text-background/80" : "text-muted-foreground")}>{hole.number}</span>
            <span className="mt-0.5 font-display text-base font-bold tabular-nums">{s?.pickedUp ? "/" : (s?.strokes ?? (done ? "" : "·"))}</span>
          </button>
        );
      })}
    </div>
  );
}

function PartidaB() {
  const { scores, set } = useRoundState();
  const [position, setPosition] = useState(8);
  const hole = round.positions[position - 1].hole;
  return (
    <div className="dark -mx-4 bg-background px-4 pb-6 text-foreground">
      <RoundHeaderMock />
      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Hoyo anterior" onClick={() => setPosition(Math.max(1, position - 1))}>
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <p className="font-display text-numeral-xl font-extrabold">{hole.number}</p>
          <p className="flex justify-center gap-3 text-sm text-muted-foreground">
            <span>Par {hole.par}</span>
            <span>Hcp {hole.strokeIndex}</span>
            <span>{hole.meters} m</span>
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Hoyo siguiente" onClick={() => setPosition(Math.min(18, position + 1))}>
          <ChevronRight />
        </Button>
      </div>
      <ul className="mt-5 divide-y divide-border border-y border-border">
        {round.scorecards
          .filter((c) => !c.isLegacy)
          .map((c) => {
            const s = scores[c.id][position];
            const ch = courseHandicaps[c.id];
            const received = ch != null && hole.strokeIndex != null ? strokesOnHole(ch, hole.strokeIndex) : 0;
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <Initials name={c.playerName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.playerName}</p>
                  <StrokeDots count={received} />
                </div>
                {c.signedAt ? (
                  <Badge tone="signed">Firmada</Badge>
                ) : (
                  <Stepper
                    className="w-44"
                    label={`Golpes de ${c.playerName}`}
                    value={s?.strokes ?? null}
                    emptyValue={hole.par}
                    onChange={(v) => set(c.id, position, { strokes: v, pickedUp: false })}
                  >
                    <ScoreMark strokes={s?.strokes} par={hole.par} pickedUp={s?.pickedUp} size="md" animate />
                  </Stepper>
                )}
              </li>
            );
          })}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">B: una pizarra por hoyo; se anota a todos sin cambiar de jugador.</p>
    </div>
  );
}

function PartidaC() {
  const { scores, set } = useRoundState();
  const [open, setOpen] = useState<{ cardId: string; position: number } | null>(null);
  const card = open ? round.scorecards.find((c) => c.id === open.cardId)! : null;
  const hole = open ? round.positions[open.position - 1].hole : null;
  const s = open ? scores[open.cardId][open.position] : undefined;
  return (
    <div>
      <RoundHeaderMock />
      <ScorecardGrid
        className="mt-3"
        mode="scores"
        caption="Tarjeta completa"
        positions={round.positions}
        columns={round.scorecards.map((c) => ({
          id: c.id,
          name: c.playerName,
          scores: scores[c.id],
          locked: !!c.signedAt,
          legacyGross: c.isLegacy ? c.legacyGross : null,
          courseHandicap: courseHandicaps[c.id],
        }))}
        highlight={{ columnId: "card-bauti" }}
        onCellTap={(cardId, position) => setOpen({ cardId, position })}
      />
      <p className="mt-4 text-sm text-muted-foreground">C: la tarjeta completa es la pantalla; tocar una celda abre el stepper.</p>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          {card && hole && (
            <>
              <SheetTitle>
                {card.playerName}, hoyo {hole.number}
              </SheetTitle>
              <p className="flex gap-3 text-sm text-muted-foreground">
                <span>Par {hole.par}</span>
                <span>Hcp {hole.strokeIndex}</span>
              </p>
              <Stepper
                className="my-6"
                size="lg"
                label="Golpes"
                value={s?.strokes ?? null}
                emptyValue={hole.par}
                onChange={(v) => set(card.id, open!.position, { strokes: v, pickedUp: false })}
              >
                <ScoreMark strokes={s?.strokes} par={hole.par} size="lg" animate />
              </Stepper>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ——— Inicio ———

export function InicioVariant({ variant }: { variant: "A" | "B" | "C" }) {
  if (variant === "B") return <InicioB />;
  if (variant === "C") return <InicioC />;
  return <InicioA />;
}

function InicioA() {
  return (
    <div>
      <p className="mb-3 text-xl font-semibold">Hola, {me.name}</p>
      <Board>
        <BoardLabel>Hándicap Index</BoardLabel>
        <div className="mt-1 flex items-end justify-between gap-3">
          <BoardNumber value={me.handicap.effective} kind="index" size="xl" animate />
          {myDelta != null && (
            <span className="mb-2 inline-flex items-center gap-1 text-base font-semibold text-score-under">
              <TrendingDown aria-hidden className="size-5" /> {fmtDecimal(myDelta)}
            </span>
          )}
        </div>
        <BoardLabel className="mt-2">{me.handicap.signedCount} tarjetas firmadas</BoardLabel>
      </Board>
      <Button size="lg" className="mt-4 w-full">
        <Plus /> Nueva partida
      </Button>
      <Notice tone="warn" className="mt-4" title="Tu tarjeta de Miraflores está sin firmar" action={<Button size="sm" variant="secondary">Ir a firmar</Button>}>
        12 sep, 11 hoyos cargados.
      </Notice>
      <Section title="Grupos" action={<a className="text-primary">Nuevo</a>} className="mt-6">
        <List>
          {groups.map((g) => (
            <ListRow key={g.id} href="#" title={g.name} trailing={<span className="text-sm text-muted-foreground">{g.members} golfistas</span>} />
          ))}
        </List>
      </Section>
      <Section title="Últimas partidas" action={<a className="text-primary">Ver todas</a>}>
        <ul className="divide-y divide-border border-y border-border">
          {recentRounds.map((r) => (
            <RoundRow key={r.id} round={r} meId={ME_ID} />
          ))}
        </ul>
      </Section>
    </div>
  );
}

function InicioB() {
  return (
    <div className="dark -mx-4 bg-background px-4 pb-6 text-foreground">
      <p className="pt-2 text-sm text-muted-foreground">Hola, {me.name}</p>
      <div className="mt-2 flex items-end gap-4 border-b border-border pb-4">
        <BoardNumber value={me.handicap.effective} kind="index" size="xl" className="text-[6.5rem]" />
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">Hándicap Index</p>
          <p className="text-base font-semibold text-score-under">{myDelta != null ? `${fmtDecimal(myDelta)} desde la última` : ""}</p>
        </div>
      </div>
      <p className="mt-5 mb-1 text-base font-semibold">Los del sábado</p>
      <Leaderboard
        rows={players.map((p) => ({ playerId: p.id, name: p.name, value: p.handicap.effective, source: p.handicap.source, isMe: p.id === ME_ID }))}
      />
      <Button size="lg" className="mt-5 w-full">
        <Plus /> Nueva partida
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">B: todo pizarra; el ranking del grupo vive en el Inicio.</p>
    </div>
  );
}

function InicioC() {
  const cards = me.handicap.history.slice(-6).reverse();
  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-2">
        <p className="text-xl font-semibold">Hola, {me.name}</p>
        <p className="text-base">
          Hcp <strong className="font-display text-numeral tabular-nums">{fmtIndex(me.handicap.effective)}</strong>
        </p>
      </div>
      <table className="mt-3 w-full text-base">
        <caption className="mb-2 text-left text-base font-semibold">Tus últimas tarjetas</caption>
        <thead>
          <tr className="border-b border-line-strong text-sm text-muted-foreground">
            <th className="py-2 text-left font-semibold">Fecha</th>
            <th className="py-2 text-right font-semibold">Dif.</th>
            <th className="py-2 text-right font-semibold">Índice</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.scoreId} className="border-b border-border">
              <td className="h-tap">{formatDate(c.playedOn, { year: false })}</td>
              <td className="text-right font-display font-bold tabular-nums">{fmtDecimal(c.differential)}</td>
              <td className="text-right font-display font-bold tabular-nums">{fmtIndex(c.handicapIndex)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button size="lg" className="mt-4 w-full">
        Nueva partida
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">C: todo papel; el índice es una fila más de la tarjeta.</p>
    </div>
  );
}
