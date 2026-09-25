import { Shell } from "@/components/shell";
import { Button, ErrorBanner, Field, inputClass } from "@/components/ui";
import { createGroup } from "../actions";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <Shell title="Nuevo grupo" back="/">
      <form action={createGroup} className="space-y-4">
        <ErrorBanner message={error === "nombre" ? "Poné un nombre." : error} />
        <Field label="Nombre del grupo">
          <input name="name" required maxLength={80} className={inputClass} placeholder="Los del sábado" autoFocus />
        </Field>
        <Button type="submit" className="w-full">Crear grupo</Button>
        <p className="text-xs text-muted">
          Vos quedás como admin. Después compartís el link de invitación por WhatsApp.
        </p>
      </form>
    </Shell>
  );
}
