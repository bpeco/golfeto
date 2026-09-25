"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/grupos/nuevo?error=nombre");

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("create_group", { p_name: name });
  if (error || !groupId) redirect(`/grupos/nuevo?error=${encodeURIComponent(error?.message ?? "desconocido")}`);

  revalidatePath("/");
  redirect(`/grupos/${groupId}`);
}

export async function joinGroup(code: string) {
  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("join_group", { code });
  if (error || !groupId) return { error: error?.message ?? "Código inválido" };
  revalidatePath("/");
  return { groupId };
}

export async function regenerateInviteCode(groupId: string) {
  const supabase = await createClient();
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { error } = await supabase.from("groups").update({ invite_code: code }).eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath(`/grupos/${groupId}`);
  return { code };
}

export async function revokeInviteCode(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").update({ invite_code: null }).eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath(`/grupos/${groupId}`);
  return {};
}

export async function removeMember(groupId: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("group_members").delete().eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/grupos/${groupId}`);
  return {};
}

export async function leaveGroup(groupId: string) {
  const me = await requirePlayer();
  const supabase = await createClient();
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("player_id", me.id);
  revalidatePath("/");
  redirect("/");
}
