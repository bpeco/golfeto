/**
 * Vibración corta como confirmación física. Android: navigator.vibrate. iOS no expone vibración
 * a la web; hay un truco (tocar por código la etiqueta de un <input type="checkbox" switch>,
 * Safari 17.4+) que queda detrás de NEXT_PUBLIC_GALF_IOS_HAPTICS=1 hasta probarlo en un iPhone.
 * Siempre sincrónico dentro del handler del toque, y nunca con "reducir movimiento".
 */
const IOS_FLAG = process.env.NEXT_PUBLIC_GALF_IOS_HAPTICS === "1";
export const IOS_HAPTIC_LABEL_ID = "galf-haptic";

function reduced() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || reduced()) return;
  if (typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* algunos navegadores tiran si no hay gesto: se ignora */
    }
    return;
  }
  if (IOS_FLAG) {
    const pulses = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
    const label = document.getElementById(IOS_HAPTIC_LABEL_ID);
    for (let i = 0; i < pulses; i++) label?.click();
  }
}

export const iosHapticsEnabled = IOS_FLAG;

export const haptics = {
  /** Un golpe más o menos, un toggle. */
  tap: () => vibrate(10),
  /** Firma, foto aplicada. */
  success: () => vibrate([12, 30, 12]),
  /** Hoyo no terminado, confirmación destructiva. */
  warn: () => vibrate(30),
};
