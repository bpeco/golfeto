import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bloque de una pantalla con encabezado en sentence case (nada de eyebrows en mayúsculas). */
export function Section({
  title,
  action,
  children,
  className,
  id,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={headingId} className={cn("mt-8 first:mt-0", className)}>
      <div className="mb-2 flex min-h-tap items-center justify-between gap-3">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {action && <div className="shrink-0 text-sm font-semibold">{action}</div>}
      </div>
      {children}
    </section>
  );
}
