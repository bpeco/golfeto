"use client";

import { useTransition } from "react";
import { leaveGroup, removeMember } from "../actions";

export function MemberActions({
  groupId,
  memberId,
  isSelf,
  isAdmin,
}: {
  groupId: string;
  memberId: string;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  if (isSelf) {
    return (
      <button
        disabled={pending}
        className="text-xs text-muted underline"
        onClick={() => {
          if (confirm("¿Salir del grupo?")) start(() => leaveGroup(groupId));
        }}
      >
        Salir
      </button>
    );
  }
  if (!isAdmin) return null;
  return (
    <button
      disabled={pending}
      className="text-xs text-red-600 underline"
      onClick={() => {
        if (confirm("¿Sacar del grupo?")) start(() => void removeMember(groupId, memberId));
      }}
    >
      Sacar
    </button>
  );
}
