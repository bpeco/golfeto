"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Botón de envío que se pone pendiente solo (useFormStatus del <form> que lo contiene). */
export function SubmitButton({ pendingLabel, ...props }: Omit<ComponentProps<typeof Button>, "type" | "pending"> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" pending={pending} pendingLabel={pendingLabel} {...props} />;
}
