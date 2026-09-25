import { Shell } from "@/components/shell";
import { Button, Card, ErrorBanner, Field, fmtIndex, inputClass } from "@/components/ui";
import { requirePlayer } from "@/lib/db/player";
import { getPlayerHandicap } from "@/lib/db/handicap";
import { saveDeclaredHandicap, updateDisplayName } from "./actions";
import { ClaimGuest } from "./claim-guest";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const me = await requirePlayer();
  const supabase = await createClient();
  const [h, { data: guestRows }] = await Promise.all([
    getPlayerHandicap(me.id),
    supabase
      .from("players")
      .select("id, display_name, scorecards!scorecards_player_id_fkey(count)")
      .is("user_id", null)
      .is("deleted_at", null)
      .is("merged_into_player_id", null)
      .order("display_name"),
  ]);
  const guests = (guestRows ?? [])
    .map((g) => ({ id: g.id, name: g.display_name, cards: g.scorecards[0]?.count ?? 0 }))
    .filter((g) => g.cards > 0);

  return (
    <Shell title="Perfil">
      <ErrorBanner message={error} />
      {ok && <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm">Guardado.</p>}

      <Card className="mt-3 grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xs text-muted">Calculado por Galf</p>
          <p className="text-3xl font-black tabular-nums">{fmtIndex(h.computed)}</p>
          <p className="text-xs text-muted">{h.signedCount} tarjetas firmadas{h.signedCount < 3 ? " (mín. 3)" : ""}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Declarado (AAG)</p>
          <p className="text-3xl font-black tabular-nums">{fmtIndex(h.declared)}</p>
          <p className="text-xs text-muted">{h.source === "declarado" ? "en uso" : h.declared != null ? "referencia" : ""}</p>
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
        <Button type="submit" variant="danger" className="w-full">Cerrar sesión</Button>
      </form>
    </Shell>
  );
}
