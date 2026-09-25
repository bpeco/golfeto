import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Empty, LinkButton } from "@/components/ui/legacy";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";

export const metadata: Metadata = { title: "Partidas" };

export default async function RoundsPage() {
  const me = await requirePlayer();
  const supabase = await createClient();
  const { data: rounds } = await supabase
    .from("rounds")
    .select(
      "id, played_on, date_approximate, holes_played, loops, course_version:course_versions!rounds_course_version_id_fkey(course:courses!inner(name)), scorecards(player_id, signed_at, player:players!scorecards_player_id_fkey(display_name), signature:scorecard_signatures!scorecards_current_signature_fk(gross))",
    )
    .is("deleted_at", null)
    .order("played_on", { ascending: false })
    .limit(100);

  return (
    <Shell title="Partidas" action={<LinkButton href="/partidas/nueva">+ Nueva</LinkButton>}>
      {!rounds || rounds.length === 0 ? (
        <Empty>Todavía no hay partidas.</Empty>
      ) : (
        <Card className="divide-y divide-border p-0">
          {rounds.map((r) => {
            const mine = r.scorecards.find((s) => s.player_id === me.id);
            return (
              <Link key={r.id} href={`/partidas/${r.id}`} className="block px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.course_version.course.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.date_approximate ? "~" : ""}
                    {formatDate(r.played_on)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.scorecards
                    .map((s) => `${s.player?.display_name ?? "?"}${s.signature?.gross != null ? ` ${s.signature.gross}` : ""}`)
                    .join(" · ")}
                  {mine && !mine.signed_at ? " · tu tarjeta sin firmar" : ""}
                </p>
              </Link>
            );
          })}
        </Card>
      )}
    </Shell>
  );
}
