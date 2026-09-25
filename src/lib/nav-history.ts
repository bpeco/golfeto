"use client";

/**
 * Cuántas navegaciones propias hay para atrás en esta carga de la página. Sirve para que
 * "Volver" haga router.back() solo si lo anterior es de la app; si se entró por un link
 * directo (WhatsApp, notificación, recarga), vuelve a la ruta padre.
 * Vive en memoria a propósito: después de recargar no se sabe qué hay en el historial.
 */
let depth = 0;
let lastPath: string | null = null;
let popped = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popped = true;
  });
}

export function trackPath(path: string) {
  if (lastPath !== null && lastPath !== path) {
    if (popped) depth = Math.max(0, depth - 1);
    else depth++;
  }
  popped = false;
  lastPath = path;
}

export function canGoBack() {
  return depth > 0;
}
