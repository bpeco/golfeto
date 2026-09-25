/**
 * Notación de la tarjeta de papel: círculo = birdie, doble círculo = eagle o mejor,
 * cuadrado = bogey, doble cuadrado = doble bogey o peor, barra = Hoyo no terminado.
 * La forma lleva el significado; el color (rojo bajo par, azul sobre par) solo lo refuerza.
 */

export type NotationShape = "none" | "circle" | "double-circle" | "square" | "double-square" | "slash";
export type NotationTone = "under" | "par" | "over" | "picked-up" | "empty";

export type Notation = {
  shape: NotationShape;
  tone: NotationTone;
  /** Golpes respecto del par; null sin golpes o en Hoyo no terminado. */
  toPar: number | null;
  /** Nombre del resultado para lectores de pantalla ("bogey", "birdie", "Hoyo no terminado"). */
  name: string;
};

export function notationFor(strokes: number | null | undefined, par: number, pickedUp = false): Notation {
  if (pickedUp) return { shape: "slash", tone: "picked-up", toPar: null, name: "Hoyo no terminado" };
  if (strokes == null) return { shape: "none", tone: "empty", toPar: null, name: "sin golpes" };
  const d = strokes - par;
  if (strokes === 1) return { shape: "double-circle", tone: "under", toPar: d, name: "hoyo en uno" };
  if (d <= -3) return { shape: "double-circle", tone: "under", toPar: d, name: "albatros" };
  if (d === -2) return { shape: "double-circle", tone: "under", toPar: d, name: "eagle" };
  if (d === -1) return { shape: "circle", tone: "under", toPar: d, name: "birdie" };
  if (d === 0) return { shape: "none", tone: "par", toPar: 0, name: "par" };
  if (d === 1) return { shape: "square", tone: "over", toPar: d, name: "bogey" };
  if (d === 2) return { shape: "double-square", tone: "over", toPar: d, name: "doble bogey" };
  if (d === 3) return { shape: "double-square", tone: "over", toPar: d, name: "triple bogey" };
  return { shape: "double-square", tone: "over", toPar: d, name: `${d} sobre par` };
}

/** "5 golpes, bogey"; "Hoyo no terminado"; "Sin golpes". */
export function notationLabel(strokes: number | null | undefined, par: number, pickedUp = false): string {
  const n = notationFor(strokes, par, pickedUp);
  if (n.tone === "picked-up") return "Hoyo no terminado";
  if (n.tone === "empty") return "Sin golpes";
  return `${strokes} ${strokes === 1 ? "golpe" : "golpes"}, ${n.name}`;
}
