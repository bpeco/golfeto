/**
 * Cómo anotó cada jugador en la tarjeta de papel: los golpes del hoyo (5, 4, 6) o cuántos
 * sobre el par (+1, 0, -1). El modelo lee lo escrito y dice qué notación es; la cuenta la hace la app.
 */
export type Notation = "golpes" | "sobrePar";

/** Golpes por hoyo a partir de lo escrito. Sobre el par: par + valor; lo que daría menos de 1 golpe queda vacío. */
export function toStrokes(values: (number | null)[], pars: (number | null)[], notation: Notation): (number | null)[] {
  return values.map((v, i) => {
    if (v == null) return null;
    const par = pars[i];
    const strokes = notation === "golpes" ? v : par == null ? null : par + v;
    return strokes == null || strokes < 1 || strokes > 30 ? null : strokes;
  });
}
