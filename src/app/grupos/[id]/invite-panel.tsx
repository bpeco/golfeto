"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { regenerateInviteCode, revokeInviteCode } from "../actions";

export function InvitePanel({
  groupId,
  groupName,
  code,
  isAdmin,
}: {
  groupId: string;
  groupName: string;
  code: string | null;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const link = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/unirse/${code}` : null;

  async function share() {
    if (!link) return;
    const text = `Sumate a "${groupName}" en Galf: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelado */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {link ? (
        <>
          <p className="break-all rounded-xl bg-background px-3 py-2 font-mono text-sm">{link}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={share}>{copied ? "Copiado" : "Compartir link"}</Button>
            {isAdmin && (
              <>
                <Button variant="secondary" disabled={pending} onClick={() => start(() => void regenerateInviteCode(groupId))}>
                  Generar otro
                </Button>
                <Button variant="danger" disabled={pending} onClick={() => start(() => void revokeInviteCode(groupId))}>
                  Revocar
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">No hay link de invitación activo.</p>
          {isAdmin && (
            <Button variant="secondary" disabled={pending} onClick={() => start(() => void regenerateInviteCode(groupId))}>
              Generar link
            </Button>
          )}
        </>
      )}
    </div>
  );
}
