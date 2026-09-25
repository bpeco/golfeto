import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Vacío con dirección: qué falta y el botón para hacerlo, adentro. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-y border-dashed border-line-strong py-6", className)}>
      {Icon && <Icon aria-hidden className="mb-3 size-7 text-muted-foreground" strokeWidth={1.75} />}
      <p className="text-base font-semibold text-pretty">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground text-pretty">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
