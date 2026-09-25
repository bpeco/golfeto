"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, ErrorBanner, Field, inputClass } from "@/components/ui";
import type { CourseSummary } from "@/lib/db/courses";
import { createRoundAndRedirect } from "../actions";
import type { RoundInput } from "../schema";

type Group = { id: string; name: string; members: { id: string; name: string }[] };

export function NewRoundForm({
  me,
  courses,
  groups,
  preselectedGroup,
}: {
  me: { id: string; name: string };
  courses: CourseSummary[];
  groups: Group[];
  preselectedGroup: string | null;
}) {
  const usable = courses.filter((c) => c.version && c.tees.length);
  const [courseId, setCourseId] = useState(usable[0]?.id ?? "");
  const course = usable.find((c) => c.id === courseId);
  const [teeId, setTeeId] = useState(course?.tees[0]?.id ?? "");
  const [playedOn, setPlayedOn] = useState(new Date().toISOString().slice(0, 10));
  const [holesPlayed, setHolesPlayed] = useState<"completa" | "ida" | "vuelta">("completa");
  const [loops, setLoops] = useState<1 | 2>(2);
  const [selected, setSelected] = useState<Set<string>>(new Set([me.id]));
  const [guests, setGuests] = useState<{ name: string; hcp: string }[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const people = useMemo(() => {
    const map = new Map<string, string>([[me.id, `${me.name} (vos)`]]);
    const ordered = preselectedGroup ? [...groups].sort((a) => (a.id === preselectedGroup ? -1 : 1)) : groups;
    for (const g of ordered) for (const m of g.members) if (!map.has(m.id)) map.set(m.id, m.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [groups, me, preselectedGroup]);

  function pickCourse(id: string) {
    setCourseId(id);
    const c = usable.find((x) => x.id === id);
    setTeeId(c?.tees[0]?.id ?? "");
    if (c?.version?.holesCount === 9) setHolesPlayed("completa");
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function submit() {
    if (!course?.version) return;
    const input: RoundInput = {
      courseVersionId: course.version.id,
      teeSetId: teeId,
      playedOn,
      holesPlayed: course.version.holesCount === 9 ? "completa" : holesPlayed,
      loops: course.version.holesCount === 9 ? loops : 1,
      playerIds: Array.from(selected),
      guests: guests.filter((g) => g.name.trim()).map((g) => ({ name: g.name, declaredHandicap: g.hcp ? Number(g.hcp.replace(",", ".")) : null })),
    };
    start(async () => {
      const r = await createRoundAndRedirect(input);
      if (r?.error) setError(r.error);
    });
  }

  const tee = course?.tees.find((t) => t.id === teeId);
  const is9 = course?.version?.holesCount === 9;

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {usable.length < courses.length && (
        <p className="text-xs text-muted">Algunas canchas no aparecen porque no tienen tees cargados.</p>
      )}
      <Field label="Cancha">
        <select className={inputClass} value={courseId} onChange={(e) => pickCourse(e.target.value)}>
          {usable.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.club ? ` · ${c.club}` : ""}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tee" hint={tee && tee.courseRating == null ? "Sin CR/Slope: no se podrá firmar" : undefined}>
          <select className={inputClass} value={teeId} onChange={(e) => setTeeId(e.target.value)}>
            {course?.tees.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputClass} value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
        </Field>
        {is9 ? (
          <Field label="Vueltas">
            <select className={inputClass} value={loops} onChange={(e) => setLoops(Number(e.target.value) as 1 | 2)}>
              <option value={2}>Ida y vuelta (18)</option>
              <option value={1}>Una vuelta (9)</option>
            </select>
          </Field>
        ) : (
          <Field label="Hoyos">
            <select className={inputClass} value={holesPlayed} onChange={(e) => setHolesPlayed(e.target.value as typeof holesPlayed)}>
              <option value="completa">18 hoyos</option>
              <option value="ida">Ida (1–9)</option>
              <option value="vuelta">Vuelta (10–18)</option>
            </select>
          </Field>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium">Jugadores</h2>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                selected.has(p.id) ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {groups.length === 0 && <p className="mt-2 text-xs text-muted">No estás en ningún grupo; podés sumar invitados.</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Invitados (sin cuenta)</h2>
        {guests.map((g, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Nombre"
              value={g.name}
              onChange={(e) => setGuests(guests.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              className={`${inputClass} w-24`}
              placeholder="Hcp"
              inputMode="decimal"
              value={g.hcp}
              onChange={(e) => setGuests(guests.map((x, j) => (j === i ? { ...x, hcp: e.target.value } : x)))}
            />
            <button type="button" className="text-muted" onClick={() => setGuests(guests.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setGuests([...guests, { name: "", hcp: "" }])}>+ Invitado</Button>
      </section>

      <Button className="w-full" disabled={pending || !course || !teeId || selected.size + guests.length === 0} onClick={submit}>
        {pending ? "Creando…" : "Crear partida"}
      </Button>
    </div>
  );
}
