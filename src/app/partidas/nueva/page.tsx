import { Shell } from "@/components/shell";
import { Empty, LinkButton } from "@/components/ui/legacy";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { listCourses } from "@/lib/db/courses";
import { NewRoundForm } from "./new-round-form";

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

  if (courses.length === 0) {
    return (
      <Shell title="Nueva partida" back="/">
        <Empty>Primero hay que cargar una cancha.</Empty>
        <LinkButton href="/canchas/nueva" className="mt-4 w-full">Cargar cancha</LinkButton>
      </Shell>
    );
  }

  return (
    <Shell title="Nueva partida" back="/">
      <NewRoundForm me={{ id: me.id, name: me.displayName }} courses={courses} groups={groups} preselectedGroup={grupo ?? null} />
    </Shell>
  );
}
