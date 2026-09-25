import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BoardNumber } from "@/components/ui/board-number";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { ThemeSwitch } from "@/components/theme-switch";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap } from "@/lib/db/handicap";
import { fmtCount } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ClaimGuest } from "./claim-guest";
import { DeclaredHandicapForm } from "./declared-handicap-form";
import { DisplayNameForm } from "./display-name-form";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const me = await requirePlayer();
  const supabase = await createClient();
  // RPC: las tarjetas del historial importado no son visibles por RLS hasta que se reclaman.
  const [h, { data: guestRows }] = await Promise.all([getPlayerHandicap(me.id), supabase.rpc("claimable_guests")]);
  const guests = (guestRows ?? []).map((g) => ({ id: g.id, name: g.display_name, cards: g.cards }));
  const missing = Math.max(0, 3 - h.signedCount);

  return (
    <>
      <PageHeader title="Perfil" meta={me.email ? <span>{me.email}</span> : undefined} />

      <Section title="Tu hándicap">
        <div className="grid grid-cols-2 divide-x divide-border border-y border-border">
          <div className="py-4 pr-4">
            <p className="text-sm text-muted-foreground">Calculado por Galf</p>
            <BoardNumber value={h.computed} kind="index" size="lg" className="mt-1 block" />
            <p className="mt-2 text-sm text-muted-foreground">
              {missing > 0 ? `Te ${missing === 1 ? "falta 1 tarjeta firmada" : `faltan ${missing} tarjetas firmadas`}` : fmtCount(h.signedCount, "tarjeta firmada", "tarjetas firmadas")}
            </p>
            {h.source === "calculado" && <Badge tone="signed" className="mt-2">en uso</Badge>}
          </div>
          <div className="py-4 pl-4">
            <p className="text-sm text-muted-foreground">Declarado (AAG)</p>
            <BoardNumber value={h.declared} kind="index" size="lg" className="mt-1 block" />
            <p className="mt-2 text-sm text-muted-foreground">{h.declared == null ? "Sin cargar" : h.source === "declarado" ? "Se usa hasta tener 3 firmadas" : "Referencia"}</p>
            {h.source === "declarado" && <Badge tone="signed" className="mt-2">en uso</Badge>}
          </div>
        </div>
        <div className="mt-5">
          <DeclaredHandicapForm current={h.declared} />
        </div>
      </Section>

      <ClaimGuest guests={guests} />

      <Section title="Tu nombre">
        <DisplayNameForm current={me.displayName} />
      </Section>

      <Section title="Apariencia">
        <ThemeSwitch />
        <p className="mt-2 text-sm text-muted-foreground">Sistema sigue al modo oscuro del teléfono.</p>
      </Section>

      <form action="/auth/signout" method="post" className="mt-10">
        <Button type="submit" variant="secondary" size="lg" className="w-full">
          <LogOut /> Cerrar sesión
        </Button>
      </form>
    </>
  );
}
