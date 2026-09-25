import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { ErrorBanner, LinkButton } from "@/components/ui";
import { joinGroup } from "@/app/grupos/actions";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await joinGroup(code.toUpperCase());
  if ("groupId" in result && result.groupId) redirect(`/grupos/${result.groupId}`);

  return (
    <Shell title="Invitación" back="/">
      <ErrorBanner message={"error" in result ? result.error : "No se pudo usar la invitación."} />
      <p className="mt-4 text-sm text-muted">El link puede haber sido revocado. Pedile uno nuevo al admin del grupo.</p>
      <LinkButton href="/" variant="secondary" className="mt-4">Ir al inicio</LinkButton>
    </Shell>
  );
}
