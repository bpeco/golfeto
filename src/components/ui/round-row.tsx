import Link from "next/link";
import { Check } from "lucide-react";
import { formatRoundDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { LinkPending } from "./link-pending";

export type RoundRowData = {
  id: string;
  courseName: string;
  playedOn: string;
  dateApproximate: boolean;
  cards: { playerId: string; name: string; gross: number | null; signed: boolean; guest?: boolean }[];
};

/**
 * Una partida en una lista: cancha y fecha arriba; abajo, cada jugador con su gross y un tilde
 * si firmó ("Agus 91 ✓", "Manu —"). Si mi tarjeta está sin firmar, lo dice.
 */
export function RoundRow({ round, meId, showYear = false }: { round: RoundRowData; meId?: string; showYear?: boolean }) {
  const mine = meId ? round.cards.find((c) => c.playerId === meId) : undefined;
  return (
    <li>
      <Link
        href={`/partidas/${round.id}`}
        className="relative -mx-2 block rounded-sm px-2 py-3 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-base font-semibold">{round.courseName}</span>
          <span className="shrink-0 text-sm text-muted-foreground">{formatRoundDate(round.playedOn, round.dateApproximate, { year: showYear })}</span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {round.cards.map((c) => (
            <span key={c.playerId} className={cn("inline-flex items-center gap-1 text-sm", c.playerId === meId && "font-semibold")}>
              <span className="text-muted-foreground">{c.name}</span>
              {c.gross != null ? (
                <span className="font-display text-base font-bold tabular-nums">{c.gross}</span>
              ) : (
                <span className="text-muted-foreground" aria-label="sin total">—</span>
              )}
              {c.signed && <Check aria-label="firmada" className="size-3.5 text-primary" strokeWidth={3} />}
            </span>
          ))}
          {mine && !mine.signed && <Badge tone="warn">Tu tarjeta sin firmar</Badge>}
        </span>
        <LinkPending />
      </Link>
    </li>
  );
}
