import type { ComponentProps, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

/**
 * Botón con los tamaños de la cancha: 44 px por defecto (mínimo táctil), 52 px para la acción
 * principal de una pantalla. Sin sombra; el press se ve con una escala corta.
 * Para links con forma de botón: `<Link className={buttonVariants(...)}>`.
 */
export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none",
    "transition-[transform,background-color,border-color,color] duration-120 ease-out active:scale-[0.97] motion-reduce:active:scale-100",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-input bg-card text-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-outline": "border border-destructive/50 text-destructive hover:bg-destructive/10",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-tap px-4 text-base",
        lg: "h-13 px-5 text-base",
        icon: "size-tap",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Deshabilita y muestra un spinner conservando el ancho del texto. */
    pending?: boolean;
    /** Texto mientras está pendiente ("Firmando…"). Si no hay, solo el spinner. */
    pendingLabel?: ReactNode;
  };

export function Button({ className, variant, size, pending = false, pendingLabel, disabled, children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (
        <>
          <span className={cn("inline-flex items-center gap-2", !pendingLabel && "invisible")} aria-hidden={!pendingLabel}>
            {pendingLabel ? (
              <>
                <Spinner />
                {pendingLabel}
              </>
            ) : (
              children
            )}
          </span>
          {!pendingLabel && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          )}
        </>
      ) : (
        children
      )}
    </button>
  );
}
