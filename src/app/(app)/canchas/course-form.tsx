"use client";

import { useState, useTransition } from "react";
import { Images, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CellInput } from "@/components/ui/cell-input";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { TeeDot } from "@/components/ui/tee-chip";
import { Segmented } from "@/components/ui/toggle-group";
import { usePhotoPicker } from "@/components/ui/use-photo-picker";
import { resizeImage } from "@/lib/image-resize";
import { parseDecimal } from "@/lib/format";
import { cancelReplace, expectReplace } from "@/lib/nav-history";
import { cn } from "@/lib/utils";
import { saveCourseAndRedirect } from "./actions";
import { readCourseCard } from "./photo-actions";
import type { CourseInput } from "./schema";

type TeeDraft = { key: number; name: string; courseRating: string; slope: string; distances: Record<number, string> };
type HoleDraft = { par: string; strokeIndex: string };

const DEFAULT_TEES = ["Blancas", "Azules", "Amarillas", "Rojas", "Negras"];

/**
 * Alta de cancha o versión nueva. Se puede completar sola con la foto de la tarjeta impresa del
 * club; después se revisa en la grilla (celdas de 44 px) y se guarda. Errores en su celda.
 */
export function CourseForm({
  courseId,
  today,
  initial,
}: {
  courseId: string | null;
  today: string;
  initial?: {
    name: string;
    club: string | null;
    city: string | null;
    holesCount: number;
    holes: { number: number; par: number; strokeIndex: number | null }[];
    tees: { name: string; courseRating: number | null; slope: number | null; distances: Record<number, number> }[];
  };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [club, setClub] = useState(initial?.club ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [holesCount, setHolesCount] = useState<"18" | "9">(initial?.holesCount === 9 ? "9" : "18");
  const [validFrom, setValidFrom] = useState(today);
  const [holes, setHoles] = useState<HoleDraft[]>(() =>
    Array.from({ length: 18 }, (_, i) => {
      const h = initial?.holes.find((x) => x.number === i + 1);
      return { par: h ? String(h.par) : "4", strokeIndex: h?.strokeIndex ? String(h.strokeIndex) : "" };
    }),
  );
  const [tees, setTees] = useState<TeeDraft[]>(() =>
    initial?.tees.length
      ? initial.tees.map((t, i) => ({
          key: i,
          name: t.name,
          courseRating: t.courseRating != null ? String(t.courseRating).replace(".", ",") : "",
          slope: t.slope?.toString() ?? "",
          distances: Object.fromEntries(Object.entries(t.distances).map(([k, v]) => [k, String(v)])),
        }))
      : [{ key: 0, name: "Blancas", courseRating: "", slope: "", distances: {} }],
  );
  const [error, setError] = useState<string>();
  const [notes, setNotes] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [reading, setReading] = useState(false);

  const count = Number(holesCount) as 9 | 18;
  const visibleHoles = holes.slice(0, count);
  const totalPar = visibleHoles.reduce((s, h) => s + (Number(h.par) || 0), 0);
  const invalidTees = tees.map((_, ti) => Object.keys(fields).some((k) => k.startsWith(`tees.${ti}.`)));

  async function readCard(file: File) {
    setReading(true);
    setError(undefined);
    setNotes(undefined);
    try {
      const fd = new FormData();
      fd.set("file", new File([await resizeImage(file, 2000)], "tarjeta.jpg", { type: "image/jpeg" }));
      const r = await readCourseCard(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const card = r.data;
      if (!name && card.courseName) setName(card.courseName);
      if (!club && card.club) setClub(card.club);
      setHolesCount(card.holes.length >= 18 ? "18" : "9");
      setHoles(
        Array.from({ length: 18 }, (_, i) => {
          const h = card.holes.find((x) => x.number === i + 1);
          return h ? { par: String(h.par), strokeIndex: h.strokeIndex ? String(h.strokeIndex) : "" } : holes[i];
        }),
      );
      if (card.tees.length) {
        setTees(
          card.tees.map((t, ti) => ({
            key: Date.now() + ti,
            name: t.name,
            courseRating: t.courseRating != null ? String(t.courseRating).replace(".", ",") : "",
            slope: t.slope?.toString() ?? "",
            distances: Object.fromEntries(
              t.distances
                .map((d, i) => [card.holes[i]?.number ?? i + 1, d == null ? "" : String(t.unit === "yardas" ? Math.round(d * 0.9144) : d)] as const)
                .filter(([, v]) => v !== ""),
            ),
          })),
        );
      }
      setNotes(card.notes ? `Leímos la tarjeta. Revisá: ${card.notes}` : "Leímos la tarjeta. Revisá los números antes de guardar.");
    } catch {
      setError("Sin conexión. No pudimos leer la tarjeta; probá de nuevo o cargala a mano.");
    } finally {
      setReading(false);
    }
  }

  const { input: photoInput, pickPhoto } = usePhotoPicker((file) => void readCard(file));

  function num(v: string) {
    const n = parseDecimal(v);
    return n == null ? null : n;
  }

  function submit() {
    const input: CourseInput = {
      name,
      club: club || undefined,
      city: city || undefined,
      holesCount: count,
      validFrom,
      holes: visibleHoles.map((h, i) => ({ number: i + 1, par: Number(h.par), strokeIndex: h.strokeIndex ? Number(h.strokeIndex) : null })),
      tees: tees
        .filter((t) => t.name.trim())
        .map((t) => ({
          name: t.name,
          courseRating: num(t.courseRating),
          slope: t.slope ? Number(t.slope) : null,
          distances: Object.fromEntries(
            Object.entries(t.distances)
              .filter(([n, v]) => Number(n) <= count && v !== "")
              .map(([n, v]) => [n, Number(v)]),
          ),
        })),
    };
    setError(undefined);
    setFields({});
    start(async () => {
      expectReplace();
      const r = await saveCourseAndRedirect(courseId, input);
      if (r && !r.ok) {
        cancelReplace();
        setError(r.error);
        setFields(r.fields ?? {});
      }
    });
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {photoInput}
      <div>
        <Button variant="secondary" pending={reading} pendingLabel="Leyendo la tarjeta…" onClick={pickPhoto}>
          <Images /> Cargar tarjeta del club
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">Una foto de la tarjeta impresa (en el momento o de la galería: par, hándicap de hoyo, distancias, CR y Slope) y se completa todo.</p>
      </div>
      {notes && <Notice tone="info">{notes}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Field label="Nombre de la cancha" error={fields.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Miraflores" maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Club" error={fields.club}>
          <Input value={club} onChange={(e) => setClub(e.target.value)} placeholder="Miraflores CC" maxLength={120} />
        </Field>
        <Field label="Localidad" error={fields.city}>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Garín" maxLength={120} />
        </Field>
      </div>
      <div className="grid grid-cols-2 items-start gap-3">
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Hoyos</span>
          <Segmented
            label="Hoyos"
            value={holesCount}
            onValueChange={setHolesCount}
            options={[
              { value: "18", label: "18" },
              { value: "9", label: "9" },
            ]}
          />
        </div>
        <Field label={courseId ? "Vigente desde" : "Fecha de alta"} error={fields.validFrom}>
          <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </Field>
      </div>
      {courseId && <Notice tone="info">Guardar crea una versión nueva vigente desde esa fecha. Las partidas anteriores conservan la versión vieja.</Notice>}

      <Section title="Tees" className="mt-2">
        <datalist id="tee-names">
          {DEFAULT_TEES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <ul className="divide-y divide-border border-y border-border">
          {tees.map((t, ti) => (
            <li key={t.key} className={cn("py-3", invalidTees[ti] && "bg-destructive/5")}>
              <div className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] items-end gap-2">
                <Field label={<span className="inline-flex items-center gap-1.5"><TeeDot name={t.name} className="size-2.5" /> Tee {ti + 1}</span>} error={fields[`tees.${ti}.name`]}>
                  <Input list="tee-names" value={t.name} placeholder="Blancas" onChange={(e) => setTees(tees.map((x) => (x.key === t.key ? { ...x, name: e.target.value } : x)))} />
                </Field>
                <Field label="CR">
                  <Input
                    inputMode="decimal"
                    className="px-2 text-center"
                    placeholder="70,3"
                    value={t.courseRating}
                    aria-invalid={!!fields[`tees.${ti}.courseRating`]}
                    onChange={(e) => setTees(tees.map((x) => (x.key === t.key ? { ...x, courseRating: e.target.value } : x)))}
                  />
                </Field>
                <Field label="Slope">
                  <Input
                    inputMode="numeric"
                    className="px-2 text-center"
                    placeholder="125"
                    value={t.slope}
                    aria-invalid={!!fields[`tees.${ti}.slope`]}
                    onChange={(e) => setTees(tees.map((x) => (x.key === t.key ? { ...x, slope: e.target.value.replace(/\D/g, "") } : x)))}
                  />
                </Field>
                <Button variant="ghost" size="icon" aria-label={`Quitar el tee ${ti + 1}`} disabled={tees.length === 1} onClick={() => setTees(tees.filter((x) => x.key !== t.key))}>
                  <X />
                </Button>
              </div>
              {(fields[`tees.${ti}.courseRating`] || fields[`tees.${ti}.slope`]) && (
                <p className="mt-1 text-sm text-destructive">{fields[`tees.${ti}.courseRating`] ?? fields[`tees.${ti}.slope`]}</p>
              )}
            </li>
          ))}
        </ul>
        {fields.tees && <p className="mt-2 text-sm text-destructive">{fields.tees}</p>}
        <Button variant="ghost" className="mt-2" onClick={() => setTees([...tees, { key: Date.now(), name: "", courseRating: "", slope: "", distances: {} }])}>
          <Plus /> Agregar tee
        </Button>
        <p className="mt-1 text-sm text-muted-foreground">CR y Slope salen de la tarjeta del club o de la AAG. Sin ellos no se puede firmar en ese tee.</p>
      </Section>

      <Section title="Hoyos" action={<span className="font-normal text-muted-foreground">Par {totalPar}</span>} className="mt-2">
        {fields.holes && <p className="mb-2 text-sm text-destructive">{fields.holes}</p>}
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-max border-collapse text-base">
            <caption className="sr-only">Par, hándicap de hoyo y metros por tee</caption>
            <thead>
              <tr className="border-b-2 border-line-strong text-sm text-muted-foreground">
                <th scope="col" className="sticky left-0 z-10 h-10 w-11 bg-background pr-1 text-left font-semibold">
                  Hoyo
                </th>
                <th scope="col" className="px-1 font-semibold">
                  Par
                </th>
                <th scope="col" className="px-1 font-semibold">
                  Hcp
                </th>
                {tees.map((t, ti) => (
                  <th key={t.key} scope="col" className="px-1 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <TeeDot name={t.name} className="size-2.5" />
                      {t.name || `Tee ${ti + 1}`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleHoles.map((h, i) => (
                <tr key={i} className={cn("border-b border-border", i === 8 && count === 18 && "border-b-2 border-line-strong")}>
                  <th scope="row" className="sticky left-0 z-10 bg-background pr-1 text-left font-display text-lg font-bold tabular-nums">
                    {i + 1}
                  </th>
                  <td className="p-1">
                    <Select
                      size="sm"
                      className="w-16"
                      aria-label={`Par del hoyo ${i + 1}`}
                      aria-invalid={!!fields[`holes.${i}.par`]}
                      value={h.par}
                      onChange={(e) => setHoles(holes.map((x, j) => (j === i ? { ...x, par: e.target.value } : x)))}
                    >
                      {[3, 4, 5, 6].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="p-1">
                    <CellInput
                      className="w-14"
                      aria-label={`Hándicap del hoyo ${i + 1}`}
                      title={fields[`holes.${i}.strokeIndex`]}
                      aria-invalid={!!fields[`holes.${i}.strokeIndex`]}
                      value={h.strokeIndex}
                      onChange={(e) => setHoles(holes.map((x, j) => (j === i ? { ...x, strokeIndex: e.target.value.replace(/\D/g, "").slice(0, 2) } : x)))}
                    />
                  </td>
                  {tees.map((t, ti) => (
                    <td key={t.key} className="p-1">
                      <CellInput
                        className="w-16"
                        placeholder="m"
                        aria-label={`Metros del hoyo ${i + 1} desde ${t.name || `el tee ${ti + 1}`}`}
                        aria-invalid={!!fields[`tees.${ti}.distances.${i + 1}`]}
                        value={t.distances[i + 1] ?? ""}
                        onChange={(e) =>
                          setTees(tees.map((x) => (x.key === t.key ? { ...x, distances: { ...x.distances, [i + 1]: e.target.value.replace(/\D/g, "").slice(0, 3) } } : x)))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <HoleErrors fields={fields} />
      </Section>

      <Button type="submit" size="lg" pending={pending} pendingLabel="Guardando…" disabled={!name.trim()}>
        {courseId ? "Guardar nueva versión" : "Crear cancha"}
      </Button>
    </form>
  );
}

/** Resumen legible de los errores de la grilla (las celdas ya quedan marcadas en rojo). */
function HoleErrors({ fields }: { fields: Record<string, string> }) {
  const items = Object.entries(fields)
    .map(([k, v]) => {
      const hole = k.match(/^holes\.(\d+)\.(par|strokeIndex)$/);
      if (hole) return `Hoyo ${Number(hole[1]) + 1}: ${v}`;
      const dist = k.match(/^tees\.(\d+)\.distances\.(\d+)$/);
      if (dist) return `Hoyo ${dist[2]}, tee ${Number(dist[1]) + 1}: ${v}`;
      return null;
    })
    .filter(Boolean);
  if (items.length === 0) return null;
  return (
    <Notice tone="error" className="mt-3" title="Revisá la grilla">
      <ul className="list-disc pl-5">
        {items.slice(0, 6).map((t) => (
          <li key={t}>{t}</li>
        ))}
        {items.length > 6 && <li>y {items.length - 6} más</li>}
      </ul>
    </Notice>
  );
}
