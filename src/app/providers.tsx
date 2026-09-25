"use client";

import type { ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import { FlashToaster } from "@/components/flash-toaster";
import { HapticsIOS } from "@/components/haptics-ios";
import { ThemeProvider } from "@/components/theme-provider";
import { NavTracker } from "@/components/ui/back-button";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/use-confirm";

/** Proveedores del cliente: tema → motion liviano (solo m.*) → confirmaciones → toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LazyMotion features={domAnimation} strict>
        <ConfirmProvider>
          <NavTracker />
          {children}
          <Toaster />
          <FlashToaster />
          <HapticsIOS />
        </ConfirmProvider>
      </LazyMotion>
    </ThemeProvider>
  );
}
