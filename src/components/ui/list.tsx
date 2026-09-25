import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkPending } from "./link-pending";

/** Lista con reglas de tarjeta (sin caja ni sombra). */
export function List({ className, ...props }: ComponentProps<"ul">) {
  return <ul role="list" className={cn("divide-y divide-border border-y border-border", className)} {...props} />;
}

/**
 * Fila de lista: `leading` (iniciales, punto de tee), título y meta en dos líneas, `trailing`
 * (número, badge). Con `href` es un link real con chevron y velo de navegación pendiente.
 */
export function ListRow({
  href,
  leading,
  title,
  meta,
  trailing,
  className,
  onClick,
}: {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold">{title}</span>
        {meta && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2">{trailing}</span>}
      {href && <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />}
    </>
  );
  const row = "relative flex min-h-14 items-center gap-3 py-2.5";
  return (
    <li className={className}>
      {href ? (
        <Link
          href={href}
          className={cn(row, "-mx-2 rounded-sm px-2 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring")}
        >
          {content}
          <LinkPending />
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cn(row, "-mx-2 w-[calc(100%+1rem)] rounded-sm px-2 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring")}>
          {content}
        </button>
      ) : (
        <div className={row}>{content}</div>
      )}
    </li>
  );
}
