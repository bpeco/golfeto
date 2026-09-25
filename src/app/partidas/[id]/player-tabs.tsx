import Link from "next/link";

export function PlayerTabs({
  roundId,
  selectedId,
  players,
}: {
  roundId: string;
  selectedId?: string;
  players: { id: string; name: string; signed: boolean; gross: number | null }[];
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {players.map((p) => (
        <Link
          key={p.id}
          href={`/partidas/${roundId}?j=${p.id}`}
          scroll={false}
          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
            p.id === selectedId ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface"
          }`}
        >
          {p.name}
          {p.gross != null && <span className="font-bold tabular-nums">{p.gross}</span>}
          {p.signed && <span aria-label="Firmada">✓</span>}
        </Link>
      ))}
    </div>
  );
}
