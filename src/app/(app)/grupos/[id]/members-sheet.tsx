"use client";

import { Button } from "@/components/ui/button";
import { Initials } from "@/components/ui/initials";
import { List, ListRow } from "@/components/ui/list";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { GroupMember } from "./group-menu";

/** Golfistas del grupo: sacar a alguien (solo admin). Se carga aparte, al abrirla. */
export default function MembersSheet({
  open,
  onOpenChange,
  members,
  meId,
  pending,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: GroupMember[];
  meId: string;
  pending: boolean;
  onRemove: (member: GroupMember) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Golfistas del grupo</SheetTitle>
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
                  <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={() => onRemove(mb)}>
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
  );
}
