"use client";

import { Fragment, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { strokesOnHole } from "@/lib/handicap/course";
import { fmtToPar } from "@/lib/format";
import { cardTotals, segmentsFor, type HoleScore } from "@/lib/scorecard-totals";
import { notationLabel } from "@/lib/score-notation";
import { cn } from "@/lib/utils";
import { ScoreMark } from "./score-mark";
import { StrokeDots } from "./stroke-dots";
import { TeeDot } from "./tee-chip";

export type GridHole = { position: number; hole: { number: number; par: number; strokeIndex: number | null } };

export type ScoreColumn = {
  id: string;
  name: string;
  scores: Record<number, HoleScore | undefined>;
  /** Firmada o histórica: no se toca. */
  locked?: boolean;
  /** Tarjeta histórica: solo total. */
  legacyGross?: number | null;
  courseHandicap?: number | null;
};

export type CourseColumn = { id: string; name: string; meters: Record<number, number | null | undefined> };

type Props = {
  positions: GridHole[];
  loops?: number;
  caption: string;
  className?: string;
} & (
  | {
      mode: "scores";
      columns: ScoreColumn[];
      highlight?: { columnId?: string; position?: number };
      onCellTap?: (columnId: string, position: number) => void;
    }
  | { mode: "course"; columns: CourseColumn[] }
);

const cellBase = "h-tap border-b border-border px-1 text-center align-middle";

/**
 * La tarjeta de papel: filas por hoyo (Hoyo | Par | Hcp | una columna por jugador o por tee),
 * filas IDA / VUELTA / TOTAL, regla fuerte después del hoyo 9. Hasta 4 columnas entran en
 * 360 px; con más, scroll horizontal con Hoyo/Par/Hcp fijos.
 */
export function ScorecardGrid(props: Props) {
  const { positions, loops = 1, caption, className } = props;
  const holesInRound = positions.length === 18 ? 18 : 9;
  const segments = segmentsFor(positions, loops);
  const wide = props.columns.length > 4;
  const sticky = wide ? "sticky z-10 bg-background" : "";
  const segmentEnd = new Map(segments.map((s) => [s.positions.at(-1)!.position, s]));

  const scoreTotals =
    props.mode === "scores"
      ? new Map(props.columns.map((c) => [c.id, cardTotals(positions, c.scores, { loops, courseHandicap: c.courseHandicap })]))
      : null;

  function totalCells(label: string, range: GridHole[], strong: boolean) {
    const par = range.reduce((s, p) => s + p.hole.par, 0);
    return (
      <tr className={cn("bg-muted/60 font-semibold", strong && "border-b-2 border-line-strong")}>
        <th scope="row" className={cn(cellBase, sticky, wide && "left-0", "text-left text-xs tracking-wide uppercase")}>
          {label}
        </th>
        <td className={cn(cellBase, sticky, wide && "left-11", "font-display text-base tabular-nums")}>{par}</td>
        <td className={cn(cellBase, sticky, wide && "left-20")} />
        {props.mode === "scores"
          ? props.columns.map((c) => {
              if (c.legacyGross != null) {
                return (
                  <td key={c.id} className={cellBase}>
                    {label === "Total" ? <span className="font-display text-lg font-bold tabular-nums">{c.legacyGross}</span> : null}
                  </td>
                );
              }
              const segment = label === "Total" ? scoreTotals!.get(c.id)! : scoreTotals!.get(c.id)!.segments.find((s) => s.label === label);
              const gross = segment?.gross ?? 0;
              const toPar = segment?.toPar ?? 0;
              const any = label === "Total" ? (segment as { withStrokes: number }).withStrokes > 0 : (segment as { played: number }).played > 0;
              return (
                <td key={c.id} className={cellBase}>
                  {any ? (
                    <span className="inline-flex items-baseline gap-1">
                      <span className="font-display text-lg font-bold tabular-nums">{gross}</span>
                      <span className={cn("text-xs tabular-nums", toPar < 0 ? "text-score-under" : toPar > 0 ? "text-score-over" : "text-muted-foreground")}>
                        {fmtToPar(toPar)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              );
            })
          : props.columns.map((c) => {
              const meters = range.reduce((s, p) => s + (c.meters[p.hole.number] ?? 0), 0);
              return (
                <td key={c.id} className={cn(cellBase, "font-display text-base tabular-nums")}>
                  {meters || "—"}
                </td>
              );
            })}
      </tr>
    );
  }

  return (
    <div className={cn("-mx-4 overflow-x-auto px-4", className)}>
      <table className={cn("w-full border-collapse text-base", wide ? "min-w-max" : "table-fixed")}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-11" />
          <col className="w-9" />
          <col className="w-10" />
          {props.columns.map((c) => (
            <col key={c.id} className={wide ? "w-16" : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b-2 border-line-strong text-sm text-muted-foreground">
            <th scope="col" className={cn("h-10 px-1 text-left font-semibold", sticky, wide && "left-0")}>
              Hoyo
            </th>
            <th scope="col" className={cn("h-10 px-1 font-semibold", sticky, wide && "left-11")}>
              Par
            </th>
            <th scope="col" className={cn("h-10 px-1 font-semibold", sticky, wide && "left-20")}>
              Hcp
            </th>
            {props.columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={cn(
                  "h-10 max-w-0 px-1 font-semibold text-foreground",
                  props.mode === "scores" && props.highlight?.columnId === c.id && "bg-accent",
                )}
              >
                <span className="flex items-center justify-center gap-1">
                  {props.mode === "course" && <TeeDot name={c.name} className="size-2.5" />}
                  <span className="truncate">{c.name}</span>
                  {"locked" in c && c.locked && <Lock aria-label="firmada" className="size-3.5 shrink-0 text-muted-foreground" />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => {
            const seg = segmentEnd.get(p.position);
            const rowHighlight = props.mode === "scores" && props.highlight?.position === p.position;
            return (
              <Fragment key={p.position}>
                <tr className={cn(rowHighlight && "bg-accent/60")}>
                  <th scope="row" className={cn(cellBase, sticky, wide && "left-0", "text-left font-display text-lg font-bold tabular-nums")}>
                    {p.hole.number}
                  </th>
                  <td className={cn(cellBase, sticky, wide && "left-11", "text-muted-foreground tabular-nums")}>{p.hole.par}</td>
                  <td className={cn(cellBase, sticky, wide && "left-20", "text-sm text-muted-foreground tabular-nums")}>{p.hole.strokeIndex ?? "—"}</td>
                  {props.mode === "scores"
                    ? props.columns.map((c) => (
                        <ScoreCell
                          key={c.id}
                          column={c}
                          hole={p}
                          holesInRound={holesInRound}
                          highlighted={props.highlight?.columnId === c.id}
                          onTap={props.onCellTap && !c.locked && c.legacyGross == null ? () => props.onCellTap!(c.id, p.position) : undefined}
                        />
                      ))
                    : props.columns.map((c) => (
                        <td key={c.id} className={cn(cellBase, "text-muted-foreground tabular-nums")}>
                          {c.meters[p.hole.number] ?? "—"}
                        </td>
                      ))}
                </tr>
                {seg && totalCells(seg.label, seg.positions, i === 8)}
              </Fragment>
            );
          })}
          {totalCells("Total", positions, false)}
          {props.mode === "scores" && props.columns.some((c) => c.courseHandicap != null && c.legacyGross == null) && (
            <tr>
              <th scope="row" colSpan={3} className={cn(cellBase, sticky, wide && "left-0", "text-left text-sm font-semibold")}>
                Neto
              </th>
              {props.columns.map((c) => {
                const net = scoreTotals!.get(c.id)!.net;
                return (
                  <td key={c.id} className={cn(cellBase, "font-display text-lg font-bold tabular-nums")}>
                    {c.legacyGross != null ? "" : net ?? <span className="font-sans text-sm font-normal text-muted-foreground">al final</span>}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({
  column,
  hole,
  holesInRound,
  highlighted,
  onTap,
}: {
  column: ScoreColumn;
  hole: GridHole;
  holesInRound: number;
  highlighted: boolean;
  onTap?: () => void;
}) {
  const s = column.scores[hole.position];
  const received =
    column.courseHandicap != null && hole.hole.strokeIndex != null ? strokesOnHole(column.courseHandicap, hole.hole.strokeIndex, holesInRound) : 0;
  const inner: ReactNode =
    column.legacyGross != null ? null : (
      <span className="relative inline-flex">
        {s && (s.strokes != null || s.pickedUp) ? (
          <ScoreMark strokes={s.strokes} par={hole.hole.par} pickedUp={s.pickedUp} size="sm" />
        ) : (
          <span className="inline-flex size-9 items-center justify-center text-muted-foreground/60" aria-label="Sin golpes">
            ·
          </span>
        )}
        {received !== 0 && <StrokeDots count={received} className="absolute -top-0.5 -right-1.5 [&_span]:size-1" />}
      </span>
    );
  return (
    <td className={cn(cellBase, "p-0", highlighted && "bg-accent/50")}>
      {onTap ? (
        <button
          type="button"
          onClick={onTap}
          aria-label={`${column.name}, hoyo ${hole.hole.number}: ${notationLabel(s?.strokes, hole.hole.par, s?.pickedUp)}`}
          className="flex h-tap w-full items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {inner}
        </button>
      ) : (
        <span className="flex h-tap items-center justify-center">{inner}</span>
      )}
    </td>
  );
}
