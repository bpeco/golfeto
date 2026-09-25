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
let replacing = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popped = true;
  });
}

export function trackPath(path: string) {
  if (lastPath !== null && lastPath !== path) {
    if (popped) depth = Math.max(0, depth - 1);
    else if (!replacing) depth++;
  }
  popped = false;
  replacing = false;
  lastPath = path;
}

/**
 * La próxima navegación reemplaza la entrada actual (un `redirect(..., RedirectType.replace)`
 * de una acción): no suma profundidad. Llamarla justo antes de la acción; si la acción falla
 * y no redirige, `cancelReplace()`. Ante la duda, contar de menos es seguro (Volver va a la
 * ruta padre); contar de más deja a Volver sin hacer nada.
 */
export function expectReplace() {
  replacing = true;
}

export function cancelReplace() {
  replacing = false;
}

export function canGoBack() {
  return depth > 0;
}
