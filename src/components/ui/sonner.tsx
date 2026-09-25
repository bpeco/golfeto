"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { onToastRequested } from "@/lib/toast";

const ToasterInner = dynamic(() => import("./toaster-inner"), { ssr: false });

/**
 * El Toaster de sonner, fuera del primer JS: se monta en un momento libre después de cargar
 * o con el primer `toast()` de `@/lib/toast`, lo que pase antes.
 */
export function Toaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    onToastRequested(() => setMounted(true));
    const idle = window.requestIdleCallback?.bind(window) ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => setMounted(true));
  }, []);
  return mounted ? <ToasterInner /> : null;
}
