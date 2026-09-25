"use server";

import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { fail, friendlyDbError, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { flash } from "@/lib/flash";
import { groupNameSchema, inviteCodeSchema } from "./schema";

/** Crea el grupo (quien lo crea queda como admin) y lleva a su pantalla. */
export async function createGroup(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = groupNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("create_group", { p_name: parsed.data.name });
  if (error || !groupId) return fail(friendlyDbError(error));

  revalidatePath("/");
  revalidatePath("/grupos");
  await flash("Grupo creado. Compartí el link para que se sumen.");
  redirect(`/grupos/${groupId}`, RedirectType.replace);
}

/** Se une con el código del link. Solo con un toque explícito (antes pasaba al abrir el link). */
export async function joinGroupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = inviteCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return fail("El link de invitación está incompleto.");

  const supabase = await createClient();
  const { data: groupId, error } = await supabase.rpc("join_group", { code: parsed.data });
  if (error || !groupId) return fail(friendlyDbError(error ?? "Código de invitación inválido"));

  const { data: group } = await supabase.from("groups").select("name").eq("id", groupId).maybeSingle();
  revalidatePath("/");
  revalidatePath("/grupos");
  await flash(group ? `Ya estás en «${group.name}».` : "Ya estás en el grupo.");
  redirect(`/grupos/${groupId}`, RedirectType.replace);
}

export async function regenerateInviteCode(groupId: string): Promise<ActionResult<{ code: string }>> {
  const supabase = await createClient();
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { error } = await supabase.from("groups").update({ invite_code: code }).eq("id", groupId);
  if (error) return fail(friendlyDbError(error));
  revalidatePath(`/grupos/${groupId}`);
  return ok({ code });
}

export async function revokeInviteCode(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").update({ invite_code: null }).eq("id", groupId);
  if (error) return fail(friendlyDbError(error));
  revalidatePath(`/grupos/${groupId}`);
  return ok();
}

export async function removeMember(groupId: string, memberId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("group_members").delete().eq("id", memberId);
  if (error) return fail(friendlyDbError(error));
  revalidatePath(`/grupos/${groupId}`);
  return ok();
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const me = await requirePlayer();
  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("name").eq("id", groupId).maybeSingle();
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("player_id", me.id);
  if (error) return fail(friendlyDbError(error));
  revalidatePath("/");
  revalidatePath("/grupos");
  await flash(group ? `Saliste de «${group.name}».` : "Saliste del grupo.", "info");
  redirect("/grupos", RedirectType.replace);
}
