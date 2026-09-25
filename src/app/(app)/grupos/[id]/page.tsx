import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/db/player";
import { getGroup } from "@/lib/db/groups";
import { getPlayerStats } from "@/lib/db/stats";
import { listRecentRounds } from "@/lib/db/rounds-list";
import { GroupView } from "./group-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const group = await getGroup((await params).id);
  return { title: group?.name ?? "Grupo" };
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requirePlayer();
  const group = await getGroup(id);
  if (!group) notFound();

  const members = group.members
    .filter((m) => m.player)
    .map((m) => ({ memberId: m.id, playerId: m.player!.id, name: m.player!.display_name, role: m.role }));
  const playerIds = members.map((m) => m.playerId);
  const [stats, { rounds }] = await Promise.all([Promise.all(playerIds.map((pid) => getPlayerStats(pid))), listRecentRounds(me.id, 30)]);
  const byPlayer = new Map(stats.filter((s): s is NonNullable<typeof s> => !!s).map((s) => [s.playerId, s]));

  const leaderboard = members.map((m) => {
    const st = byPlayer.get(m.playerId);
    const indexed = st?.handicap.history.filter((p) => p.handicapIndex != null) ?? [];
    return {
      playerId: m.playerId,
      name: m.name,
      href: `/golfistas/${m.playerId}`,
      value: st?.handicap.effective ?? null,
      source: st?.handicap.source ?? null,
      delta: st?.handicap.source === "calculado" && indexed.length >= 2 ? indexed.at(-1)!.handicapIndex! - indexed.at(-2)!.handicapIndex! : null,
      isMe: m.playerId === me.id,
    };
  });

  const series = [...byPlayer.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((st) => ({
      id: st.playerId,
      name: st.name,
      points: st.handicap.history.filter((p) => p.handicapIndex != null).map((p) => ({ date: p.playedOn, value: p.handicapIndex! })),
    }));

  const comparison = [...byPlayer.values()]
    .sort((a, b) => (a.handicap.effective ?? 99) - (b.handicap.effective ?? 99))
    .map((st) => ({
      playerId: st.playerId,
      name: st.name,
      index: st.handicap.effective,
      avgGross: st.avgGross,
      last5AvgGross: st.last5AvgGross,
      bestGross: st.bestGross,
      cards: st.cards.length,
    }));

  const memberIds = new Set(playerIds);
  const groupRounds = rounds
    .map((r) => ({ ...r, cards: r.cards.filter((c) => memberIds.has(c.playerId)) }))
    .filter((r) => r.cards.length > 0)
    .slice(0, 10);

  return (
    <GroupView
      group={{ id: group.id, name: group.name, inviteCode: group.invite_code }}
      meId={me.id}
      isAdmin={members.some((m) => m.playerId === me.id && m.role === "admin")}
      members={members}
      leaderboard={leaderboard}
      series={series}
      comparison={comparison}
      rounds={groupRounds}
    />
  );
}
