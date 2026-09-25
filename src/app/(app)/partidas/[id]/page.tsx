import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TeeChip } from "@/components/ui/tee-chip";
import { fmtDecimal, formatDate, formatRoundDate } from "@/lib/format";
import { requirePlayer } from "@/lib/db/player";
import { effectiveTeeRating, getRound } from "@/lib/db/rounds";
import { getHandicapsFor } from "@/lib/db/handicap";
import { courseHandicap, courseHandicap9 } from "@/lib/handicap/course";
import { holesLabel } from "@/lib/scorecard-state";
import { RoundMenu } from "./round-menu";
import { RoundScoring, type ScoringCard } from "./round-scoring";
import { signedPhotoUrls } from "./photo-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const round = await getRound((await params).id);
  return { title: round ? `${round.course.name}, ${formatDate(round.playedOn, { year: false })}` : "Partida" };
}

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

  const cards: ScoringCard[] = round.scorecards.map((card) => {
    const index = handicaps.get(card.playerId)?.effective ?? null;
    const estimated = rating && index != null ? (rating.holesInRound === 9 ? courseHandicap9(index, rating) : courseHandicap(index, rating)) : null;
    return {
      id: card.id,
      playerId: card.playerId,
      playerName: card.playerName,
      isGuest: card.isGuest,
      isLegacy: card.isLegacy,
      legacyGross: card.legacyGross,
      signedAt: card.signedAt,
      signature: card.signature,
      scores: card.scores,
      courseHandicap: card.signature?.courseHandicap ?? estimated,
      ownerIndex: index,
      isOwner: card.playerId === me.id,
    };
  });

  const initialCardId = cards.find((c) => c.id === j)?.id ?? cards.find((c) => c.isOwner)?.id ?? cards[0]?.id;

  return (
    <>
      <PageHeader
        title={round.course.name}
        back={{ fallback: "/partidas" }}
        action={<RoundMenu roundId={round.id} canDelete={round.createdBy === me.id} />}
        meta={
          <>
            <span>{formatRoundDate(round.playedOn, round.dateApproximate, { year: false })}</span>
            <TeeChip name={round.tee.name} size="sm" className="text-foreground" />
            <span>{holesLabel({ holesPlayed: round.holesPlayed, loops: round.loops, holes: round.positions.length })}</span>
            {rating ? (
              <span>
                CR {fmtDecimal(round.tee.courseRating!)} / Slope {round.tee.slope}
              </span>
            ) : (
              <Link href={`/canchas/${round.course.id}/editar`} className="font-semibold text-warn-ink underline underline-offset-4">
                Sin rating
              </Link>
            )}
          </>
        }
      />
      <RoundScoring
        roundId={round.id}
        courseId={round.course.id}
        positions={round.positions}
        loops={round.loops}
        cards={cards}
        initialCardId={initialCardId}
        rating={rating}
        photos={round.photos.map((p) => ({ id: p.id, url: photoUrls[p.storagePath] ?? null }))}
      />
    </>
  );
}
