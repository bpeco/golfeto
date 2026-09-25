"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  /** Pide un motivo (p. ej. al desfirmar). */
  reason?: { label: string; maxLength?: number; required?: boolean; placeholder?: string };
};

export type ConfirmResult = { ok: true; reason?: string } | { ok: false };

type Pending = { options: ConfirmOptions; resolve: (r: ConfirmResult) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<ConfirmResult>) | null>(null);

const loadSheet = () => import("./confirm-sheet");
const ConfirmSheet = dynamic(loadSheet, { ssr: false });

/**
 * Confirmación en una hoja desde abajo, en vez del confirm() nativo. Escape, tocar el fondo o
 * deslizar hacia abajo cancelan. `await confirm({...})` devuelve { ok, reason? }.
 * La hoja se baja aparte (en un momento libre después de cargar), no en el primer JS.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window) ?? ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => void loadSheet());
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<ConfirmResult>((resolve) => {
      settled.current = false;
      setPending({ options, resolve });
      setOpen(true);
    });
  }, []);

  function settle(result: ConfirmResult) {
    if (settled.current || !pending) return;
    settled.current = true;
    pending.resolve(result);
    setOpen(false);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      {pending && <ConfirmSheet open={open} options={pending.options} onSettle={settle} onClosed={() => setPending(null)} />}
    </ConfirmContext>
  );
}

export function useConfirm() {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error("useConfirm necesita ConfirmProvider (src/app/providers.tsx)");
  return confirm;
}
