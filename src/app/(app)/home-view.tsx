import Link from "next/link";
import { Flag, Plus, Users } from "lucide-react";
import { HeroIndex } from "@/components/hero-index";
import { Board, BoardLabel } from "@/components/ui/board";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Initials } from "@/components/ui/initials";
import { Trend } from "@/components/ui/leaderboard";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { RoundRow, type RoundRowData } from "@/components/ui/round-row";
import { Section } from "@/components/ui/section";
import type { MyGroup } from "@/lib/db/groups";
import type { PendingCard } from "@/lib/db/rounds-list";
import { fmtCount, fmtDelta, formatRoundDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type HomeData = {
  meId: string;
  firstName: string;
  handicap: { effective: number | null; source: "calculado" | "declarado" | null; signedCount: number; previous: number | null };
  groups: MyGroup[];
  rounds: RoundRowData[];
  pending: PendingCard | null;
};

/** Inicio: la pizarra con el Hándicap Index, la acción principal, lo pendiente, grupos y partidas. */
export function HomeView({ meId, firstName, handicap, groups, rounds, pending }: HomeData) {
  const delta = handicap.source === "calculado" && handicap.previous != null && handicap.effective != null ? handicap.effective - handicap.previous : null;
  const missing = Math.max(0, 3 - handicap.signedCount);
  return (
    <>
      <PageHeader title={`Hola, ${firstName}`} />
      <div className="reveal-stagger">
        <Board>
          <div className="flex items-center justify-between gap-3">
            <BoardLabel>
              {handicap.source === "calculado" ? "Hándicap Index" : handicap.source === "declarado" ? "Hándicap declarado" : "Sin hándicap todavía"}
            </BoardLabel>
            {delta != null && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Trend delta={delta} />
                <span className={delta < 0 ? "text-score-under" : delta > 0 ? "text-score-over" : "text-board-muted"}>
                  {delta === 0 ? "igual" : fmtDelta(delta)}
                </span>
              </span>
            )}
          </div>
          <Link href="/perfil" className="mt-1 block w-fit outline-none focus-visible:ring-2 focus-visible:ring-board-foreground" aria-label="Ver tu hándicap en Perfil">
            <HeroIndex value={handicap.effective} previous={handicap.previous} />
          </Link>
          {handicap.source === "calculado" ? (
            <BoardLabel className="mt-2">{fmtCount(handicap.signedCount, "tarjeta firmada", "tarjetas firmadas")}</BoardLabel>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span aria-hidden className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={cn("size-2 rounded-full ring-1 ring-board-foreground/60", i < handicap.signedCount && "bg-board-foreground")} />
                ))}
              </span>
              <BoardLabel>
                {missing === 1 ? "Te falta 1 tarjeta firmada" : `Te faltan ${missing} tarjetas firmadas`} para tener Hándicap Index
              </BoardLabel>
            </div>
          )}
        </Board>

        <Link href="/partidas/nueva" className={buttonVariants({ size: "lg", className: "mt-4 w-full" })}>
          <Plus /> Nueva partida
        </Link>

        {pending && (
          <Notice
            tone="warn"
            className="mt-4"
            title={`Tu tarjeta de ${pending.courseName} está sin firmar`}
            action={
              <Link href={`/partidas/${pending.roundId}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Ir a la partida
              </Link>
            }
          >
            {formatRoundDate(pending.playedOn, pending.dateApproximate, { year: false })}, {fmtCount(pending.holes, "hoyo cargado", "hoyos cargados")}.
          </Notice>
        )}

        <Section
          title="Grupos"
          className="mt-8"
          action={
            <Link href="/grupos/nuevo" className="text-primary underline-offset-4 hover:underline">
              Nuevo
            </Link>
          }
        >
          {groups.length === 0 ? (
            <EmptyState icon={Users} title="Todavía no estás en ningún grupo" body="Creá uno o entrá con el link que te mandaron." />
          ) : (
            <List>
              {groups.map((g) => (
                <ListRow key={g.id} href={`/grupos/${g.id}`} leading={<Initials name={g.name} />} title={g.name} meta={fmtCount(g.memberCount, "golfista")} />
              ))}
            </List>
          )}
        </Section>

        <Section
          title="Últimas partidas"
          action={
            rounds.length > 0 ? (
              <Link href="/partidas" className="text-primary underline-offset-4 hover:underline">
                Ver todas
              </Link>
            ) : undefined
          }
        >
          {rounds.length === 0 ? (
            <EmptyState icon={Flag} title="Todavía no hay partidas" body="Creá la primera: cancha, tee y quiénes juegan." />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {rounds.map((r) => (
                <RoundRow key={r.id} round={r} meId={meId} />
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
