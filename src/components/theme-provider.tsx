"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { THEME_HEX } from "@/lib/theme-colors";

/**
 * Tema claro/oscuro con clase en <html>. "Sistema" por defecto; Perfil permite fijarlo
 * (se guarda en localStorage). Acompaña el color de la barra del sistema (theme-color).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="galf:theme">
      <ThemeColorSync />
      {children}
    </NextThemes>
  );
}

function ThemeColorSync() {
  const { resolvedTheme, theme } = useTheme();
  useEffect(() => {
    if (!resolvedTheme) return;
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    metas.forEach((meta) => {
      if (!meta.dataset.media) meta.dataset.media = meta.media;
      // Con el tema del sistema, las <meta> con media ya resuelven solas; con uno fijo, mandan las dos.
      if (theme === "system") {
        meta.media = meta.dataset.media ?? "";
        meta.content = meta.media.includes("dark") ? THEME_HEX.pizarra : THEME_HEX.papel;
      } else {
        meta.content = resolvedTheme === "dark" ? THEME_HEX.pizarra : THEME_HEX.papel;
      }
    });
  }, [resolvedTheme, theme]);
  return null;
}
