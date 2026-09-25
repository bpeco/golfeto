"use client";

import type { ReactNode } from "react";
import { FlashToaster } from "@/components/flash-toaster";
import { HapticsIOS } from "@/components/haptics-ios";
import { LaunchMarker } from "@/components/launch-marker";
import { ThemeProvider } from "@/components/theme-provider";
import { NavTracker } from "@/components/ui/back-button";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/use-confirm";

/**
 * Proveedores del cliente: tema → confirmaciones → toasts. Las animaciones son CSS
 * (globals.css), así que no hay proveedor de motion.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <NavTracker />
        {children}
        <Toaster />
        <FlashToaster />
        <HapticsIOS />
        <LaunchMarker />
      </ConfirmProvider>
    </ThemeProvider>
  );
}
