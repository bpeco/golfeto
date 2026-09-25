"use client";

import { useState, useTransition } from "react";
import { deleteRound } from "../actions";

export function RoundMenu({ roundId, canDelete }: { roundId: string; canDelete: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (!canDelete) return null;
  return (
    <div className="text-right">
      <button
        disabled={pending}
        className="text-xs text-red-600 underline"
        onClick={() => {
          if (confirm("¿Dar de baja la partida? Solo se puede si nadie firmó.")) {
            start(async () => {
              const r = await deleteRound(roundId);
              if (r?.error) setError(r.error);
            });
          }
        }}
      >
        Dar de baja
      </button>
      {error && <p className="max-w-40 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
