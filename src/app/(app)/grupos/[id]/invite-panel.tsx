"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, RefreshCw, Share2, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { regenerateInviteCode, revokeInviteCode } from "../actions";

/** Link de invitación en texto plano + Compartir / Copiar; el admin puede generar otro o revocarlo. */
export function InvitePanel({ groupId, groupName, code, isAdmin }: { groupId: string; groupName: string; code: string | null; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const [origin, setOrigin] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- el origen solo se conoce en el navegador
  useEffect(() => setOrigin(window.location.origin), []);
  const link = code ? `${origin}/unirse/${code}` : null;

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar. Mantené apretado el link para copiarlo.");
    }
  }

  async function share() {
    if (!link) return;
    const text = `Sumate a «${groupName}» en Galf: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await copy();
  }

  function regenerate() {
    start(async () => {
      const r = await regenerateInviteCode(groupId);
      if (r.ok) toast.success("Link nuevo listo. El anterior ya no sirve.");
      else toast.error(r.error);
    });
  }

  async function revoke() {
    const res = await confirm({
      title: "¿Revocar el link?",
      body: "Nadie más va a poder entrar con él. Podés generar uno nuevo cuando quieras.",
      confirmLabel: "Revocar",
      tone: "destructive",
    });
    if (!res.ok) return;
    start(async () => {
      const r = await revokeInviteCode(groupId);
      if (r.ok) toast("Link revocado");
      else toast.error(r.error);
    });
  }

  if (!link) {
    return (
      <div className="grid gap-3">
        <p className="text-base text-muted-foreground">No hay link de invitación activo.</p>
        {isAdmin && (
          <Button variant="secondary" pending={pending} onClick={regenerate}>
            <RefreshCw /> Generar link
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-base break-all select-all">{link || `…/unirse/${code}`}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={share}>
          <Share2 /> Compartir
        </Button>
        <Button variant="secondary" onClick={copy}>
          <Copy /> Copiar
        </Button>
      </div>
      {isAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" pending={pending} onClick={regenerate}>
            <RefreshCw /> Generar otro
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={revoke}>
            <Ban /> Revocar
          </Button>
        </div>
      )}
    </div>
  );
}
