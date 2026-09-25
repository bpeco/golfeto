"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Initials } from "@/components/ui/initials";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { TeeDot } from "@/components/ui/tee-chip";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/toggle-group";
import type { CourseSummary } from "@/lib/db/courses";
import { parseHandicap } from "@/lib/format";
import { cancelReplace, expectReplace } from "@/lib/nav-history";
import { createRoundAndRedirect } from "../actions";
import type { RoundInput } from "../schema";

type Group = { id: string; name: string; members: { id: string; name: string }[] };
type Guest = { key: number; name: string; hcp: string };

export function NewRoundForm({
  me,
  courses,
  groups,
  preselectedGroup,
  today,
}: {
  today: string;
  me: { id: string; name: string };
  courses: CourseSummary[];
  groups: Group[];
  preselectedGroup: string | null;
}) {
  const usable = courses.filter((c) => c.version && c.tees.length);
  const [courseId, setCourseId] = useState(usable[0]?.id ?? "");
  const course = usable.find((c) => c.id === courseId);
  const [teeId, setTeeId] = useState(course?.tees[0]?.id ?? "");
  const [playedOn, setPlayedOn] = useState(today);
  const [holesPlayed, setHolesPlayed] = useState<"completa" | "ida" | "vuelta">("completa");
  const [loops, setLoops] = useState<"2" | "1">("2");
  const [selected, setSelected] = useState<Set<string>>(() => {
    const g = groups.find((x) => x.id === preselectedGroup);
    return new Set([me.id, ...(g?.members.map((m) => m.id) ?? [])]);
  });
  const [guests, setGuests] = useState<Guest[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const people = useMemo(() => {
    const map = new Map<string, string>([[me.id, me.name]]);
    const ordered = preselectedGroup ? [...groups].sort((a) => (a.id === preselectedGroup ? -1 : 1)) : groups;
    for (const g of ordered) for (const m of g.members) if (!map.has(m.id)) map.set(m.id, m.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [groups, me, preselectedGroup]);

  const tee = course?.tees.find((t) => t.id === teeId);
  const is9 = course?.version?.holesCount === 9;
  const namedGuests = guests.filter((g) => g.name.trim());
  const total = selected.size + namedGuests.length;
  const blocker = !course ? "Elegí una cancha" : !teeId ? "Elegí el tee" : total === 0 ? "Elegí al menos un jugador" : null;

  function pickCourse(id: string) {
    setCourseId(id);
    const c = usable.find((x) => x.id === id);
    setTeeId(c?.tees[0]?.id ?? "");
    if (c?.version?.holesCount === 9) setHolesPlayed("completa");
  }

  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function submit() {
    if (!course?.version || blocker) return;
    const input: RoundInput = {
      courseVersionId: course.version.id,
      teeSetId: teeId,
      playedOn,
      holesPlayed: is9 ? "completa" : holesPlayed,
      loops: is9 ? (Number(loops) as 1 | 2) : 1,
      playerIds: Array.from(selected),
      guests: namedGuests.map((g) => ({ name: g.name, declaredHandicap: g.hcp.trim() ? (parseHandicap(g.hcp) ?? Number.NaN) : null })),
      notes: notes.trim() || undefined,
    };
    setError(undefined);
    setFields({});
    start(async () => {
      expectReplace();
      const r = await createRoundAndRedirect(input);
      if (r && !r.ok) {
        cancelReplace();
        setError(r.error);
        setFields(remapGuestFields(r.fields ?? {}, guests, namedGuests));
      }
    });
  }

  return (
    <form
      className="grid gap-6 pb-[calc(6rem+env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error && <Notice tone="error">{error}</Notice>}
      {usable.length < courses.length && <Notice tone="info">Algunas canchas no aparecen porque no tienen tees cargados.</Notice>}

      <Field label="Cancha" error={fields.courseVersionId}>
        <Select value={courseId} onChange={(e) => pickCourse(e.target.value)}>
          {usable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.club && c.club !== c.name ? ` — ${c.club}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      {course && (
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Tee</span>
          <Segmented
            label="Tee"
            value={teeId}
            onValueChange={setTeeId}
            options={course.tees.map((t) => ({
              value: t.id,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <TeeDot name={t.name} className="size-2.5" />
                  {t.name}
                </span>
              ),
            }))}
          />
          {tee && (tee.courseRating == null || tee.slope == null) && (
            <Notice tone="warn">Las {tee.name} no tienen CR y Slope: se puede jugar, pero para firmar hay que cargarlos en la cancha.</Notice>
          )}
        </div>
      )}

      <Field label="Fecha" error={fields.playedOn}>
        <Input type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
      </Field>

      <div className="grid gap-1.5">
        <span className="text-sm font-semibold">{is9 ? "Vueltas" : "Hoyos"}</span>
        {is9 ? (
          <Segmented
            label="Vueltas"
            value={loops}
            onValueChange={setLoops}
            options={[
              { value: "2", label: "Ida y vuelta (18)" },
              { value: "1", label: "Una vuelta (9)" },
            ]}
          />
        ) : (
          <Segmented
            label="Hoyos"
            value={holesPlayed}
            onValueChange={setHolesPlayed}
            options={[
              { value: "completa", label: "18 hoyos" },
              { value: "ida", label: "Ida" },
              { value: "vuelta", label: "Vuelta" },
            ]}
          />
        )}
        {!is9 && holesPlayed !== "completa" && (
          <p className="text-sm text-muted-foreground">{holesPlayed === "ida" ? "Hoyos 1 a 9." : "Hoyos 10 a 18."} El diferencial de 9 hoyos se convierte a 18 como pide el WHS.</p>
        )}
      </div>

      <Section title="Jugadores" className="mt-2">
        {fields.players && <p className="mb-2 text-sm text-destructive">{fields.players}</p>}
        <ul className="divide-y divide-border border-y border-border">
          {people.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={(on) => toggle(p.id, on)} />
                <Initials name={p.name} />
                <span className="flex-1 truncate text-base font-semibold">{p.name}</span>
                {p.id === me.id && <Badge tone="outline">Vos</Badge>}
              </label>
            </li>
          ))}
        </ul>
        {groups.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No estás en ningún grupo: podés sumar invitados.</p>}
      </Section>

      <Section title="Invitados" className="mt-2">
        <p className="-mt-1 mb-3 text-sm text-muted-foreground">Sin cuenta: nombre y, si lo saben, su hándicap.</p>
        {guests.length > 0 && (
          <ul className="mb-3 grid gap-3">
            {guests.map((g, i) => (
              <li key={g.key}>
                <div className="flex items-start gap-2">
                  <Input
                    aria-label={`Nombre del invitado ${i + 1}`}
                    placeholder="Nombre"
                    value={g.name}
                    aria-invalid={!!fields[`guest-${g.key}-name`]}
                    onChange={(e) => setGuests(guests.map((x) => (x.key === g.key ? { ...x, name: e.target.value } : x)))}
                  />
                  <Input
                    aria-label={`Hándicap del invitado ${i + 1}`}
                    placeholder="Hcp"
                    inputMode="decimal"
                    className="w-20 shrink-0"
                    value={g.hcp}
                    aria-invalid={!!fields[`guest-${g.key}-hcp`]}
                    onChange={(e) => setGuests(guests.map((x) => (x.key === g.key ? { ...x, hcp: e.target.value } : x)))}
                  />
                  <Button variant="ghost" size="icon" aria-label={`Quitar al invitado ${i + 1}`} onClick={() => setGuests(guests.filter((x) => x.key !== g.key))}>
                    <X />
                  </Button>
                </div>
                {(fields[`guest-${g.key}-name`] || fields[`guest-${g.key}-hcp`]) && (
                  <p className="mt-1 text-sm text-destructive">{fields[`guest-${g.key}-name`] ?? fields[`guest-${g.key}-hcp`]}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button variant="ghost" onClick={() => setGuests([...guests, { key: Date.now(), name: "", hcp: "" }])}>
          <Plus /> Agregar invitado
        </Button>
      </Section>

      <Field label="Notas" hint="Opcional: viento, estado de los greens, lo que quieran recordar." error={fields.notes}>
        <Textarea value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 shadow-raised backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-background">
        <div className="mx-auto w-full max-w-lg px-4 py-3">
          <Button type="submit" size="lg" className="w-full" disabled={!!blocker} pending={pending} pendingLabel="Creando…">
            Crear partida{total > 0 ? ` con ${total}` : ""}
          </Button>
          {blocker && <p className="mt-1.5 text-center text-sm text-muted-foreground">{blocker}</p>}
        </div>
      </div>
    </form>
  );
}

/** Los errores del servidor vienen por índice entre los invitados con nombre; se pasan a la fila. */
function remapGuestFields(fields: Record<string, string>, all: Guest[], named: Guest[]) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    const m = k.match(/^guests\.(\d+)\.(name|declaredHandicap)$/);
    const guest = m ? named[Number(m[1])] : undefined;
    if (guest && all.includes(guest)) out[`guest-${guest.key}-${m![2] === "name" ? "name" : "hcp"}`] = v;
    else out[k] = v;
  }
  return out;
}
