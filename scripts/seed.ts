/**
 * Genera el SQL de seed: canchas iniciales (layouts provisionales, ver docs/seed/historial.md)
 * y tarjetas históricas del grupo, con los diferenciales calculados por el motor WHS.
 *
 * Se ejecuta con service role (auth.uid() nulo): los triggers de firma lo permiten.
 *   npx tsx scripts/seed.ts > /tmp/seed.sql
 */
import { scoreDifferential } from "../src/lib/handicap/course";
import { handicapHistory, effectiveIndex } from "../src/lib/handicap/index-calc";
import { courseHandicap } from "../src/lib/handicap/course";

// Layouts provisionales: par 71 con distribución típica; hándicap de hoyo en orden.
// Reemplazar con la tarjeta real del club creando una versión nueva desde la app.
const PAR_71 = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4]; // 4×3 + 3×5 + 11×4 = 71
const SI = [1, 11, 15, 5, 7, 3, 17, 9, 13, 2, 16, 8, 6, 4, 18, 10, 12, 14];

type CourseSeed = { key: string; name: string; club: string; city: string; cr: number | null; slope: number | null; tee: string };
const COURSES: CourseSeed[] = [
  { key: "miraflores", name: "Miraflores", club: "Miraflores Country Club", city: "Garín", cr: 70.3, slope: 125, tee: "Blancas" },
  { key: "cedros", name: "Los Cedros", club: "Club Los Cedros", city: "Villa de Mayo", cr: 70.3, slope: 125, tee: "Blancas" },
];
// Nota: Los Cedros no tiene rating publicado; se usa el mismo que Miraflores (par 71, dificultad similar)
// como aproximación declarada. Al cargar la tarjeta real se corrige en una versión nueva.

type Legacy = { player: string; course: string; gross: number };
const PAR = 71;
const HISTORY: Record<string, Legacy[]> = {
  Agus: [
    ...[100, 107, 98, 107, 107, 102, 100, 104].map((g) => ({ player: "Agus", course: "miraflores", gross: g })),
    { player: "Agus", course: "cedros", gross: 91 },
  ],
  Manu: [
    ...[23, 26, 26, 18, 30, 38, 37, 28, 26, 31, 29, 40].map((p) => ({ player: "Manu", course: "miraflores", gross: PAR + p })),
    ...[38, 25].map((p) => ({ player: "Manu", course: "cedros", gross: PAR + p })),
  ],
  Javo: [104, 108, 120, 115, 105, 107, 98].map((g) => ({ player: "Javo", course: "miraflores", gross: g })),
  Bauti: [75, 55].map((p) => ({ player: "Bauti", course: "miraflores", gross: PAR + p })),
};
const FULL_NAMES: Record<string, string> = { Agus: "Agus", Manu: "Manu", Javo: "Javo", Bauti: "Bauti", Fava: "Fava" };

function q(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

const out: string[] = [];

// Canchas
for (const c of COURSES) {
  out.push(`
insert into courses (id, name, club, city) values (gen_random_uuid(), ${q(c.name)}, ${q(c.club)}, ${q(c.city)})
  on conflict do nothing;
with c as (select id from courses where name = ${q(c.name)} and deleted_at is null limit 1),
v as (
  insert into course_versions (course_id, holes_count, valid_from, notes)
  select id, 18, '2020-01-01', 'Layout provisional (par 71); reemplazar con la tarjeta del club.' from c
  returning id
),
h as (
  insert into holes (course_version_id, number, par, stroke_index)
  select v.id, n, p, s from v, unnest(array[${PAR_71.join(",")}], array[${SI.join(",")}]) with ordinality as t(p, s, n)
  returning id
)
insert into tee_sets (course_version_id, name, course_rating, slope)
select v.id, ${q(c.tee)}, ${c.cr ?? "null"}, ${c.slope ?? "null"} from v;`);
}

// Golfistas históricos como invitados (se vinculan a la cuenta real cuando se registran).
for (const name of Object.keys(FULL_NAMES)) {
  out.push(`insert into players (display_name) select ${q(name)} where not exists (select 1 from players where display_name = ${q(name)} and deleted_at is null);`);
}

// Fechas: una por semana hacia atrás por golfista, terminando hoy; orden = el del WhatsApp.
const today = new Date();
const rows: string[] = [];
for (const [player, cards] of Object.entries(HISTORY)) {
  const n = cards.length;
  const scores: { id: string; playedOn: string; differential: number; card: Legacy }[] = [];
  cards.forEach((card, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - 7 * (n - 1 - i));
    const c = COURSES.find((x) => x.key === card.course)!;
    const differential = scoreDifferential(card.gross, { courseRating: c.cr!, slope: c.slope! });
    scores.push({ id: `${player}-${i}`, playedOn: d.toISOString().slice(0, 10), differential, card });
  });
  const history = handicapHistory(scores);
  scores.forEach((s, i) => {
    const c = COURSES.find((x) => x.key === s.card.course)!;
    const before = i === 0 ? null : history[i - 1].handicapIndex;
    const eff = effectiveIndex(before, null);
    const ch = eff.value == null ? 0 : courseHandicap(eff.value, { courseRating: c.cr!, slope: c.slope!, par: PAR });
    rows.push(
      `(${q(player)}, ${q(c.name)}, ${q(c.tee)}, '${s.playedOn}'::date, ${s.card.gross}, ${eff.value == null ? "'ninguno'" : "'index'"}::handicap_source, ${eff.value ?? "null"}::numeric, ${ch}, ${c.cr}::numeric, ${c.slope}, ${PAR}, ${s.differential}::numeric)`,
    );
  });
}

out.push(`
create temp table legacy_seed (player text, course text, tee text, played_on date, gross int, src handicap_source, hi numeric, ch int, cr numeric, slope int, par int, diff numeric) on commit drop;
insert into legacy_seed values
${rows.join(",\n")};

with base as (
  select l.*, p.id as player_id, cv.id as cv_id, t.id as tee_id, f.id as format_id,
         row_number() over () as rn
  from legacy_seed l
  join players p on p.display_name = l.player and p.deleted_at is null
  join courses c on c.name = l.course and c.deleted_at is null
  join course_versions cv on cv.course_id = c.id and cv.deleted_at is null
  join tee_sets t on t.course_version_id = cv.id and t.name = l.tee
  join round_formats f on f.code = 'medal'
),
r as (
  insert into rounds (course_version_id, tee_set_id, format_id, played_on, date_approximate, created_by, notes)
  select cv_id, tee_id, format_id, played_on, true, player_id, 'seed:' || rn from base
  returning id, notes
),
sc as (
  insert into scorecards (round_id, player_id, is_legacy, legacy_gross)
  select r.id, b.player_id, true, b.gross from r join base b on r.notes = 'seed:' || b.rn
  returning id, round_id
)
insert into scorecard_signatures (scorecard_id, action, handicap_source, handicap_index, course_handicap, course_rating, slope, par, holes_played, gross, adjusted_gross, differential)
select sc.id, 'firmar', b.src, b.hi, b.ch, b.cr, b.slope, b.par, 'completa', b.gross, b.gross, b.diff
from sc join r on r.id = sc.round_id join base b on r.notes = 'seed:' || b.rn;

update rounds set notes = null where notes like 'seed:%';
`);

process.stdout.write(out.join("\n") + "\n");
