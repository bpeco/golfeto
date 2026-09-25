import type { ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { icon: Info, box: "bg-muted", iconClass: "text-muted-foreground" },
  warn: { icon: TriangleAlert, box: "bg-warn/15", iconClass: "text-warn-ink" },
  error: { icon: CircleX, box: "bg-destructive/10", iconClass: "text-destructive" },
  success: { icon: CircleCheck, box: "bg-primary/10", iconClass: "text-primary" },
} as const;

/**
 * Aviso dentro de la página (no flota): ícono + texto + acción opcional. Reemplaza al
 * ErrorBanner. Los errores se anuncian (role="alert"); el resto es informativo.
 */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-md px-3 py-3 text-base", t.box, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", t.iconClass)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-pretty">{title}</p>}
        {children && <div className={cn("text-pretty", title && "mt-0.5 text-sm text-muted-foreground")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
