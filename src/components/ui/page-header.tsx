import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";

/**
 * Cabecera fija de cada pantalla: volver (opcional), título de 20 px truncado, una acción
 * (ícono o menú) y, abajo, metadatos como chips. Paga la safe area de arriba (iOS con
 * barra de estado translúcida).
 */
export function PageHeader({
  title,
  back,
  action,
  meta,
  className,
}: {
  title: ReactNode;
  back?: { fallback: string };
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-4 border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md",
        "supports-[not(backdrop-filter:blur(0))]:bg-background",
        className,
      )}
    >
      <div className="flex min-h-14 items-center gap-2">
        {back && <BackButton fallback={back.fallback} />}
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h1>
        {action && <div className="-mr-2 flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-3 text-sm text-muted-foreground">{meta}</div>}
    </header>
  );
}
