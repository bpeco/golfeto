"use client";

import type { ComponentProps, ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { cn } from "@/lib/utils";

/**
 * Hoja desde abajo (Drawer de Base UI): se cierra deslizando hacia abajo, con Escape o tocando
 * el fondo, atrapa el foco y lo devuelve al disparador. Es la única superficie elevada junto
 * con el toast: rounded-t-xl y shadow-raised.
 */
export const Sheet = Drawer.Root;
export const SheetTrigger = Drawer.Trigger;
export const SheetClose = Drawer.Close;

export function SheetContent({
  className,
  children,
  ...props
}: Drawer.Popup.Props & { children: ReactNode }) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop
        className={cn(
          "fixed inset-0 z-50 min-h-dvh bg-scrim opacity-[calc(0.45*(1-var(--drawer-swipe-progress)))]",
          "transition-opacity duration-320 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0",
          "data-swiping:duration-0 motion-reduce:transition-none",
        )}
      />
      <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
        <Drawer.Popup
          data-slot="sheet"
          className={cn(
            "relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-xl bg-surface-raised text-foreground shadow-raised outline-none",
            "pb-[env(safe-area-inset-bottom)] [transform:translateY(var(--drawer-swipe-movement-y))]",
            "transition-transform duration-320 ease-out data-swiping:select-none data-swiping:duration-0",
            "data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
            "motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
          <Drawer.Content className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-2 pb-4">{children}</Drawer.Content>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-4 grid gap-1", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: Drawer.Title.Props) {
  return <Drawer.Title className={cn("text-xl font-semibold text-balance", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: Drawer.Description.Props) {
  return <Drawer.Description className={cn("text-base text-muted-foreground text-pretty", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-6 grid gap-2", className)} {...props} />;
}
