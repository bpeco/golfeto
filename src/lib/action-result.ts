/**
 * Convención de las server actions: nunca tiran al cliente ni se tragan errores; devuelven
 * un resultado que la pantalla sabe mostrar (toast, error inline por campo, Notice).
 */
import type { z } from "zod";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T) {
  return { ok: true as const, data: data as T };
}

export function fail(error: string, fields?: Record<string, string>) {
  return { ok: false as const, error, fields };
}

/** Errores de zod → primer mensaje por campo (`guests.0.name`, `holes.6.par`) + resumen. */
export function fromZod(err: z.ZodError, summary = "Revisá los campos marcados."): { ok: false; error: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  const only = Object.keys(fields);
  return { ok: false, error: only.length === 1 && only[0] === "_" ? fields._ : summary, fields };
}

type DbErrorLike = { message?: string; code?: string; details?: string | null } | string | null | undefined;

/**
 * Error de Supabase/PostgREST/red → frase para el golfista. Las excepciones propias de la base
 * (P0001, ya escritas en español) pasan tal cual, con el punto y coma como punto.
 */
export function friendlyDbError(error: DbErrorLike): string {
  const message = typeof error === "string" ? error : (error?.message ?? "");
  const code = typeof error === "string" ? undefined : error?.code;

  if (code === "P0001" || /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ .*(tarjeta|partida|golfista|cancha|tee|invitado|hoyo|invitación|versión)/i.test(message) && !/violates|permission|duplicate/i.test(message)) {
    return sentence(message.replace(/;\s*(\p{L})/gu, (_, c: string) => `. ${c.toUpperCase()}`));
  }
  if (/failed to fetch|fetch failed|networkerror|network request failed|econnrefused|enotfound|etimedout|timeout|load failed/i.test(message)) {
    return "Sin conexión. Probá de nuevo.";
  }
  if (code === "PGRST301" || /jwt|not authenticated|auth session missing|refresh token/i.test(message)) {
    return "Tu sesión venció. Volvé a entrar.";
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "No tenés permiso para esto.";
  }
  if (code === "PGRST116" || /0 rows|no rows/i.test(message)) {
    return "No encontramos esto. Puede haber sido dado de baja.";
  }
  if (code === "23505" || /duplicate key|unique constraint/i.test(message)) {
    return "Eso ya existe.";
  }
  if (code === "23503" || /foreign key/i.test(message)) {
    return "Falta algo relacionado: puede haber sido dado de baja.";
  }
  if (code === "23514" || /check constraint/i.test(message)) {
    return "Algún dato está fuera de rango.";
  }
  return "No se pudo guardar. Probá de nuevo.";
}

function sentence(s: string) {
  const t = s.trim();
  if (!t) return t;
  const cap = t[0].toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}
