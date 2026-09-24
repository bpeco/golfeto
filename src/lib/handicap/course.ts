/**
 * Cálculos por partida: hándicap de cancha, golpes recibidos por hoyo,
 * net double bogey y score ajustado. Reglas de Hándicap WHS (R&A/USGA, 2024),
 * que la AAG adopta sin cambios.
 */

export type HoleSpec = {
  /** Número del hoyo en la cancha (1..18). */
  number: number;
  par: number;
  /** Hándicap de hoyo (1 = más difícil). */
  strokeIndex: number;
};

export type HoleResult = {
  hole: HoleSpec;
  /** Golpes reales; null si no se jugó o si levantó la pelota. */
  strokes: number | null;
  /** Levantó la pelota sin embocar: cuenta net double bogey. */
  pickedUp: boolean;
};

export type TeeRating = {
  courseRating: number;
  slope: number;
  par: number;
};

/** Regla 6.1a. Hándicap Index × (Slope / 113) + (Course Rating − Par), redondeado. */
export function courseHandicap(handicapIndex: number, tee: TeeRating): number {
  return noNegativeZero(Math.round(handicapIndex * (tee.slope / 113) + (tee.courseRating - tee.par)));
}

/**
 * Hándicap de cancha para 9 hoyos (Regla 6.1a): la mitad del Index contra el
 * rating de 9 hoyos. Los ratings de 9 se pasan directamente en `tee`.
 */
export function courseHandicap9(handicapIndex: number, tee9: TeeRating): number {
  return noNegativeZero(Math.round((handicapIndex / 2) * (tee9.slope / 113) + (tee9.courseRating - tee9.par)));
}

/**
 * Golpes que recibe (positivo) o da (negativo) el golfista en un hoyo.
 * Con hándicap 20 en 18 hoyos: 1 golpe en todos y 2 en los de índice 1 y 2.
 * Con hándicap +2: da un golpe en los hoyos de índice 18 y 17.
 */
export function strokesOnHole(
  courseHcp: number,
  strokeIndex: number,
  holesInRound = 18,
): number {
  if (courseHcp >= 0) {
    const base = Math.floor(courseHcp / holesInRound);
    const extra = courseHcp % holesInRound;
    return base + (strokeIndex <= extra ? 1 : 0);
  }
  const given = -courseHcp;
  const base = Math.floor(given / holesInRound);
  const extra = given % holesInRound;
  // Los golpes que se dan salen de los hoyos más fáciles (índice más alto).
  return noNegativeZero(-(base + (strokeIndex > holesInRound - extra ? 1 : 0)));
}

/** Regla 3.1b: máximo por hoyo para el hándicap = par + 2 + golpes recibidos. */
export function netDoubleBogey(par: number, strokesReceived: number): number {
  return par + 2 + strokesReceived;
}

export type AdjustedGrossResult = {
  adjustedGross: number;
  /** Golpes reales sumados (solo hoyos con golpes). */
  gross: number;
  holesPlayed: number;
  /** false si no alcanza el mínimo de hoyos para que la tarjeta cuente. */
  acceptable: boolean;
};

/**
 * Score ajustado (Regla 3): cada hoyo se topea a net double bogey; un hoyo
 * levantado vale net double bogey; un hoyo no jugado vale par neto. Una tarjeta
 * de 18 necesita al menos 10 hoyos jugados (Regla 2.2); una de 9, los 9.
 */
export function adjustedGrossScore(
  results: HoleResult[],
  courseHcp: number,
  holesInRound: 18 | 9 = 18,
): AdjustedGrossResult {
  let adjustedGross = 0;
  let gross = 0;
  let holesPlayed = 0;

  for (const r of results) {
    const received = strokesOnHole(courseHcp, r.hole.strokeIndex, holesInRound);
    const ndb = netDoubleBogey(r.hole.par, received);
    if (r.pickedUp) {
      adjustedGross += ndb;
      holesPlayed += 1;
    } else if (r.strokes == null) {
      adjustedGross += r.hole.par + received;
    } else {
      adjustedGross += Math.min(r.strokes, ndb);
      gross += r.strokes;
      holesPlayed += 1;
    }
  }

  const minimum = holesInRound === 18 ? 10 : 9;
  return { adjustedGross, gross, holesPlayed, acceptable: holesPlayed >= minimum };
}

/** Regla 5.1a. (113 / Slope) × (Score ajustado − Course Rating − PCC), a un decimal. */
export function scoreDifferential(
  adjustedGross: number,
  tee: Pick<TeeRating, "courseRating" | "slope">,
  pcc = 0,
): number {
  const sd = (113 / tee.slope) * (adjustedGross - tee.courseRating - pcc);
  return roundTo1(sd);
}

/**
 * Regla 5.1b (2024): una tarjeta de 9 hoyos se convierte a diferencial de 18
 * sumando un diferencial esperado para los otros 9 según el Index del golfista.
 * Sin Index conocido, se duplica el diferencial de 9.
 */
export function differentialFrom9Holes(
  differential9: number,
  handicapIndex: number | null,
): number {
  if (handicapIndex == null) return roundTo1(differential9 * 2);
  const expected9 = 0.52 * handicapIndex + 1.2;
  return roundTo1(differential9 + expected9);
}

export function roundTo1(n: number): number {
  return noNegativeZero(Math.round((n + Number.EPSILON) * 10) / 10);
}

function noNegativeZero(n: number): number {
  return n === 0 ? 0 : n;
}
