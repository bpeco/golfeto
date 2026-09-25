import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RoundRow, type RoundRowData } from "@/components/ui/round-row";
import { Section } from "@/components/ui/section";
import { requirePlayer } from "@/lib/db/player";
import { listRecentRounds } from "@/lib/db/rounds-list";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Partidas" };

export default async function RoundsPage() {
  const me = await requirePlayer();
  const { rounds } = await listRecentRounds(me.id, 100);

  // Agrupadas por mes (las fechas aproximadas del historial caen en su mes igual).
  const months: { key: string; label: string; rounds: RoundRowData[] }[] = [];
  for (const r of rounds) {
    const key = r.playedOn.slice(0, 7);
    if (months.at(-1)?.key !== key) months.push({ key, label: formatMonth(r.playedOn), rounds: [] });
    months.at(-1)!.rounds.push(r);
  }

  return (
    <>
      <PageHeader
        title="Partidas"
        action={
          <Link href="/partidas/nueva" aria-label="Nueva partida" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <Plus />
          </Link>
        }
      />
      {months.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Todavía no hay partidas"
          body="Creá la primera: elegís cancha, tee y quiénes juegan."
          action={
            <Link href="/partidas/nueva" className={buttonVariants()}>
              Nueva partida
            </Link>
          }
        />
      ) : (
        months.map((mo) => (
          <Section key={mo.key} title={mo.label}>
            <ul className="divide-y divide-border border-y border-border">
              {mo.rounds.map((r) => (
                <RoundRow key={r.id} round={r} meId={me.id} />
              ))}
            </ul>
          </Section>
        ))
      )}
    </>
  );
}
