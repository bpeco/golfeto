"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Initials } from "@/components/ui/initials";
import { List, ListRow } from "@/components/ui/list";
import { Section } from "@/components/ui/section";
import { useConfirm } from "@/components/ui/use-confirm";
import { fmtCount } from "@/lib/format";
import { claimGuest } from "./actions";

/** Historial importado a nombre de invitados: "Soy yo" lo pasa a la cuenta. */
export function ClaimGuest({ guests }: { guests: { id: string; name: string; cards: number }[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  if (guests.length === 0) return null;
  return (
    <Section title="¿Sos alguno de estos?">
      <p className="mb-2 text-sm text-muted-foreground">Hay historial cargado a nombre de invitados. Si es tuyo, reclamalo y pasa a tu cuenta.</p>
      <List>
        {guests.map((g) => (
          <ListRow
            key={g.id}
            leading={<Initials name={g.name} />}
            title={g.name}
            meta={fmtCount(g.cards, "tarjeta")}
            trailing={
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  const res = await confirm({
                    title: `¿Sos ${g.name}?`,
                    body: `${fmtCount(g.cards, "tarjeta")} ${g.cards === 1 ? "pasa" : "pasan"} a tu cuenta y cuentan para tu hándicap. No se puede deshacer desde la app.`,
                    confirmLabel: "Sí, soy yo",
                  });
                  if (!res.ok) return;
                  start(async () => {
                    const r = await claimGuest(g.id);
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    toast.success(`Listo: ${g.cards === 1 ? "la tarjeta" : `las ${g.cards} tarjetas`} de ${g.name} ahora ${g.cards === 1 ? "es tuya" : "son tuyas"}`);
                    router.refresh();
                  });
                }}
              >
                Soy yo
              </Button>
            }
          />
        ))}
      </List>
    </Section>
  );
}
