"use client";

import { useTransition } from "react";
import { Ellipsis, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/ui/use-confirm";
import { deleteRound } from "../actions";

/** Menú ⋯ de la partida. Por ahora: dar de baja (solo quien la creó). */
export function RoundMenu({ roundId, canDelete }: { roundId: string; canDelete: boolean }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  if (!canDelete) return null;

  async function remove() {
    const res = await confirm({
      title: "¿Dar de baja la partida?",
      body: "Solo se puede si nadie firmó. Queda dada de baja, no se borra.",
      confirmLabel: "Dar de baja",
      tone: "destructive",
    });
    if (!res.ok) return;
    start(async () => {
      const r = await deleteRound(roundId);
      if (r && !r.ok) toast.error(r.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Más acciones de la partida" pending={pending} />}>
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash /> Dar de baja
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
