import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * La pizarra de resultados del club: el único elemento "fuerte" de Inicio y de Grupo.
 * Adentro, bajo/sobre par usan las variantes claras de rojo y azul (contraste sobre verde).
 */
export function Board({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="board"
      className={cn(
        "rounded-xl bg-board p-4 text-board-foreground ring-1 ring-inset ring-board-foreground/10",
        "[--score-under:var(--board-under)] [--score-over:var(--board-over)] [--muted-foreground:var(--board-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function BoardLabel({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-board-muted", className)} {...props} />;
}
