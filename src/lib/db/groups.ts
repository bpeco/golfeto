import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MyGroup = { id: string; name: string; memberCount: number };

/** Grupos del golfista con la cantidad de miembros activos (las políticas ya ocultan las bajas). */
export const listMyGroups = cache(async (playerId: string): Promise<MyGroup[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("group:groups!inner(id, name, members:group_members(count))")
    .eq("player_id", playerId)
    .is("deleted_at", null);
  return (data ?? [])
    .map((m) => ({ id: m.group.id, name: m.group.name, memberCount: m.group.members[0]?.count ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** Grupo con sus miembros (para la página del grupo y su título). Null si no existe o no se ve. */
export const getGroup = cache(async (groupId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, invite_code, members:group_members(id, role, player:players!group_members_player_id_fkey(id, display_name, user_id))")
    .eq("id", groupId)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
});
