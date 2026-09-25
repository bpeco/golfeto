import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, ErrorBanner, Field, inputClass } from "@/components/ui/legacy";
import { fmtIndex } from "@/lib/format";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap } from "@/lib/db/handicap";
import { saveDeclaredHandicap, updateDisplayName } from "./actions";
import { ClaimGuest } from "./claim-guest";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const me = await requirePlayer();
  const supabase = await createClient();
  // RPC: las tarjetas del historial importado no son visibles por RLS hasta que se reclaman.
  const [h, { data: guestRows }] = await Promise.all([getPlayerHandicap(me.id), supabase.rpc("claimable_guests")]);
  const guests = (guestRows ?? []).map((g) => ({ id: g.id, name: g.display_name, cards: g.cards }));

  return (
    <Shell title="Perfil">
      <ErrorBanner message={error} />
      {ok && <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm">Guardado.</p>}

      <Card className="mt-3 grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Calculado por Galf</p>
          <p className="text-3xl font-black tabular-nums">{fmtIndex(h.computed)}</p>
          <p className="text-xs text-muted-foreground">{h.signedCount} tarjetas firmadas{h.signedCount < 3 ? " (mín. 3)" : ""}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Declarado (AAG)</p>
          <p className="text-3xl font-black tabular-nums">{fmtIndex(h.declared)}</p>
          <p className="text-xs text-muted-foreground">{h.source === "declarado" ? "en uso" : h.declared != null ? "referencia" : ""}</p>
        </div>
      </Card>

      <form action={saveDeclaredHandicap} className="mt-6 space-y-3">
        <Field label="Hándicap declarado" hint="Tu índice oficial. Se usa hasta que Galf tenga 3 tarjetas firmadas tuyas.">
          <input name="value" inputMode="decimal" className={inputClass} placeholder="18.4" defaultValue={h.declared ?? ""} />
        </Field>
        <Button type="submit" variant="secondary">Guardar hándicap</Button>
      </form>

      <ClaimGuest guests={guests} />

      <form action={updateDisplayName} className="mt-6 space-y-3">
        <Field label="Nombre">
          <input name="display_name" className={inputClass} defaultValue={me.displayName} maxLength={80} />
        </Field>
        <Button type="submit" variant="secondary">Guardar nombre</Button>
      </form>

      <form action="/auth/signout" method="post" className="mt-10">
        <Button type="submit" variant="destructive-outline" className="w-full">Cerrar sesión</Button>
      </form>
    </Shell>
  );
}
