"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

const subscribe = () => () => {};

/** Link de invitación del grupo con Compartir (hoja del sistema) y Copiar, con su feedback. */
export function useInviteLink(groupName: string, code: string | null) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
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

  return { link, copy, share };
}
