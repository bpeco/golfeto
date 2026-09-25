/**
 * Datos de mentira para el playground, con los tipos reales de `src/lib/db/*` para que los
 * componentes se prueben con la misma forma que reciben en las pantallas. Nada toca Supabase.
 */
import { positionsFor, type RoundDetail, type RoundHole } from "@/lib/round-model";
import type { PlayerHandicap } from "@/lib/db/handicap";
import type { CourseDetail, CourseSummary } from "@/lib/db/courses";
import { effectiveIndex, handicapHistory } from "@/lib/handicap/index-calc";

// Miraflores (layout provisional, igual que el seed): par 71.
const PARS = [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 5, 3, 4, 4, 5, 4, 3, 4];
const SI = [7, 3, 17, 1, 11, 5, 15, 9, 13, 8, 2, 16, 4, 12, 6, 10, 18, 14];
const METERS = [352, 381, 148, 468, 330, 365, 162, 318, 344, 356, 482, 171, 371, 305, 455, 338, 139, 362];

export const holes: RoundHole[] = PARS.map((par, i) => ({
  id: `hole-${i + 1}`,
  number: i + 1,
  par,
  strokeIndex: SI[i],
  meters: METERS[i],
}));

const score = (strokes: (number | "x" | null)[]) =>
  Object.fromEntries(
    strokes
      .map((s, i) => [i + 1, s] as const)
      .filter(([, s]) => s != null)
      .map(([p, s]) => [p, s === "x" ? { strokes: null, pickedUp: true } : { strokes: s as number, pickedUp: false }]),
  );

export const ME_ID = "player-bauti";

export const round: RoundDetail = {
  id: "round-miraflores",
  playedOn: "2026-09-12",
  dateApproximate: false,
  holesPlayed: "completa",
  loops: 1,
  createdBy: ME_ID,
  notes: null,
  course: { id: "course-miraflores", name: "Miraflores", club: "Miraflores Country Club", holesCount: 18, versionId: "v1" },
  tee: { id: "tee-blancas", name: "Blancas", courseRating: 70.3, slope: 125 },
  holes,
  positions: positionsFor(holes, "completa", 1),
  scorecards: [
    {
      id: "card-agus",
      playerId: "player-agus",
      playerName: "Agus",
      isGuest: false,
      isLegacy: false,
      legacyGross: null,
      signedAt: "2026-09-12T20:00:00Z",
      signature: { courseHandicap: 20, gross: 91, adjustedGross: 89, differential: 17.2, handicapIndex: 18.4 },
      scores: score([5, 5, 4, 6, 5, 4, 3, 5, 5, 5, 7, 3, 5, 6, 5, 5, 4, 9]),
    },
    {
      id: "card-bauti",
      playerId: ME_ID,
      playerName: "Bauti",
      isGuest: false,
      isLegacy: false,
      legacyGross: null,
      signedAt: null,
      signature: null,
      scores: score([5, 4, 3, 6, 6, 5, 2, 5, "x", 5, 6, 4]),
    },
    {
      id: "card-manu",
      playerId: "player-manu",
      playerName: "Manu",
      isGuest: false,
      isLegacy: true,
      legacyGross: 96,
      signedAt: "2026-09-12T20:00:00Z",
      signature: { courseHandicap: 26, gross: 96, adjustedGross: 96, differential: 23.1, handicapIndex: 24.0 },
      scores: {},
    },
    {
      id: "card-fava",
      playerId: "player-fava",
      playerName: "Fava",
      isGuest: true,
      isLegacy: false,
      legacyGross: null,
      signedAt: null,
      signature: null,
      scores: score([6, 5, 4, 7, 5, 6, 4]),
    },
  ],
  photos: [],
};

/** Hándicap de cancha estimado por tarjeta (lo que calcula la página de la partida). */
export const courseHandicaps: Record<string, number | null> = {
  "card-agus": 20,
  "card-bauti": 23,
  "card-manu": 26,
  "card-fava": 32,
};

function weekly(from: string, diffs: number[]) {
  const start = new Date(`${from}T00:00:00Z`);
  return diffs.map((differential, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return { id: `${from}-${i}`, playedOn: d.toISOString().slice(0, 10), differential };
  });
}

function handicap(playerId: string, diffs: number[], declared: number | null = null): PlayerHandicap {
  const history = handicapHistory(weekly("2026-03-07", diffs));
  const computed = history.at(-1)?.handicapIndex ?? null;
  const eff = effectiveIndex(computed, declared);
  return { playerId, computed, declared, effective: eff.value, source: eff.source, signedCount: diffs.length, history };
}

export const players = [
  { id: "player-agus", name: "Agus", handicap: handicap("player-agus", [21.2, 19.8, 20.5, 18.1, 17.9, 19.4, 18.8, 16.9, 18.2, 17.5, 17.2, 16.4]) },
  { id: ME_ID, name: "Bauti", handicap: handicap(ME_ID, [24.1, 22.8, 23.5, 21.9, 22.4, 20.8, 21.7, 22.3, 20.2, 21.1]) },
  { id: "player-manu", name: "Manu", handicap: handicap("player-manu", [26.3, 25.1, 24.8, 23.9, 25.5, 24.2, 23.1, 24.6]) },
  { id: "player-javo", name: "Javo", handicap: handicap("player-javo", [28.4, 27.2, 29.1, 26.8, 27.5, 26.1]) },
  { id: "player-fava", name: "Fava", handicap: handicap("player-fava", [31.0, 29.8], 30.0) },
];

export const groups = [
  { id: "group-sabado", name: "Los del sábado", members: 5 },
  { id: "group-trabajo", name: "Golf del laburo", members: 3 },
];

export const recentRounds = [
  {
    id: "round-miraflores",
    courseName: "Miraflores",
    playedOn: "2026-09-12",
    dateApproximate: false,
    cards: [
      { playerId: ME_ID, name: "Bauti", gross: null, signed: false },
      { playerId: "player-agus", name: "Agus", gross: 91, signed: true },
      { playerId: "player-manu", name: "Manu", gross: 96, signed: true },
      { playerId: "player-fava", name: "Fava", gross: null, signed: false, guest: true },
    ],
  },
  {
    id: "round-cedros",
    courseName: "Los Cedros",
    playedOn: "2026-09-05",
    dateApproximate: true,
    cards: [
      { playerId: ME_ID, name: "Bauti", gross: 88, signed: true },
      { playerId: "player-javo", name: "Javo", gross: 99, signed: true },
    ],
  },
];

export const courses: CourseSummary[] = [
  {
    id: "course-miraflores",
    name: "Miraflores",
    club: "Miraflores Country Club",
    city: "Garín",
    version: { id: "v1", holesCount: 18, validFrom: "2020-01-01" },
    tees: [
      { id: "tee-blancas", name: "Blancas", courseRating: 70.3, slope: 125 },
      { id: "tee-azules", name: "Azules", courseRating: 71.6, slope: 129 },
      { id: "tee-rojas", name: "Rojas", courseRating: null, slope: null },
    ],
  },
  {
    id: "course-cedros",
    name: "Los Cedros",
    club: "Club Los Cedros",
    city: "Pilar",
    version: { id: "v2", holesCount: 9, validFrom: "2020-01-01" },
    tees: [{ id: "tee-amarillas", name: "Amarillas", courseRating: 35.1, slope: 122 }],
  },
];

export const courseDetail: CourseDetail = {
  id: "course-miraflores",
  name: "Miraflores",
  club: "Miraflores Country Club",
  city: "Garín",
  versionCount: 2,
  version: {
    id: "v1",
    holesCount: 18,
    validFrom: "2020-01-01",
    validTo: null,
    holes: holes.map((h) => ({ id: h.id, number: h.number, par: h.par, strokeIndex: h.strokeIndex, dogleg: null })),
    tees: [
      { id: "tee-blancas", name: "Blancas", courseRating: 70.3, slope: 125, distances: Object.fromEntries(holes.map((h) => [h.id, h.meters!])) },
      { id: "tee-azules", name: "Azules", courseRating: 71.6, slope: 129, distances: Object.fromEntries(holes.map((h) => [h.id, h.meters! + 22])) },
    ],
  },
};
