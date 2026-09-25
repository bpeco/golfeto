import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Empty, LinkButton } from "@/components/ui/legacy";
import { fmtIndex, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap } from "@/lib/db/handicap";
import { listMyGroups } from "@/lib/db/groups";

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const me = await requirePlayer();
  const supabase = await createClient();

  const [groups, { data: rounds }, handicap] = await Promise.all([
    listMyGroups(me.id),
    supabase
      .from("rounds")
      .select("id, played_on, date_approximate, course_version:course_versions!inner(course:courses!inner(name)), scorecards(player_id, signed_at)")
      .is("deleted_at", null)
      .order("played_on", { ascending: false })
      .limit(5),
    getPlayerHandicap(me.id),
  ]);


  return (
    <Shell title="Galf" action={<LinkButton href="/partidas/nueva">Nueva partida</LinkButton>}>
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hola, {me.displayName.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground">
            {handicap.source === "calculado"
              ? `Hándicap Index · ${handicap.signedCount} tarjetas`
              : handicap.source === "declarado"
                ? "Hándicap declarado"
                : "Sin hándicap todavía"}
          </p>
        </div>
        <Link href="/perfil" className="text-3xl font-black tabular-nums">
          {fmtIndex(handicap.effective)}
        </Link>
      </Card>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Grupos</h2>
          <Link href="/grupos/nuevo" className="text-sm text-primary">+ Nuevo</Link>
        </div>
        {groups.length === 0 ? (
          <Empty>No estás en ningún grupo. Creá uno o entrá con un link de invitación.</Empty>
        ) : (
          <Card className="divide-y divide-border p-0">
            {groups.map((g) => (
              <Link key={g.id} href={`/grupos/${g.id}`} className="block px-4 py-3 font-medium">
                {g.name}
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Últimas partidas</h2>
          <Link href="/partidas" className="text-sm text-primary">Ver todas</Link>
        </div>
        {!rounds || rounds.length === 0 ? (
          <Empty>Todavía no hay partidas.</Empty>
        ) : (
          <Card className="divide-y divide-border p-0">
            {rounds.map((r) => {
              const mine = r.scorecards.find((s) => s.player_id === me.id);
              return (
                <Link key={r.id} href={`/partidas/${r.id}`} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{r.course_version.course.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.date_approximate ? "~" : ""}
                      {formatDate(r.played_on)} · {r.scorecards.length} jugador{r.scorecards.length === 1 ? "" : "es"}
                    </p>
                  </div>
                  {mine && (
                    <span className={`text-xs ${mine.signed_at ? "text-muted-foreground" : "text-primary"}`}>
                      {mine.signed_at ? "Firmada" : "Sin firmar"}
                    </span>
                  )}
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </Shell>
  );
}
