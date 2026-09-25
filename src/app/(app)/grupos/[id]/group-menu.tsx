"use client";

import { useState, useTransition } from "react";
import { Ban, Copy, DoorOpen, Ellipsis, RefreshCw, Share2, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Initials } from "@/components/ui/initials";
import { List, ListRow } from "@/components/ui/list";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfirm } from "@/components/ui/use-confirm";
import { leaveGroup, regenerateInviteCode, removeMember, revokeInviteCode } from "../actions";
import { useInviteLink } from "./use-invite-link";

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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Más acciones del grupo" pending={pending} />}>
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {code && (
            <>
              <DropdownMenuItem onClick={share}>
                <Share2 /> Compartir link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copy}>
                <Copy /> Copiar link
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={regenerate}>
                <RefreshCw /> {code ? "Generar otro link" : "Generar link"}
              </DropdownMenuItem>
              {code && (
                <DropdownMenuItem onClick={revoke}>
                  <Ban /> Revocar link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setMembersOpen(true)}>
                <UserRoundMinus /> Administrar miembros
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={leave}>
            <DoorOpen /> Salir del grupo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Miembros</SheetTitle>
              <SheetDescription>Sacar a alguien no borra sus tarjetas.</SheetDescription>
            </SheetHeader>
            <List>
              {members.map((mb) => (
                <ListRow
                  key={mb.memberId}
                  leading={<Initials name={mb.name} />}
                  title={mb.name}
                  meta={mb.role === "admin" ? "Administra el grupo" : undefined}
                  trailing={
                    mb.playerId !== meId ? (
                      <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={() => remove(mb)}>
                        Sacar
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Vos</span>
                    )
                  }
                />
              ))}
            </List>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
