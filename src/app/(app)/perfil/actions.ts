"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";
import { fail, friendlyDbError, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { parseDecimal } from "@/lib/format";
import { declaredHandicapSchema, displayNameSchema } from "./schema";

export async function saveDeclaredHandicap(_prev: ActionResult<{ value: number }> | null, formData: FormData): Promise<ActionResult<{ value: number }>> {
  const raw = String(formData.get("value") ?? "");
  const parsed = declaredHandicapSchema.safeParse(parseDecimal(raw));
  if (!parsed.success) return fromZod(parsed.error);

  const me = await requirePlayer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("player_declared_handicaps")
    .insert({ player_id: me.id, value: parsed.data, valid_from: new Date().toISOString().slice(0, 10) });
  if (error) return fail(friendlyDbError(error));
  revalidatePath("/perfil");
  revalidatePath("/");
  return ok({ value: parsed.data });
}

export async function updateDisplayName(_prev: ActionResult<{ name: string }> | null, formData: FormData): Promise<ActionResult<{ name: string }>> {
  const parsed = displayNameSchema.safeParse(formData.get("display_name"));
  if (!parsed.success) return fromZod(parsed.error);
  const me = await requirePlayer();
  const supabase = await createClient();
  const { error } = await supabase.from("players").update({ display_name: parsed.data }).eq("id", me.id);
  if (error) return fail(friendlyDbError(error));
  revalidatePath("/", "layout");
  return ok({ name: parsed.data });
}

export async function claimGuest(guestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_guest", { p_guest_id: guestId });
  if (error) return fail(friendlyDbError(error));
  revalidatePath("/", "layout");
  return ok();
}
