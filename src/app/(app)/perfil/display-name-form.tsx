"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/lib/toast";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateDisplayName } from "./actions";

export function DisplayNameForm({ current }: { current: string }) {
  const [state, action] = useActionState(updateDisplayName, null);
  useEffect(() => {
    if (state?.ok) toast.success(`Listo, ahora sos «${state.data.name}»`);
  }, [state]);
  const error = state && !state.ok ? (state.fields?._ ?? state.error) : undefined;
  return (
    <form action={action} className="grid gap-3">
      <Field label="Nombre" error={error} hint="Así te ven en las partidas y en el ranking.">
        <Input name="display_name" defaultValue={current} maxLength={80} autoComplete="nickname" />
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Guardando…">
        Guardar nombre
      </SubmitButton>
    </form>
  );
}
