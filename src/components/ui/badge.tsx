import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Etiqueta chica. Toda badge lleva texto (o ícono + texto): nunca color solo.
 * `signed` agrega el tilde; el resto lleva lo que se le pase.
 */
export const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        outline: "border-input text-foreground",
        under: "border-score-under/40 text-score-under",
        over: "border-score-over/40 text-score-over",
        warn: "border-warn/60 bg-warn/15 text-foreground [&_svg]:text-warn-ink",
        signed: "border-primary/40 text-primary",
        guest: "border-dashed border-line-strong text-muted-foreground",
        destructive: "border-destructive/40 text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, children, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props}>
      {tone === "signed" && <Check aria-hidden strokeWidth={3} />}
      {children}
    </span>
  );
}
