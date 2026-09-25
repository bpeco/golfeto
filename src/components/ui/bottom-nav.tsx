"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, ClipboardList, House, LandPlot, Users, type LucideIcon } from "lucide-react";
import { isTabActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/", label: "Inicio", icon: House, exact: true },
  { href: "/partidas", label: "Partidas", icon: ClipboardList },
  { href: "/grupos", label: "Grupos", icon: Users },
  { href: "/canchas", label: "Canchas", icon: LandPlot },
  { href: "/perfil", label: "Perfil", icon: CircleUserRound },
];

/**
 * Barra de 5 pestañas abajo (zona del pulgar). La activa va en tinta con el ícono relleno.
 * Es la dueña de la safe area de abajo: el contenido deja lugar con --nav-h.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones"
      style={{ viewTransitionName: "bottom-nav" }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-background"
    >
      <ul className="mx-auto flex h-(--nav-h) max-w-lg items-stretch">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href, tab.exact);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-semibold outline-none",
                  "transition-colors duration-120 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <tab.icon
                  aria-hidden
                  className={cn("size-6", active && "fill-foreground/15")}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {tab.label}
                <TabPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mientras navega a una pestaña, una rayita arriba (sin mover nada). */
function TabPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary opacity-0 transition-opacity duration-120",
        pending && "opacity-100 delay-120",
      )}
    />
  );
}
