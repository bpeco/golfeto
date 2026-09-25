"use client";

import { useEffect } from "react";

/** Marca que la app ya arrancó (después del reveal del primer pintado). Ver .reveal-stagger. */
export function LaunchMarker() {
  useEffect(() => {
    const t = setTimeout(() => {
      document.documentElement.dataset.launched = "1";
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/** true si la página ya había arrancado cuando se montó el componente (navegación interna). */
export function alreadyLaunched() {
  return typeof document !== "undefined" && document.documentElement.dataset.launched === "1";
}
