import type { Metadata } from "next";
import Link from "next/link";
import { LandPlot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { listCourses } from "@/lib/db/courses";
import { todayInArgentina } from "@/lib/dates";
import { NewRoundForm } from "./new-round-form";

export const metadata: Metadata = { title: "Nueva partida" };

export default async function NewRoundPage({ searchParams }: { searchParams: Promise<{ grupo?: string }> }) {
  const { grupo } = await searchParams;
  const me = await requirePlayer();
  const supabase = await createClient();

  const [courses, { data: memberships }] = await Promise.all([
    listCourses(),
    supabase
      .from("group_members")
      .select("group:groups!inner(id, name, members:group_members(player:players!group_members_player_id_fkey(id, display_name, user_id)))")
      .eq("player_id", me.id)
      .is("deleted_at", null),
  ]);

  const groups = (memberships ?? []).map((m) => ({
    id: m.group.id,
    name: m.group.name,
    members: m.group.members
      .map((x) => x.player)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ id: p.id, name: p.display_name })),
  }));

  return (
    <>
      <PageHeader title="Nueva partida" back={{ fallback: grupo ? `/grupos/${grupo}` : "/partidas" }} />
      {courses.length === 0 ? (
        <EmptyState
          icon={LandPlot}
          title="Primero hay que cargar una cancha"
          body="Con la foto de la tarjeta del club se completa sola."
          action={
            <Link href="/canchas/nueva" className={buttonVariants()}>
              Cargar cancha
            </Link>
          }
        />
      ) : (
        <NewRoundForm today={todayInArgentina()} me={{ id: me.id, name: me.displayName }} courses={courses} groups={groups} preselectedGroup={grupo ?? null} />
      )}
    </>
  );
}
