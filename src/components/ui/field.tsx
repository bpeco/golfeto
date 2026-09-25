"use client";

import { createContext, use, useId, type AriaAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type FieldIds = { id: string; describedBy?: string; invalid: boolean };

const FieldContext = createContext<FieldIds | null>(null);

/**
 * Etiqueta + control + ayuda + error. El control (Input, Textarea, Select, CellInput) toma
 * `id`, `aria-describedby` y `aria-invalid` del contexto: el que usa Field no arma ids a mano.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  labelHidden = false,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  /** Etiqueta solo para lectores de pantalla (p. ej. celdas de una grilla). */
  labelHidden?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext value={{ id, describedBy, invalid: !!error }}>
      <div data-slot="field" className={cn("grid gap-1.5", className)}>
        <Label htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
          {label}
        </Label>
        {children}
        {error && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </FieldContext>
  );
}

/** Props de accesibilidad para el control dentro de un Field (las explícitas ganan). */
export function useFieldControl(props: { id?: string } & Pick<AriaAttributes, "aria-describedby" | "aria-invalid">) {
  const field = use(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
  };
}
