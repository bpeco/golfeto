import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Empty } from "@/components/ui/legacy";
import { fmtIndex, formatDate } from "@/lib/format";
import { IndexChart } from "@/components/index-chart";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerStats, headToHead } from "@/lib/db/stats";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const stats = await getPlayerStats((await params).id);
  return { title: stats?.name ?? "Golfista" };
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vs?: string }>;
}) {
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

  const rival = vs && others.has(vs) ? await getPlayerStats(vs) : null;
  const h2h = rival ? headToHead(stats, rival) : null;
  const h = stats.handicap;

  return (
    <Shell title={stats.name} back={id === me.id ? "/" : undefined}>
      <Card className="grid grid-cols-3 gap-2 text-center">
        <Stat label={h.source === "declarado" ? "Hcp declarado" : "Hándicap Index"} value={fmtIndex(h.effective)} big />
        <Stat label="Promedio" value={stats.avgGross?.toString() ?? "—"} />
        <Stat label="Mejor" value={stats.bestGross?.toString() ?? "—"} />
        <Stat label="Tarjetas" value={String(stats.cards.length)} />
        <Stat label="Últimas 5" value={stats.last5AvgGross?.toString() ?? "—"} />
        <Stat label="Sobre par" value={stats.avgToPar == null ? "—" : `+${stats.avgToPar}`} />
      </Card>

      <div className="mt-4">
        <IndexChart
          title="Evolución del Hándicap Index"
          series={[
            {
              id,
              name: stats.name,
              points: h.history.filter((p) => p.handicapIndex != null).map((p) => ({ date: p.playedOn, value: p.handicapIndex! })),
            },
          ]}
        />
      </div>

      {others.size > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-base font-semibold">Cara a cara</h2>
          <div className="flex flex-wrap gap-2">
            {Array.from(others, ([oid, name]) => (
              <Link
                key={oid}
                href={`/golfistas/${id}?vs=${oid}`}
                className={`rounded-full border px-3 py-1.5 text-sm ${oid === vs ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
              >
                {name}
              </Link>
            ))}
          </div>
          {h2h && rival && (
            <Card>
              <div className="grid grid-cols-3 text-center">
                <Stat label={stats.name} value={fmtIndex(stats.handicap.effective)} />
                <Stat label="Ganó · Empató · Perdió" value={`${h2h.wins} · ${h2h.ties} · ${h2h.losses}`} />
                <Stat label={rival.name} value={fmtIndex(rival.handicap.effective)} />
              </div>
              {h2h.sharedRounds.length === 0 ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">Todavía no jugaron una partida juntos con las dos tarjetas firmadas.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {h2h.sharedRounds.map((r) => (
                    <li key={r.roundId} className="flex items-center justify-between py-1.5">
                      <Link href={`/partidas/${r.roundId}`} className="text-muted-foreground">{formatDate(r.playedOn)} · {r.courseName}</Link>
                      <span className="tabular-nums">
                        <strong className={r.mine < r.theirs ? "text-primary" : ""}>{r.mine}</strong> – <strong className={r.theirs < r.mine ? "text-primary" : ""}>{r.theirs}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
                <span>Promedio {stats.avgGross ?? "—"}</span>
                <span>Promedio {rival.avgGross ?? "—"}</span>
              </div>
            </Card>
          )}
        </section>
      )}

      <section className="mt-6 space-y-3">
        <h2 className="text-base font-semibold">Tarjetas firmadas</h2>
        {stats.cards.length === 0 ? (
          <Empty>Sin tarjetas firmadas.</Empty>
        ) : (
          <Card className="divide-y divide-border p-0">
            {stats.cards.map((c) => (
              <Link key={c.scorecardId} href={`/partidas/${c.roundId}?j=${c.scorecardId}`} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">{c.courseName}{c.isLegacy ? " · histórica" : ""}</p>
                  <p className="text-xs text-muted-foreground">{c.dateApproximate ? "~" : ""}{formatDate(c.playedOn)} · dif. {c.differential.toFixed(1)}</p>
                </div>
                <span className="text-lg font-bold tabular-nums">
                  {c.gross} <span className="text-xs font-normal text-muted-foreground">{c.gross - c.par > 0 ? `+${c.gross - c.par}` : c.gross - c.par}</span>
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </Shell>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${big ? "text-3xl" : "text-xl"} font-black tabular-nums`}>{value}</p>
    </div>
  );
}
