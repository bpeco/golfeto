"use client";

import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInviteLink } from "./use-invite-link";

/** El link de invitación en texto plano, con Compartir y Copiar. Generar/revocar está en el menú ⋯. */
export function InviteSection({ groupName, code }: { groupName: string; code: string | null }) {
  const { link, copy, share } = useInviteLink(groupName, code);
  if (!code) return <p className="text-base text-muted-foreground">No hay link de invitación activo. Quien administra el grupo puede generar uno desde el menú ⋯.</p>;
  return (
    <div className="grid gap-3">
      <p className="text-base break-all select-all">{link || `…/unirse/${code}`}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={share}>
          <Share2 /> Compartir
        </Button>
        <Button variant="secondary" onClick={copy}>
          <Copy /> Copiar
        </Button>
      </div>
    </div>
  );
}
