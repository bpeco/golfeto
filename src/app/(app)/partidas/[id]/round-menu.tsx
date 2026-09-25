"use client";

import { useTransition } from "react";
import { Trash } from "lucide-react";
import { toast } from "@/lib/toast";
import { cancelReplace, expectReplace } from "@/lib/nav-history";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/use-confirm";
import { deleteRound } from "../actions";

/** Menú ⋯ de la partida. Por ahora: dar de baja (solo quien la creó). */
export function RoundMenu({ roundId, canDelete }: { roundId: string; canDelete: boolean }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  async function remove() {
    const res = await confirm({
      title: "¿Dar de baja la partida?",
      body: "Solo se puede si nadie firmó. Queda dada de baja, no se borra.",
      confirmLabel: "Dar de baja",
      tone: "destructive",
    });
    if (!res.ok) return;
    start(async () => {
      expectReplace();
      const r = await deleteRound(roundId);
      if (r && !r.ok) {
        cancelReplace();
        toast.error(r.error);
      }
    });
  }

  return (
    <ActionMenu
      label="Más acciones de la partida"
      pending={pending}
      actions={canDelete ? [{ label: "Dar de baja la partida", icon: <Trash />, onSelect: remove, destructive: true }] : []}
    />
  );
}
