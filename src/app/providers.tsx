"use client";

import type { ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import { ThemeProvider } from "@/components/theme-provider";
import { NavTracker } from "@/components/ui/back-button";
import { Toaster } from "@/components/ui/sonner";

/** Proveedores del cliente: tema → motion liviano (solo m.*) → toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LazyMotion features={domAnimation} strict>
        <NavTracker />
        {children}
        <Toaster />
      </LazyMotion>
    </ThemeProvider>
  );
}
