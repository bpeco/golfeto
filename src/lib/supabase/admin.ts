import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente con la service role: saltea RLS y los guards de "solo el dueño". Solo para acciones de servidor que
 * ya verificaron el permiso con la sesión del usuario y llaman a una RPC reservada a service_role
 * (hoy: change_round_course_resign). Null si falta SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
