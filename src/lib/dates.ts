/** Hoy en Buenos Aires ("2026-09-25"). toISOString daría mañana después de las 21. */
export function todayInArgentina(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
}
