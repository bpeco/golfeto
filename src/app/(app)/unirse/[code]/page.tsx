import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { JoinGroupForm } from "./join-group-form";

export const metadata: Metadata = { title: "Invitación" };

/**
 * Pantalla de confirmación: unirse requiere un toque (antes el RPC corría al abrir el link,
 * también en el prefetch). El nombre del grupo no se puede mostrar antes de unirse sin un RPC
 * nuevo (`peek_invite`, pendiente en "Requiere DB").
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <PageHeader title="Invitación" />
      <div className="mt-6">
        <Users aria-hidden className="size-8 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="mt-3 text-xl font-semibold text-balance">Te invitaron a un grupo en Galf</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Al unirte, el grupo ve tus partidas, tarjetas y hándicap, y vos las de ellos. Código{" "}
          <span className="font-semibold text-foreground">{code.toUpperCase()}</span>.
        </p>
      </div>
      <div className="mt-8">
        <JoinGroupForm code={code} />
      </div>
    </>
  );
}
