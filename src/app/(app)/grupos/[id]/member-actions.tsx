"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { leaveGroup, removeMember } from "../actions";

export function MemberActions({
  groupId,
  groupName,
  memberId,
  memberName,
  isSelf,
  isAdmin,
}: {
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  if (isSelf) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={async () => {
          const res = await confirm({
            title: `¿Salir de «${groupName}»?`,
            body: "Dejás de ver las partidas y el ranking del grupo. Para volver, te tienen que mandar el link.",
            confirmLabel: "Salir del grupo",
            tone: "destructive",
          });
          if (!res.ok) return;
          start(async () => {
            const r = await leaveGroup(groupId);
            if (r && !r.ok) toast.error(r.error);
          });
        }}
      >
        Salir
      </Button>
    );
  }
  if (!isAdmin) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={async () => {
        const res = await confirm({
          title: `¿Sacar a ${memberName} del grupo?`,
          body: "Sus tarjetas no se borran; deja de ver las del grupo.",
          confirmLabel: "Sacar",
          tone: "destructive",
        });
        if (!res.ok) return;
        start(async () => {
          const r = await removeMember(groupId, memberId);
          if (r.ok) toast(`${memberName} ya no está en el grupo`);
          else toast.error(r.error);
        });
      }}
    >
      Sacar
    </Button>
  );
}
