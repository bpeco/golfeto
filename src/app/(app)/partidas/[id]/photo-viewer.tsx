"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Una foto de la tarjeta, grande. Se baja aparte, al tocar una miniatura. */
export default function PhotoViewer({ open, onOpenChange, url, label }: { open: boolean; onOpenChange: (open: boolean) => void; url: string | null; label: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-2">
        <DialogTitle className="sr-only">{label}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, sin optimizar */}
        {url && <img src={url} alt={label} className="h-auto w-full rounded-lg" />}
      </DialogContent>
    </Dialog>
  );
}
