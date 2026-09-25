export const FLASH_COOKIE = "galf-flash";

export type Flash = { message: string; tone: "success" | "info" | "error" };

/** Lee y valida el valor de la cookie (viene del navegador: no se confía). */
export function parseFlash(raw: string | undefined): Flash | null {
  if (!raw) return null;
  try {
    let decoded = raw;
    // Next codifica el valor al escribir la cookie; nosotros también: se decodifica hasta que quede JSON.
    for (let i = 0; i < 3 && !decoded.startsWith("{"); i++) decoded = decodeURIComponent(decoded);
    const v = JSON.parse(decoded) as Partial<Flash>;
    if (typeof v.message !== "string" || !v.message) return null;
    const tone = v.tone === "info" || v.tone === "error" ? v.tone : "success";
    return { message: v.message.slice(0, 200), tone };
  } catch {
    return null;
  }
}
