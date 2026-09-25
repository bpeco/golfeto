"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Ellipsis } from "lucide-react";
import { Button } from "./button";
import type { Action } from "./action-sheet";

const loadSheet = () => import("./action-sheet");
const ActionSheet = dynamic(loadSheet, { ssr: false });

export type { Action };

/**
 * El menú ⋯ de la cabecera. Abre una hoja de acciones desde abajo: filas de 56 px en la zona
 * del pulgar, en vez de un menú flotante arriba a la derecha.
 */
export function ActionMenu({ label, actions, pending = false }: { label: string; actions: Action[]; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  if (actions.length === 0) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        pending={pending}
        onPointerDown={() => void loadSheet()}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <Ellipsis />
      </Button>
      {mounted && <ActionSheet open={open} title={label} actions={actions} onOpenChange={setOpen} />}
    </>
  );
}
