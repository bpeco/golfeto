import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";

/**
 * TEMPORAL (hasta el cierre de la Fase 5): las pantallas viejas pasan por acá a PageHeader.
 * El marco (main, barra de pestañas) ahora es src/app/(app)/layout.tsx.
 */
export function Shell({ title, back, action, children }: { title: string; back?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} back={back ? { fallback: back } : undefined} action={action} />
      {children}
    </>
  );
}
