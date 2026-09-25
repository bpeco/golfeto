import Link from "next/link";
import { Flag, Plus } from "lucide-react";
import { IndexChart, type Series } from "@/components/index-chart";
import { Board, BoardLabel } from "@/components/ui/board";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Leaderboard, type LeaderboardRow } from "@/components/ui/leaderboard";
import { PageHeader } from "@/components/ui/page-header";
import { RoundRow, type RoundRowData } from "@/components/ui/round-row";
import { Section } from "@/components/ui/section";
import { fmtCount, fmtIndex } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GroupMenu, type GroupMember } from "./group-menu";
import { InviteSection } from "./invite-section";

export type ComparisonRow = {
  playerId: string;
  name: string;
  index: number | null;
  avgGross: number | null;
  last5AvgGross: number | null;
  bestGross: number | null;
  cards: number;
};

export type GroupData = {
  group: { id: string; name: string; inviteCode: string | null };
  meId: string;
  isAdmin: boolean;
  members: GroupMember[];
  leaderboard: LeaderboardRow[];
  series: Series[];
  comparison: ComparisonRow[];
  rounds: RoundRowData[];
};

/** Grupo: el ranking en la pizarra, la evolución, la comparación y las partidas del grupo. */
export function GroupView({ group, meId, isAdmin, members, leaderboard, series, comparison, rounds }: GroupData) {
  return (
    <>
      <PageHeader
        title={group.name}
        back={{ fallback: "/grupos" }}
        action={<GroupMenu groupId={group.id} groupName={group.name} code={group.inviteCode} isAdmin={isAdmin} meId={meId} members={members} />}
        meta={<span>{fmtCount(members.length, "golfista")}</span>}
      />

      <Board>
        <BoardLabel className="mb-1">Ranking por hándicap</BoardLabel>
        <Leaderboard rows={leaderboard} />
      </Board>

      <Link href={`/partidas/nueva?grupo=${group.id}`} className={buttonVariants({ size: "lg", className: "mt-4 w-full" })}>
        <Plus /> Nueva partida
      </Link>

      <Section title="Evolución" className="mt-8">
        <IndexChart title={`Evolución del Hándicap Index en ${group.name}`} series={series} highlightId={meId} />
      </Section>

      <Section title="Comparación">
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full text-base">
            <caption className="sr-only">Comparación de Hándicap Index y gross entre los golfistas del grupo</caption>
            <thead>
              <tr className="border-b-2 border-line-strong text-sm text-muted-foreground">
                <th scope="col" className="h-10 pr-2 text-left font-semibold">
                  Golfista
                </th>
                <th scope="col" className="px-1 text-right font-semibold">
                  <abbr title="Hándicap Index" className="no-underline">
                    HI
                  </abbr>
                </th>
                <th scope="col" className="px-1 text-right font-semibold">
                  <abbr title="Promedio de gross" className="no-underline">
                    Prom.
                  </abbr>
                </th>
                <th scope="col" className="px-1 text-right font-semibold">
                  <abbr title="Promedio de las últimas 5" className="no-underline">
                    Últ. 5
                  </abbr>
                </th>
                <th scope="col" className="px-1 text-right font-semibold">
                  Mejor
                </th>
                <th scope="col" className="pl-1 text-right font-semibold">
                  <abbr title="Tarjetas firmadas" className="no-underline">
                    Tarj.
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((r) => (
                <tr key={r.playerId} className={cn("border-b border-border", r.playerId === meId && "bg-accent/50")}>
                  <th scope="row" className="h-tap pr-2 text-left font-semibold">
                    <Link href={`/golfistas/${r.playerId}`} className="underline-offset-4 hover:underline">
                      {r.name}
                    </Link>
                  </th>
                  <td className="px-1 text-right font-display text-lg font-bold tabular-nums">{fmtIndex(r.index)}</td>
                  <td className="px-1 text-right font-display text-lg tabular-nums">{r.avgGross == null ? "—" : Math.round(r.avgGross)}</td>
                  <td className="px-1 text-right font-display text-lg tabular-nums">{r.last5AvgGross == null ? "—" : Math.round(r.last5AvgGross)}</td>
                  <td className="px-1 text-right font-display text-lg tabular-nums">{r.bestGross ?? "—"}</td>
                  <td className="pl-1 text-right font-display text-lg tabular-nums text-muted-foreground">{r.cards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Últimas partidas">
        {rounds.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="Todavía no jugaron juntos"
            body="Creá una partida con el grupo y aparece acá."
            action={
              <Link href={`/partidas/nueva?grupo=${group.id}`} className={buttonVariants({ variant: "secondary" })}>
                Nueva partida
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {rounds.map((r) => (
              <RoundRow key={r.id} round={r} meId={meId} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Invitar">
        <InviteSection groupName={group.name} code={group.inviteCode} />
      </Section>
    </>
  );
}
