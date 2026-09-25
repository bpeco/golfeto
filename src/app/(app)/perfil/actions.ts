"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/db/player";

export async function saveDeclaredHandicap(formData: FormData) {
  const raw = String(formData.get("value") ?? "").replace(",", ".").trim();
  const value = raw === "" ? null : Number(raw);
  if (value != null && (Number.isNaN(value) || value < -10 || value > 54)) redirect("/perfil?error=Hándicap inválido");

  const me = await requirePlayer();
  const supabase = await createClient();
  if (value != null) {
    const { error } = await supabase
      .from("player_declared_handicaps")
      .insert({ player_id: me.id, value, valid_from: new Date().toISOString().slice(0, 10) });
    if (error) redirect(`/perfil?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/perfil");
  revalidatePath("/");
  redirect("/perfil?ok=1");
}

export async function updateDisplayName(formData: FormData) {
  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) redirect("/perfil?error=El nombre no puede estar vacío");
  const me = await requirePlayer();
  const supabase = await createClient();
  const { error } = await supabase.from("players").update({ display_name: name }).eq("id", me.id);
  if (error) redirect(`/perfil?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
  redirect("/perfil?ok=1");
}

export async function claimGuest(guestId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_guest", { p_guest_id: guestId });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/perfil");
  return {};
}
