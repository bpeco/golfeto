"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

export type Action = { label: string; icon?: ReactNode; onSelect: () => void; destructive?: boolean };

/** Hoja de acciones desde abajo (se carga aparte, al abrir el menú por primera vez). */
export default function ActionSheet({ open, title, actions, onOpenChange }: { open: boolean; title: string; actions: Action[]; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <ul className="-mx-4 divide-y divide-border">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  a.onSelect();
                }}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold outline-none",
                  "hover:bg-accent focus-visible:bg-accent [&_svg]:size-5 [&_svg]:shrink-0",
                  a.destructive ? "text-destructive" : "text-foreground [&_svg]:text-muted-foreground",
                )}
              >
                {a.icon}
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
