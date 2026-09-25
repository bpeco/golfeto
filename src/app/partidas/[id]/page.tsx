import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { formatDate } from "@/components/ui";
import { requirePlayer } from "@/lib/db/player";
import { effectiveTeeRating, getRound } from "@/lib/db/rounds";
import { getHandicapsFor } from "@/lib/db/handicap";
import { courseHandicap, courseHandicap9 } from "@/lib/handicap/course";
import { ScoreGrid } from "./score-grid";
import { PlayerTabs } from "./player-tabs";
import { RoundMenu } from "./round-menu";
import { PhotoPanel } from "./photo-panel";
import { signedPhotoUrls } from "./photo-actions";

export default async function RoundPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ j?: string }> }) {
  const { id } = await params;
  const { j } = await searchParams;
  const me = await requirePlayer();
  const round = await getRound(id);
  if (!round) notFound();

  const rating = effectiveTeeRating(round);
  const [handicaps, photoUrls] = await Promise.all([
    getHandicapsFor(round.scorecards.map((s) => s.playerId)),
    signedPhotoUrls(round.photos.map((p) => p.storagePath)),
  ]);

  const cards = round.scorecards.map((card) => {
    const idx = handicaps.get(card.playerId)?.effective ?? null;
    const courseHcp =
      card.signature?.courseHandicap ??
      (rating && idx != null ? (rating.holesInRound === 9 ? courseHandicap9(idx, rating) : courseHandicap(idx, rating)) : null);
    return { card, courseHcp };
  });

  const selectedId = cards.find((c) => c.card.id === j)?.card.id ?? cards.find((c) => c.card.playerId === me.id)?.card.id ?? cards[0]?.card.id;
  const selected = cards.find((c) => c.card.id === selectedId);

  const title = `${round.course.name}`;
  const subtitle = [
    `${round.dateApproximate ? "~" : ""}${formatDate(round.playedOn)}`,
    round.tee.name,
    round.holesPlayed === "ida" ? "ida" : round.holesPlayed === "vuelta" ? "vuelta" : round.loops === 2 ? "9 × 2" : `${round.positions.length} hoyos`,
    rating ? `CR ${rating.courseRating.toFixed(1)} / ${rating.slope}` : "sin rating",
  ].join(" · ");

  return (
    <Shell title={title} back="/partidas" action={<RoundMenu roundId={round.id} canDelete={round.createdBy === me.id} />}>
      <p className="mb-3 text-xs text-muted">{subtitle}</p>

      <PlayerTabs
        roundId={round.id}
        selectedId={selectedId}
        players={cards.map(({ card }) => ({
          id: card.id,
          name: card.playerName + (card.isGuest ? " (inv.)" : ""),
          signed: !!card.signedAt,
          gross: card.signature?.gross ?? null,
        }))}
      />

      <div className="mt-4">
        <PhotoPanel
          roundId={round.id}
          holesInRound={round.positions.length}
          players={cards.map(({ card }) => ({ id: card.id, name: card.playerName, signed: !!card.signedAt }))}
          photos={round.photos.map((p) => ({ id: p.id, url: photoUrls[p.storagePath] ?? null }))}
        />
      </div>

      {selected && (
        <div className="mt-3">
          <ScoreGrid
            key={selected.card.id}
            round={round}
            card={selected.card}
            isOwner={selected.card.playerId === me.id}
            courseHcp={selected.courseHcp}
          />
        </div>
      )}
    </Shell>
  );
}
