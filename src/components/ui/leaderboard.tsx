import Link from "next/link";
import { MoveRight, TrendingDown, TrendingUp } from "lucide-react";
import { fmtDelta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BoardNumber } from "./board-number";
import { Initials } from "./initials";

export type LeaderboardRow = {
  playerId: string;
  name: string;
  href?: string;
  /** Hándicap efectivo (el menor gana). */
  value: number | null;
  source: "calculado" | "declarado" | null;
  /** Cambio contra la tarjeta anterior (negativo = mejoró). */
  delta?: number | null;
  isMe?: boolean;
};

/**
 * El ranking del grupo en la pizarra: puesto, iniciales, nombre, índice grande y tendencia.
 * Es un <ol> (el orden importa). Sin índice van al final, sin puesto.
 */
export function Leaderboard({ rows, className }: { rows: LeaderboardRow[]; className?: string }) {
  const ranked = [...rows].sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity));
  let place = 0;
  return (
    <ol className={cn("divide-y divide-board-foreground/15", className)}>
      {ranked.map((r) => {
        if (r.value != null) place++;
        return (
          <li
            key={r.playerId}
            aria-current={r.isMe ? "true" : undefined}
            className={cn("-mx-2 flex min-h-14 items-center gap-3 rounded-md px-2 py-2", r.isMe && "bg-board-foreground/10")}
          >
            <span className="w-5 shrink-0 text-right font-display text-xl font-bold text-board-muted tabular-nums">
              {r.value != null ? place : ""}
            </span>
            <Initials name={r.name} size="sm" className="bg-board-foreground/15 text-board-foreground" />
            <span className="min-w-0 flex-1">
              {r.href ? (
                <Link href={r.href} className="block truncate text-base font-semibold underline-offset-4 outline-none hover:underline focus-visible:underline">
                  {r.name}
                </Link>
              ) : (
                <span className="block truncate text-base font-semibold">{r.name}</span>
              )}
              {r.source === "declarado" && <span className="text-xs text-board-muted">declarado</span>}
              {r.value == null && <span className="text-xs text-board-muted">sin hándicap</span>}
            </span>
            <Trend delta={r.delta} />
            <BoardNumber value={r.value} kind="index" size="lg" className="min-w-[3.25ch] text-right" />
          </li>
        );
      })}
    </ol>
  );
}

/** Flecha de tendencia del índice: bajar es mejorar. */
export function Trend({ delta, className }: { delta?: number | null; className?: string }) {
  if (delta == null) return <span className={cn("w-5 shrink-0", className)} />;
  const Icon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : MoveRight;
  const label = delta < 0 ? `bajó ${fmtDelta(delta)}` : delta > 0 ? `subió ${fmtDelta(delta)}` : "sin cambios";
  return (
    <Icon
      role="img"
      aria-label={label}
      className={cn("size-5 shrink-0", delta < 0 ? "text-score-under" : delta > 0 ? "text-score-over" : "text-board-muted", className)}
    />
  );
}
