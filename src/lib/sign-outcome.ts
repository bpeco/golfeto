import { fmtIndex } from "./format";

export type SignOutcomeInput = {
  indexBefore: number | null;
  sourceBefore: "calculado" | "declarado" | null;
  indexAfter: number | null;
  sourceAfter: "calculado" | "declarado" | null;
  signedCount: number;
};

/** La frase del momento de firmar: qué pasó con el Hándicap Index. */
export function signOutcomeText(o: SignOutcomeInput): string {
  if (o.sourceAfter !== "calculado" || o.indexAfter == null) {
    const missing = Math.max(0, 3 - o.signedCount);
    if (missing === 0) return "Tarjeta firmada.";
    return `Te ${missing === 1 ? "falta 1 tarjeta firmada" : `faltan ${missing} tarjetas firmadas`} para tener Hándicap Index.`;
  }
  if (o.sourceBefore !== "calculado" || o.indexBefore == null) {
    return `Ya tenés Hándicap Index: ${fmtIndex(o.indexAfter)}.`;
  }
  if (o.indexBefore === o.indexAfter) return `Tu Hándicap Index sigue en ${fmtIndex(o.indexAfter)}.`;
  return `Con esta tarjeta tu Hándicap Index pasa de ${fmtIndex(o.indexBefore)} a ${fmtIndex(o.indexAfter)}.`;
}
