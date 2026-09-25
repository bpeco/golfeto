/**
 * Formato de números y fechas en pantalla (es-AR). Hecho a mano y no con Intl para que el
 * servidor y el navegador den exactamente lo mismo (sin diferencias de ICU que rompan la hidratación).
 */

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Signo menos tipográfico (U+2212): mismo ancho que el "+" en numerales tabulares. */
export const MINUS = "−";

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** "12 sep 2026", o "12 sep" con `{ year: false }`. */
export function formatDate(iso: string, opts: { year?: boolean } = {}) {
  const { y, m, d } = parts(iso);
  const base = `${d} ${MONTHS[m - 1]}`;
  return opts.year === false ? base : `${base} ${y}`;
}

/** Fecha de una partida: "aprox." delante si la fecha es aproximada (historial importado). */
export function formatRoundDate(iso: string, approximate: boolean, opts: { year?: boolean } = {}) {
  return `${approximate ? "aprox. " : ""}${formatDate(iso, opts)}`;
}

/** "Septiembre 2026": encabezado de mes en listas de partidas. */
export function formatMonth(iso: string) {
  const { y, m } = parts(iso);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Un decimal con coma: 21.3 → "21,3". */
export function fmtDecimal(n: number, digits = 1) {
  const fixed = Math.abs(n).toFixed(digits).replace(".", ",");
  return n < 0 && Number(fixed.replace(",", ".")) !== 0 ? `${MINUS}${fixed}` : fixed;
}

/**
 * Hándicap Index con coma decimal. Los índices "plus" (mejores que scratch) se guardan
 * negativos y se muestran con "+", como en la AAG: −2.0 → "+2,0".
 */
export function fmtIndex(n: number | null | undefined) {
  if (n == null) return "—";
  const fixed = Math.abs(n).toFixed(1).replace(".", ",");
  return n < 0 ? `+${fixed}` : fixed;
}

/** Respecto del par: 0 → "E", 3 → "+3", −2 → "−2". */
export function fmtToPar(n: number | null | undefined) {
  if (n == null) return "—";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${MINUS}${Math.abs(n)}`;
}

/** Diferencia de índice con signo: −0.4 → "−0,4", 0.3 → "+0,3". */
export function fmtDelta(n: number) {
  if (n === 0) return "0,0";
  return `${n > 0 ? "+" : MINUS}${Math.abs(n).toFixed(1).replace(".", ",")}`;
}

/** "1 tarjeta", "12 tarjetas". */
export function fmtCount(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Acepta coma o punto decimal ("18,4" o "18.4"); null si está vacío o no es número. */
export function parseDecimal(raw: string): number | null {
  const s = raw.trim().replace(",", ".").replace(MINUS, "-");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
