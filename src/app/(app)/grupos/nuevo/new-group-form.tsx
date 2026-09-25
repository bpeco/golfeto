"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/lib/action-result";
import { cancelReplace, expectReplace } from "@/lib/nav-history";
import { createGroup } from "../actions";

export function NewGroupForm() {
  const [state, action] = useActionState(async (prev: ActionResult | null, formData: FormData) => {
    expectReplace(); // si crea, reemplaza este formulario en el historial
    const r = await createGroup(prev, formData);
    if (r && !r.ok) cancelReplace();
    return r;
  }, null);
  const fieldError = state && !state.ok ? state.fields?.name : undefined;
  return (
    <form action={action} className="grid gap-5">
      {state && !state.ok && !fieldError && <Notice tone="error">{state.error}</Notice>}
      <Field label="Nombre del grupo" error={fieldError} hint="Vos quedás como admin. Después compartís el link de invitación por WhatsApp.">
        <Input name="name" maxLength={80} placeholder="Los del sábado" autoComplete="off" required />
      </Field>
      <SubmitButton size="lg" pendingLabel="Creando…">
        Crear grupo
      </SubmitButton>
    </form>
  );
}
