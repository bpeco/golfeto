"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/lib/toast";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { fmtIndex } from "@/lib/format";
import { saveDeclaredHandicap } from "./actions";

export function DeclaredHandicapForm({ current }: { current: number | null }) {
  const [state, action] = useActionState(saveDeclaredHandicap, null);
  useEffect(() => {
    if (state?.ok) toast.success(`Guardamos tu hándicap declarado: ${fmtIndex(state.data.value)}`);
  }, [state]);
  const error = state && !state.ok ? (state.fields?._ ?? state.error) : undefined;
  return (
    <form action={action} className="grid gap-3">
      <Field label="Hándicap declarado" error={error} hint="Tu índice oficial (AAG). Se usa hasta que Galf tenga 3 tarjetas firmadas tuyas.">
        <Input name="value" inputMode="decimal" placeholder="18,4" defaultValue={current != null ? String(current).replace(".", ",") : ""} autoComplete="off" />
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Guardando…">
        Guardar hándicap
      </SubmitButton>
    </form>
  );
}
