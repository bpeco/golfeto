"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Ban, Copy, DoorOpen, RefreshCw, Share2, UserRoundMinus } from "lucide-react";
import { toast } from "@/lib/toast";
import { ActionMenu, type Action } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/use-confirm";
import { leaveGroup, regenerateInviteCode, removeMember, revokeInviteCode } from "../actions";
import { useInviteLink } from "./use-invite-link";

const MembersSheet = dynamic(() => import("./members-sheet"), { ssr: false });

export type GroupMember = { memberId: string; playerId: string; name: string; role: "admin" | "member" };

/** Menú ⋯ del grupo: link de invitación, administración (admin) y salir. */
export function GroupMenu({
  groupId,
  groupName,
  code,
  isAdmin,
  meId,
  members,
}: {
  groupId: string;
  groupName: string;
  code: string | null;
  isAdmin: boolean;
  meId: string;
  members: GroupMember[];
}) {
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [membersOpen, setMembersOpen] = useState(false);
  // Montada desde la primera apertura, para que al cerrar se vea la animación de salida.
  const [membersMounted, setMembersMounted] = useState(false);
  const { copy, share } = useInviteLink(groupName, code);

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

  async function leave() {
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
  }

  function openMembers() {
    setMembersMounted(true);
    setMembersOpen(true);
  }

  async function remove(member: GroupMember) {
    const res = await confirm({
      title: `¿Sacar a ${member.name} del grupo?`,
      body: "Sus tarjetas no se borran; deja de ver las del grupo.",
      confirmLabel: "Sacar",
      tone: "destructive",
    });
    if (!res.ok) return;
    start(async () => {
      const r = await removeMember(groupId, member.memberId);
      if (r.ok) toast(`${member.name} ya no está en el grupo`);
      else toast.error(r.error);
    });
  }

  const actions: Action[] = [
    ...(code
      ? [
          { label: "Compartir link", icon: <Share2 />, onSelect: share },
          { label: "Copiar link", icon: <Copy />, onSelect: copy },
        ]
      : []),
    ...(isAdmin
      ? [
          { label: code ? "Generar otro link" : "Generar link", icon: <RefreshCw />, onSelect: regenerate },
          ...(code ? [{ label: "Revocar link", icon: <Ban />, onSelect: revoke }] : []),
          { label: "Administrar miembros", icon: <UserRoundMinus />, onSelect: openMembers },
        ]
      : []),
    { label: "Salir del grupo", icon: <DoorOpen />, onSelect: leave, destructive: true },
  ];

  return (
    <>
      <ActionMenu label="Más acciones del grupo" actions={actions} pending={pending} />
      {isAdmin && membersMounted && (
        <MembersSheet open={membersOpen} onOpenChange={setMembersOpen} members={members} meId={meId} pending={pending} onRemove={remove} />
      )}
    </>
  );
}
