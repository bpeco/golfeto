import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Empty, LinkButton } from "@/components/ui/legacy";
import { fmtIndex, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getGroup } from "@/lib/db/groups";
import { getHandicapsFor } from "@/lib/db/handicap";
import { getPlayerStats } from "@/lib/db/stats";
import { IndexChart } from "@/components/index-chart";
import { InvitePanel } from "./invite-panel";
import { MemberActions } from "./member-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const group = await getGroup((await params).id);
  return { title: group?.name ?? "Grupo" };
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requirePlayer();
  const supabase = await createClient();

  const group = await getGroup(id);
  if (!group) notFound();

  const members = group.members.filter((m) => m.player);
  const myMembership = members.find((m) => m.player!.id === me.id);
  const isAdmin = myMembership?.role === "admin";
  const playerIds = members.map((m) => m.player!.id);
  const handicaps = await getHandicapsFor(playerIds);
  const stats = (await Promise.all(playerIds.map((pid) => getPlayerStats(pid)))).filter((x): x is NonNullable<typeof x> => !!x);

  const { data: rounds } = await supabase
    .from("rounds")
    .select(
      "id, played_on, date_approximate, course_version:course_versions!inner(course:courses!inner(name)), scorecards(player_id, signed_at, signature:scorecard_signatures!scorecards_current_signature_fk(gross))",
    )
    .is("deleted_at", null)
    .order("played_on", { ascending: false })
    .limit(15);

  const groupRounds = (rounds ?? []).filter((r) => r.scorecards.some((s) => playerIds.includes(s.player_id)));

  const ranking = [...members].sort((a, b) => {
    const ha = handicaps.get(a.player!.id)?.effective ?? 99;
    const hb = handicaps.get(b.player!.id)?.effective ?? 99;
    return ha - hb;
  });

  return (
    <Shell title={group.name} back="/" action={<LinkButton href={`/partidas/nueva?grupo=${group.id}`}>Nueva partida</LinkButton>}>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Miembros</h2>
        <Card className="divide-y divide-border p-0">
          {ranking.map((m) => {
            const h = handicaps.get(m.player!.id);
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <Link href={`/golfistas/${m.player!.id}`} className="font-medium">
                    {m.player!.display_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {m.role === "admin" ? "Admin · " : ""}
                    {h?.signedCount ?? 0} tarjetas
                    {h?.source === "declarado" ? " · hcp declarado" : ""}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums">{fmtIndex(h?.effective ?? null)}</span>
                <MemberActions groupId={group.id} groupName={group.name} memberId={m.id} memberName={m.player!.display_name} isSelf={m.player!.id === me.id} isAdmin={!!isAdmin} />
              </div>
            );
          })}
        </Card>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-base font-semibold">Comparación</h2>
        <IndexChart
          title="Evolución del Hándicap Index"
          series={[...stats]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((st) => ({
              id: st.playerId,
              name: st.name,
              points: st.handicap.history.filter((p) => p.handicapIndex != null).map((p) => ({ date: p.playedOn, value: p.handicapIndex! })),
            }))}
        />
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Golfista</th>
                <th className="px-2 py-2 text-right">Hcp</th>
                <th className="px-2 py-2 text-right">Prom.</th>
                <th className="px-2 py-2 text-right">Últ. 5</th>
                <th className="px-2 py-2 text-right">Mejor</th>
                <th className="px-2 py-2 text-right">Tarj.</th>
              </tr>
            </thead>
            <tbody>
              {[...stats]
                .sort((a, b) => (a.handicap.effective ?? 99) - (b.handicap.effective ?? 99))
                .map((st) => (
                  <tr key={st.playerId} className="border-t border-border">
                    <td className="px-3 py-2"><Link href={`/golfistas/${st.playerId}`}>{st.name}</Link></td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{fmtIndex(st.handicap.effective)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{st.avgGross ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{st.last5AvgGross ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{st.bestGross ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{st.cards.length}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-base font-semibold">Invitar</h2>
        <Card>
          <InvitePanel groupId={group.id} groupName={group.name} code={group.invite_code} isAdmin={!!isAdmin} />
        </Card>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-base font-semibold">Últimas partidas</h2>
        {groupRounds.length === 0 ? (
          <Empty>Todavía no hay partidas. Creá la primera.</Empty>
        ) : (
          <Card className="divide-y divide-border p-0">
            {groupRounds.map((r) => (
              <Link key={r.id} href={`/partidas/${r.id}`} className="block px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.course_version.course.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.date_approximate ? "~" : ""}
                    {formatDate(r.played_on)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.scorecards
                    .filter((s) => playerIds.includes(s.player_id))
                    .map((s) => {
                      const name = members.find((m) => m.player!.id === s.player_id)?.player!.display_name ?? "?";
                      return s.signature?.gross != null ? `${name} ${s.signature.gross}` : `${name} (sin firmar)`;
                    })
                    .join(" · ")}
                </p>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </Shell>
  );
}
