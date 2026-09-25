/**
 * Totales de una tarjeta como en el papel: Ida (1–9), Vuelta (10–18) y Total; en una cancha
 * de 9 jugada dos veces, 1.ª y 2.ª vuelta. Puro: lo usan la grilla, el modo foco y la firma.
 */

export type HoleScore = { strokes: number | null; pickedUp: boolean };
export type PositionedHole = { position: number; hole: { number: number; par: number } };

export type Segment = {
  label: string;
  /** Posiciones (1..N) que suma este tramo. */
  positions: number[];
  par: number;
  /** Suma de golpes de los hoyos con golpes. */
  gross: number;
  /** Hoyos con golpes o marcados como no terminados. */
  played: number;
  /** Golpes respecto del par de los hoyos con golpes. */
  toPar: number;
};

export type CardTotals = {
  segments: Segment[];
  par: number;
  gross: number;
  toPar: number;
  /** Hoyos con golpes. */
  withStrokes: number;
  pickedUp: number;
  holes: number;
  /** Todos los hoyos tienen golpes (sin Hoyos no terminados): recién ahí se muestra el Neto. */
  complete: boolean;
  /** Gross − hándicap de cancha, solo con la tarjeta completa. */
  net: number | null;
};

function sum(positions: PositionedHole[], scores: Record<number, HoleScore | undefined>, label: string): Segment {
  let gross = 0;
  let played = 0;
  let toPar = 0;
  let par = 0;
  for (const { position, hole } of positions) {
    par += hole.par;
    const s = scores[position];
    if (s?.pickedUp) played++;
    else if (s?.strokes != null) {
      gross += s.strokes;
      toPar += s.strokes - hole.par;
      played++;
    }
  }
  return { label, positions: positions.map((p) => p.position), par, gross, played, toPar };
}

export function segmentsFor<T extends PositionedHole>(positions: T[], loops: number): { label: string; positions: T[] }[] {
  if (positions.length !== 18) return [];
  const [first, second] = [positions.slice(0, 9), positions.slice(9)];
  return loops === 2
    ? [
        { label: "1.ª vuelta", positions: first },
        { label: "2.ª vuelta", positions: second },
      ]
    : [
        { label: "Ida", positions: first },
        { label: "Vuelta", positions: second },
      ];
}

export function cardTotals(
  positions: PositionedHole[],
  scores: Record<number, HoleScore | undefined>,
  opts: { loops?: number; courseHandicap?: number | null } = {},
): CardTotals {
  const segments = segmentsFor(positions, opts.loops ?? 1).map((s) => sum(s.positions, scores, s.label));
  const total = sum(positions, scores, "Total");
  let withStrokes = 0;
  let pickedUp = 0;
  for (const { position } of positions) {
    const s = scores[position];
    if (s?.pickedUp) pickedUp++;
    else if (s?.strokes != null) withStrokes++;
  }
  const complete = positions.length > 0 && withStrokes === positions.length;
  return {
    segments,
    par: total.par,
    gross: total.gross,
    toPar: total.toPar,
    withStrokes,
    pickedUp,
    holes: positions.length,
    complete,
    net: complete && opts.courseHandicap != null ? total.gross - opts.courseHandicap : null,
  };
}

/** Primer hoyo sin golpes ni marca (para abrir la partida donde quedó); null si están todos. */
export function nextUnplayed(positions: PositionedHole[], scores: Record<number, HoleScore | undefined>): number | null {
  for (const { position } of positions) {
    const s = scores[position];
    if (!s || (s.strokes == null && !s.pickedUp)) return position;
  }
  return null;
}
