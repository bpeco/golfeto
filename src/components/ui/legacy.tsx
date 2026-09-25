/**
 * TEMPORAL (Fases 1–5 del rediseño): las piezas del viejo src/components/ui.tsx sobre los
 * tokens nuevos, para que las pantallas todavía no rediseñadas no queden "sin estilo".
 * Se borra al cerrar la Fase 5 (`rg "ui/legacy" src` tiene que dar vacío).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { controlClass } from "./control-class";
import { Notice } from "./notice";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-border bg-card p-4", className)}>{children}</div>;
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: variant === "primary" ? "default" : "secondary", size: "sm" }), className)}>
      {children}
    </Link>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass = cn(controlClass, "h-tap px-3");

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border-y border-dashed border-line-strong py-6 text-base text-muted-foreground">{children}</p>;
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <Notice tone="error">{message}</Notice>;
}
