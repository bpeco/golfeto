"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { canGoBack, trackPath } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

/** Vuelve a la pantalla anterior si es de la app; si no, a `fallback` (la ruta padre). */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={() => (canGoBack() ? router.back() : router.push(fallback))}
      className={cn(
        "-ml-2 flex size-tap shrink-0 items-center justify-center rounded-full text-foreground outline-none",
        "transition-colors duration-120 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <ChevronLeft aria-hidden className="size-6" strokeWidth={2.25} />
    </button>
  );
}

/** Registra cada cambio de ruta para que BackButton sepa si hay historial propio. */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPath(pathname);
  }, [pathname]);
  return null;
}
