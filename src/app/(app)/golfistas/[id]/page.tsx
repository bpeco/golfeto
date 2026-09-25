import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { IndexChart } from "@/components/index-chart";
import { Badge } from "@/components/ui/badge";
import { BoardNumber } from "@/components/ui/board-number";
import { EmptyState } from "@/components/ui/empty-state";
import { Initials } from "@/components/ui/initials";
import { Trend } from "@/components/ui/leaderboard";
import { List, ListRow } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerStats, headToHead } from "@/lib/db/stats";
import { fmtCount, fmtDecimal, fmtDelta, fmtToPar, formatRoundDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const stats = await getPlayerStats((await params).id);
  return { title: stats?.name ?? "Golfista" };
}

export default async function PlayerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vs?: string }> }) {
  const { id } = await params;
  const { vs } = await searchParams;
  const me = await requirePlayer();
  const stats = await getPlayerStats(id);
  if (!stats) notFound();

  const supabase = await createClient();
  const { data: mates } = await supabase
    .from("group_members")
    .select("group:groups!inner(members:group_members(player:players!group_members_player_id_fkey(id, display_name)))")
    .eq("player_id", id)
    .is("deleted_at", null);
  const others = new Map<string, string>();
  for (const m of mates ?? []) for (const x of m.group.members) if (x.player && x.player.id !== id) others.set(x.player.id, x.player.display_name);
  // Si miro a otro, por defecto me comparo yo con él.
  const rivalId = vs && others.has(vs) ? vs : id !== me.id && others.has(me.id) ? me.id : null;
  const rival = rivalId ? await getPlayerStats(rivalId) : null;
  const h2h = rival ? headToHead(stats, rival) : null;

  const h = stats.handicap;
  const indexed = h.history.filter((p) => p.handicapIndex != null);
  const delta = h.source === "calculado" && indexed.length >= 2 ? indexed.at(-1)!.handicapIndex! - indexed.at(-2)!.handicapIndex! : null;
  const isMe = id === me.id;

  return (
    <>
      <PageHeader title={isMe ? `${stats.name} (vos)` : stats.name} back={{ fallback: "/grupos" }} />

      <section aria-label="Hándicap" className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {h.source === "calculado" ? "Hándicap Index" : h.source === "declarado" ? "Hándicap declarado" : "Sin hándicap todavía"}
          </p>
          <BoardNumber value={h.effective} kind="index" size="xl" className="block" />
        </div>
        {delta != null && (
          <p className="mb-2 inline-flex items-center gap-1 text-base font-semibold">
            <Trend delta={delta} />
            <span className={delta < 0 ? "text-score-under" : delta > 0 ? "text-score-over" : "text-muted-foreground"}>{delta === 0 ? "igual" : fmtDelta(delta)}</span>
          </p>
        )}
      </section>

      <dl className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
        <Stat label="Promedio" value={stats.avgGross == null ? "—" : String(Math.round(stats.avgGross))} sub={stats.avgToPar == null ? undefined : fmtToPar(Math.round(stats.avgToPar))} />
        <Stat label="Mejor" value={stats.bestGross == null ? "—" : String(stats.bestGross)} />
        <Stat label="Últimas 5" value={stats.last5AvgGross == null ? "—" : String(Math.round(stats.last5AvgGross))} />
      </dl>

      <Section title="Evolución" className="mt-8">
        <IndexChart
          title={`Evolución del Hándicap Index de ${stats.name}`}
          highlightId={id}
          series={[{ id, name: stats.name, points: indexed.map((p) => ({ date: p.playedOn, value: p.handicapIndex! })) }]}
        />
      </Section>

      {others.size > 0 && (
        <Section title="Cara a cara">
          <nav aria-label="Comparar con" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {Array.from(others, ([oid, name]) => {
              const active = oid === rivalId;
              return (
                <Link
                  key={oid}
                  href={`/golfistas/${id}?vs=${oid}`}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-tap shrink-0 items-center gap-2 rounded-md border px-2.5 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:bg-accent",
                  )}
                >
                  <Initials name={name} size="sm" className={active ? "bg-background/20 text-background" : undefined} />
                  {oid === me.id ? "Vos" : name}
                </Link>
              );
            })}
          </nav>
          {h2h && rival ? (
            <div className="mt-4">
              <div className="grid grid-cols-2 divide-x divide-border border-y border-border">
                <div className="py-3 pr-3">
                  <p className="truncate text-sm text-muted-foreground">{stats.name}</p>
                  <BoardNumber value={stats.handicap.effective} kind="index" size="md" className="block" />
                </div>
                <div className="py-3 pl-3 text-right">
                  <p className="truncate text-sm text-muted-foreground">{rival.name}</p>
                  <BoardNumber value={rival.handicap.effective} kind="index" size="md" className="block" />
                </div>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
                <Stat label="ganó" value={String(h2h.wins)} />
                <Stat label="empató" value={String(h2h.ties)} />
                <Stat label="perdió" value={String(h2h.losses)} />
              </dl>
              {h2h.sharedRounds.length === 0 ? (
                <p className="mt-3 text-base text-muted-foreground">Todavía no jugaron una partida juntos con las dos tarjetas firmadas.</p>
              ) : (
                <List className="mt-3">
                  {h2h.sharedRounds.map((r) => (
                    <ListRow
                      key={r.roundId}
                      href={`/partidas/${r.roundId}`}
                      title={r.courseName}
                      meta={formatRoundDate(r.playedOn, false)}
                      trailing={
                        <span className="font-display text-xl tabular-nums">
                          <span className={cn(r.mine < r.theirs && "font-bold text-primary")}>{r.mine}</span>
                          <span className="px-1 text-muted-foreground">a</span>
                          <span className={cn(r.theirs < r.mine && "font-bold text-primary")}>{r.theirs}</span>
                        </span>
                      }
                    />
                  ))}
                </List>
              )}
            </div>
          ) : (
            <p className="mt-3 text-base text-muted-foreground">Elegí con quién comparar.</p>
          )}
        </Section>
      )}

      <Section title="Tarjetas firmadas">
        {stats.cards.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin tarjetas firmadas" body={isMe ? "Cuando firmes una partida aparece acá y cuenta para tu hándicap." : undefined} />
        ) : (
          <>
            <p className="mb-2 text-sm text-muted-foreground">{fmtCount(stats.cards.length, "tarjeta")}; las 20 más recientes cuentan para el índice.</p>
            <List>
              {stats.cards.map((c) => {
                const toPar = c.gross - c.par;
                return (
                  <ListRow
                    key={c.scorecardId}
                    href={`/partidas/${c.roundId}?j=${c.scorecardId}`}
                    title={
                      <span className="inline-flex items-center gap-2">
                        {c.courseName}
                        {c.isLegacy && <Badge tone="outline">histórica</Badge>}
                      </span>
                    }
                    meta={`${formatRoundDate(c.playedOn, c.dateApproximate)}, diferencial ${fmtDecimal(c.differential)}`}
                    trailing={
                      <span className="inline-flex items-center gap-2">
                        <span className="font-display text-xl font-bold tabular-nums">{c.gross}</span>
                        {c.par > 0 && <Badge tone={toPar < 0 ? "under" : toPar > 0 ? "over" : "neutral"}>{fmtToPar(toPar)}</Badge>}
                      </span>
                    }
                  />
                );
              })}
            </List>
          </>
        )}
      </Section>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display text-numeral font-bold tabular-nums">
        {value}
        {sub && <span className="ml-1 text-base font-semibold text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}
