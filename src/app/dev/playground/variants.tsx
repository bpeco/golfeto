"use client";

/**
 * PROTOTIPO (Puerta 1): tres variantes de Partida e Inicio con datos de mentira.
 *   A = el brief tal cual (papel + pizarra en el índice) — elegida, provisional
 *   B = más pizarra: fondo oscuro también en modo claro; Partida anota a todos en el hoyo
 *   C = más papel: todo grilla, sin pizarra; Partida abre en la tarjeta completa
 * Se borran B y C cuando el dueño confirme la Puerta 1 (ver DESIGN.md).
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, Ellipsis, Plus } from "lucide-react";
import { BoardNumber } from "@/components/ui/board-number";
import { Button } from "@/components/ui/button";
import { Initials } from "@/components/ui/initials";
import { Leaderboard } from "@/components/ui/leaderboard";
import { ScoreMark } from "@/components/ui/score-mark";
import { ScorecardGrid } from "@/components/ui/scorecard-grid";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { StrokeDots } from "@/components/ui/stroke-dots";
import { TeeChip } from "@/components/ui/tee-chip";
import { Badge } from "@/components/ui/badge";
import { strokesOnHole } from "@/lib/handicap/course";
import type { HoleScore } from "@/lib/scorecard-totals";
import { fmtDecimal, fmtIndex, formatDate } from "@/lib/format";
import { RoundScoring, type ScoringCard } from "@/app/(app)/partidas/[id]/round-scoring";
import { HomeView } from "@/app/(app)/home-view";
import { GroupView } from "@/app/(app)/grupos/[id]/group-view";
import { NewRoundForm } from "@/app/(app)/partidas/nueva/new-round-form";
import { CourseForm } from "@/app/(app)/canchas/course-form";
import { ME_ID, courseDetail, courseHandicaps, courses, groups, players, recentRounds, round } from "./fixtures";

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
  const cards: ScoringCard[] = round.scorecards.map((c) => ({
    id: c.id,
    playerId: c.playerId,
    playerName: c.playerName,
    isGuest: c.isGuest,
    isLegacy: c.isLegacy,
    legacyGross: c.legacyGross,
    signedAt: c.signedAt,
    signature: c.signature,
    scores: c.scores,
    courseHandicap: courseHandicaps[c.id],
    ownerIndex: players.find((p) => p.id === c.playerId)?.handicap.effective ?? null,
    isOwner: c.playerId === ME_ID,
  }));
  return (
    <div>
      <RoundHeaderMock />
      <RoundScoring
        roundId={round.id}
        tee={{ name: round.tee.name, holesCount: round.course.holesCount }}
        positions={round.positions}
        loops={round.loops}
        cards={cards}
        initialCardId="card-bauti"
        rating={{ courseRating: 70.3, slope: 125, par: 71, holesInRound: 18 }}
        photos={[]}
        saveAction={async () => {
          await new Promise((r) => setTimeout(r, 300));
          return { ok: true, data: undefined };
        }}
      />
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
  const indexed = me.handicap.history.filter((p) => p.handicapIndex != null);
  return (
    <HomeView
      meId={ME_ID}
      firstName={me.name}
      handicap={{ effective: me.handicap.effective, source: me.handicap.source, signedCount: me.handicap.signedCount, previous: indexed.at(-2)?.handicapIndex ?? null }}
      groups={groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.members }))}
      rounds={recentRounds}
      pending={{ roundId: round.id, courseName: "Miraflores", playedOn: round.playedOn, dateApproximate: false, holes: 12 }}
    />
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

// ——— Pantallas reales con datos de mentira ———

export function GroupScreen() {
  const series = players.map((p) => ({
    id: p.id,
    name: p.name,
    points: p.handicap.history.filter((h) => h.handicapIndex != null).map((h) => ({ date: h.playedOn, value: h.handicapIndex! })),
  }));
  return (
    <GroupView
      group={{ id: "group-sabado", name: "Los del sábado", inviteCode: "SABADO26" }}
      meId={ME_ID}
      isAdmin
      members={players.map((p, i) => ({ memberId: `m-${p.id}`, playerId: p.id, name: p.name, role: i === 1 ? "admin" : "member" }))}
      leaderboard={players.map((p) => {
        const h = p.handicap.history.filter((x) => x.handicapIndex != null);
        return {
          playerId: p.id,
          name: p.name,
          href: "#",
          value: p.handicap.effective,
          source: p.handicap.source,
          delta: p.handicap.source === "calculado" && h.length >= 2 ? h.at(-1)!.handicapIndex! - h.at(-2)!.handicapIndex! : null,
          isMe: p.id === ME_ID,
        };
      })}
      series={series}
      comparison={players.map((p, i) => ({
        playerId: p.id,
        name: p.name,
        index: p.handicap.effective,
        avgGross: 88 + i * 4,
        last5AvgGross: 87 + i * 4,
        bestGross: 82 + i * 3,
        cards: p.handicap.signedCount,
      }))}
      rounds={recentRounds}
    />
  );
}

export function NewRoundScreen() {
  return (
    <NewRoundForm
      today="2026-09-25"
      me={{ id: ME_ID, name: "Bauti" }}
      courses={courses}
      groups={[{ id: "group-sabado", name: "Los del sábado", members: players.map((p) => ({ id: p.id, name: p.name })) }]}
      preselectedGroup="group-sabado"
    />
  );
}

export function CourseFormScreen() {
  const v = courseDetail.version!;
  const numberById = new Map(v.holes.map((h) => [h.id, h.number]));
  return (
    <CourseForm
      courseId={courseDetail.id}
      today="2026-09-25"
      initial={{
        name: courseDetail.name,
        club: courseDetail.club,
        city: courseDetail.city,
        holesCount: v.holesCount,
        holes: v.holes,
        tees: v.tees.map((t) => ({
          name: t.name,
          courseRating: t.courseRating,
          slope: t.slope,
          distances: Object.fromEntries(Object.entries(t.distances).map(([id, m]) => [numberById.get(id) ?? 0, m])),
        })),
      }}
    />
  );
}
