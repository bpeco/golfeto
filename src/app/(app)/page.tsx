import type { Metadata } from "next";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap } from "@/lib/db/handicap";
import { listMyGroups } from "@/lib/db/groups";
import { listRecentRounds } from "@/lib/db/rounds-list";
import { HomeView } from "./home-view";

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const me = await requirePlayer();
  const [groups, { rounds, pending }, handicap] = await Promise.all([listMyGroups(me.id), listRecentRounds(me.id, 5), getPlayerHandicap(me.id)]);
  const indexed = handicap.history.filter((p) => p.handicapIndex != null);
  return (
    <HomeView
      meId={me.id}
      firstName={me.displayName.split(" ")[0]}
      handicap={{
        effective: handicap.effective,
        source: handicap.source,
        signedCount: handicap.signedCount,
        previous: indexed.length >= 2 ? indexed.at(-2)!.handicapIndex : null,
      }}
      groups={groups}
      rounds={rounds}
      pending={pending}
    />
  );
}
