"use client";

import { players, recentRounds, round } from "./fixtures";

/** Fase 0: esqueleto. Las secciones por primitiva y las variantes llegan en la Fase 1. */
export function Playground({ variant }: { variant: "A" | "B" | "C" }) {
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Playground</h1>
      <p className="text-sm">Variante {variant}</p>
      <section data-shot="fixtures" className="space-y-2 text-sm">
        <h2 className="font-semibold">Fixtures</h2>
        <p>{round.course.name}: {round.scorecards.map((s) => s.playerName).join(", ")}</p>
        <p>{players.map((p) => `${p.name} ${p.handicap.effective ?? "—"}`).join(", ")}</p>
        <p>{recentRounds.length} partidas recientes</p>
      </section>
    </main>
  );
}
