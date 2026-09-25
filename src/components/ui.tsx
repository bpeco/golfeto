import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>{children}</div>;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-accent text-accent-foreground",
    secondary: "border border-border bg-surface",
    danger: "border border-red-300 text-red-700",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-50 ${styles} ${className}`}
    />
  );
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
  const styles = variant === "primary" ? "bg-accent text-accent-foreground" : "border border-border bg-surface";
  return (
    <Link href={href} className={`inline-block rounded-full px-5 py-2.5 text-center text-sm font-semibold ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{message}</p>;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtIndex(n: number | null) {
  if (n == null) return "—";
  return n < 0 ? `+${Math.abs(n).toFixed(1)}` : n.toFixed(1);
}
