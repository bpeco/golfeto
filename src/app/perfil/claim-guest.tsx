"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorBanner } from "@/components/ui";
import { claimGuest } from "./actions";

export function ClaimGuest({ guests }: { guests: { id: string; name: string; cards: number }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (guests.length === 0) return null;
  return (
    <Card className="mt-6 space-y-2">
      <p className="text-sm font-semibold">¿Sos alguno de estos?</p>
      <p className="text-xs text-muted">Hay historial cargado a nombre de invitados. Si es tuyo, reclamalo y pasa a tu cuenta.</p>
      <ErrorBanner message={error} />
      <ul className="divide-y divide-border">
        {guests.map((g) => (
          <li key={g.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {g.name} <span className="text-muted">· {g.cards} tarjetas</span>
            </span>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Sos ${g.name}? Sus tarjetas pasan a tu cuenta.`)) return;
                start(async () => {
                  const r = await claimGuest(g.id);
                  if (r.error) setError(r.error);
                  else router.refresh();
                });
              }}
            >
              Soy yo
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
