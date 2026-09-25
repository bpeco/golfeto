import type { ExternalToast } from "sonner";

// sonner no entra en el primer JS: el Toaster se monta en un momento libre (o con el primer
// toast) y recién ahí se muestran los pedidos. Misma forma que `toast` de sonner.
let markReady: () => void = () => {};
const ready = new Promise<void>((resolve) => {
  markReady = resolve;
});
let requestMount: () => void = () => {};

/** Lo llama el Toaster al montarse, ya suscripto a la cola de sonner. */
export function toasterMounted() {
  markReady();
}

/** Lo registra el Toaster para montarse antes de tiempo si llega un toast. */
export function onToastRequested(fn: () => void) {
  requestMount = fn;
}

type Kind = "message" | "success" | "error";

function show(kind: Kind, message: string, data?: ExternalToast) {
  requestMount();
  void Promise.all([import("sonner"), ready]).then(([{ toast: sonner }]) => {
    if (kind === "message") sonner(message, data);
    else sonner[kind](message, data);
  });
}

export const toast = Object.assign((message: string, data?: ExternalToast) => show("message", message, data), {
  success: (message: string, data?: ExternalToast) => show("success", message, data),
  error: (message: string, data?: ExternalToast) => show("error", message, data),
});
