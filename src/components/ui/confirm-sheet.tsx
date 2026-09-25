"use client";

import { useState } from "react";
import { haptics } from "@/lib/haptics";
import { Button } from "./button";
import { Field } from "./field";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./sheet";
import { Textarea } from "./textarea";
import type { ConfirmOptions, ConfirmResult } from "./use-confirm";

/** La hoja de confirmación (se carga aparte: la mayoría de las pantallas no la abre nunca). */
export default function ConfirmSheet({
  open,
  options: o,
  onSettle,
  onClosed,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onSettle: (result: ConfirmResult) => void;
  onClosed: () => void;
}) {
  const [reason, setReason] = useState("");
  const reasonMissing = !!o?.reason?.required && !reason.trim();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onSettle({ ok: false });
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setReason("");
          onClosed();
        }
      }}
    >
      {o && (
        <SheetContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reasonMissing) return;
              if (o.tone === "destructive") haptics.warn();
              onSettle({ ok: true, reason: o.reason ? reason.trim() || undefined : undefined });
            }}
          >
            <SheetHeader>
              <SheetTitle>{o.title}</SheetTitle>
              {o.body && <SheetDescription>{o.body}</SheetDescription>}
            </SheetHeader>
            {o.reason && (
              <Field label={o.reason.label}>
                <Textarea rows={2} value={reason} maxLength={o.reason.maxLength ?? 200} placeholder={o.reason.placeholder} onChange={(e) => setReason(e.target.value)} />
              </Field>
            )}
            <SheetFooter>
              <Button type="submit" size="lg" variant={o.tone === "destructive" ? "destructive" : "default"} disabled={reasonMissing}>
                {o.confirmLabel}
              </Button>
              <Button type="button" size="lg" variant="ghost" onClick={() => onSettle({ ok: false })}>
                {o.cancelLabel ?? "Cancelar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      )}
    </Sheet>
  );
}
