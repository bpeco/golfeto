/**
 * Vibración corta como confirmación física. Solo Android (navigator.vibrate) y solo si el
 * usuario no pidió reducir movimiento; hay que llamarla sincrónicamente dentro del handler del
 * toque (el navegador la ignora fuera de un gesto). iOS no expone vibración a la web.
 */
function canVibrate() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function vibrate(pattern: number | number[]) {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* algunos navegadores tiran si no hay gesto: se ignora */
  }
}

export const haptics = {
  /** Un golpe más o menos, un toggle. */
  tap: () => vibrate(10),
  /** Firma, foto aplicada. */
  success: () => vibrate([12, 30, 12]),
  /** Hoyo no terminado, confirmación destructiva. */
  warn: () => vibrate(30),
};
