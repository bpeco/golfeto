/**
 * Hándicap Index (Regla 5): mejores 8 de las últimas 20 tarjetas, tabla para
 * menos de 20, topes soft y hard, y reducción por tarjeta excepcional.
 */
import { roundTo1 } from "./course";

export const MAX_HANDICAP_INDEX = 54.0;

/** Regla 5.2a: cuántos diferenciales se promedian y qué ajuste se aplica. */
export function selectionFor(count: number): { use: number; adjustment: number } | null {
  if (count < 3) return null;
  if (count === 3) return { use: 1, adjustment: -2.0 };
  if (count === 4) return { use: 1, adjustment: -1.0 };
  if (count === 5) return { use: 1, adjustment: 0 };
  if (count === 6) return { use: 2, adjustment: -1.0 };
  if (count <= 8) return { use: 2, adjustment: 0 };
  if (count <= 11) return { use: 3, adjustment: 0 };
  if (count <= 14) return { use: 4, adjustment: 0 };
  if (count <= 16) return { use: 5, adjustment: 0 };
  if (count <= 18) return { use: 6, adjustment: 0 };
  if (count === 19) return { use: 7, adjustment: 0 };
  return { use: 8, adjustment: 0 };
}

/**
 * Index "crudo" a partir de los diferenciales más recientes (máximo 20),
 * sin topes. Devuelve null con menos de 3 tarjetas.
 */
export function rawHandicapIndex(recentDifferentials: number[]): number | null {
  const last20 = recentDifferentials.slice(0, 20);
  const sel = selectionFor(last20.length);
  if (!sel) return null;
  const best = [...last20].sort((a, b) => a - b).slice(0, sel.use);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.min(MAX_HANDICAP_INDEX, roundTo1(avg + sel.adjustment));
}

/**
 * Regla 5.8: soft cap (por encima de +3.0 sobre el Low Index, la suba se
 * reduce a la mitad) y hard cap (nunca más de +5.0). Solo aplica si hay
 * Low Handicap Index (récord con al menos 20 tarjetas en el último año).
 */
export function applyCaps(raw: number, lowHandicapIndex: number | null): number {
  if (lowHandicapIndex == null) return raw;
  const rise = raw - lowHandicapIndex;
  if (rise <= 3.0) return raw;
  const softCapped = lowHandicapIndex + 3.0 + (rise - 3.0) * 0.5;
  return roundTo1(Math.min(softCapped, lowHandicapIndex + 5.0));
}

/** Regla 5.9: reducción por tarjeta excepcional. */
export function exceptionalReduction(differential: number, handicapIndexBefore: number): number {
  const gap = handicapIndexBefore - differential;
  if (gap >= 10.0) return -2.0;
  if (gap >= 7.0) return -1.0;
  return 0;
}

export type PostedScore = {
  id: string;
  /** Fecha de la partida (ISO yyyy-mm-dd). */
  playedOn: string;
  differential: number;
};

export type IndexPoint = {
  scoreId: string;
  playedOn: string;
  /** Diferencial tal como quedó en el récord (con reducciones aplicadas). */
  differential: number;
  handicapIndex: number | null;
  lowHandicapIndex: number | null;
};

/**
 * Recorre el récord en orden cronológico y devuelve el Index después de cada
 * tarjeta, aplicando reducción excepcional y topes como el WHS. Sirve tanto
 * para el Index actual (último punto) como para el gráfico de evolución.
 */
export function handicapHistory(scores: PostedScore[]): IndexPoint[] {
  const ordered = [...scores].sort(
    (a, b) => a.playedOn.localeCompare(b.playedOn) || a.id.localeCompare(b.id),
  );
  // Diferenciales del récord, mutables porque la reducción excepcional
  // modifica las 20 tarjetas más recientes.
  const record: { id: string; playedOn: string; differential: number }[] = [];
  const points: IndexPoint[] = [];
  const indexByDate: { playedOn: string; index: number }[] = [];

  for (const s of ordered) {
    const before = points.at(-1)?.handicapIndex ?? null;
    let differential = s.differential;

    if (before != null) {
      const reduction = exceptionalReduction(s.differential, before);
      if (reduction !== 0) {
        for (const r of record.slice(-19)) r.differential = roundTo1(r.differential + reduction);
        differential = roundTo1(differential + reduction);
      }
    }
    record.push({ id: s.id, playedOn: s.playedOn, differential });

    const recent = record.slice(-20).reverse().map((r) => r.differential);
    const raw = rawHandicapIndex(recent);
    const low = lowIndexInLastYear(indexByDate, s.playedOn, record.length);
    const index = raw == null ? null : applyCaps(raw, low);

    if (index != null) indexByDate.push({ playedOn: s.playedOn, index });
    points.push({
      scoreId: s.id,
      playedOn: s.playedOn,
      differential,
      handicapIndex: index,
      lowHandicapIndex: low,
    });
  }
  return points;
}

/** Regla 5.7: el Index más bajo de los 365 días previos; existe con 20 tarjetas en el récord. */
function lowIndexInLastYear(
  history: { playedOn: string; index: number }[],
  asOf: string,
  recordSize: number,
): number | null {
  if (recordSize < 20) return null;
  const from = shiftDays(asOf, -365);
  const window = history.filter((h) => h.playedOn >= from && h.playedOn < asOf);
  if (window.length === 0) return null;
  return Math.min(...window.map((h) => h.index));
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Index vigente para un golfista: el calculado si existe, si no el declarado. */
export function effectiveIndex(
  computed: number | null,
  declared: number | null,
): { value: number | null; source: "calculado" | "declarado" | null } {
  if (computed != null) return { value: computed, source: "calculado" };
  if (declared != null) return { value: declared, source: "declarado" };
  return { value: null, source: null };
}
