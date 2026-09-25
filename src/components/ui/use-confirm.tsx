"use client";

import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { haptics } from "@/lib/haptics";
import { Button } from "./button";
import { Field } from "./field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./sheet";
import { Textarea } from "./textarea";

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

/**
 * Confirmación en una hoja desde abajo, en vez del confirm() nativo. Escape, tocar el fondo o
 * deslizar hacia abajo cancelan. `await confirm({...})` devuelve { ok, reason? }.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const settled = useRef(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<ConfirmResult>((resolve) => {
      settled.current = false;
      setReason("");
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

  const o = pending?.options;
  const reasonMissing = !!o?.reason?.required && !reason.trim();

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) settle({ ok: false });
        }}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setPending(null);
        }}
      >
        {o && (
          <SheetContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reasonMissing) return;
                if (o.tone === "destructive") haptics.warn();
                settle({ ok: true, reason: o.reason ? reason.trim() || undefined : undefined });
              }}
            >
              <SheetHeader>
                <SheetTitle>{o.title}</SheetTitle>
                {o.body && <SheetDescription>{o.body}</SheetDescription>}
              </SheetHeader>
              {o.reason && (
                <Field label={o.reason.label}>
                  <Textarea
                    rows={2}
                    value={reason}
                    maxLength={o.reason.maxLength ?? 200}
                    placeholder={o.reason.placeholder}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
              )}
              <SheetFooter>
                <Button type="submit" size="lg" variant={o.tone === "destructive" ? "destructive" : "default"} disabled={reasonMissing}>
                  {o.confirmLabel}
                </Button>
                <Button type="button" size="lg" variant="ghost" onClick={() => settle({ ok: false })}>
                  {o.cancelLabel ?? "Cancelar"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        )}
      </Sheet>
    </ConfirmContext>
  );
}

export function useConfirm() {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error("useConfirm necesita ConfirmProvider (src/app/providers.tsx)");
  return confirm;
}
