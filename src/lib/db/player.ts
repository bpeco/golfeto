import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentPlayer = {
  id: string;
  userId: string;
  displayName: string;
  email: string | null;
};

/** Golfista de la sesión actual. Redirige a /login si no hay sesión. */
export const requirePlayer = cache(async (): Promise<CurrentPlayer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, email")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!player) {
    // El trigger de auth crea el golfista; si no existe todavía, algo falló en el alta.
    throw new Error("No se encontró el golfista de esta cuenta");
  }

  return {
    id: player.id,
    userId: user.id,
    displayName: player.display_name,
    email: player.email,
  };
});
