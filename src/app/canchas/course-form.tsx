"use client";

import { useRef, useState, useTransition } from "react";
import { resizeImage } from "@/lib/image-resize";
import { readCourseCard } from "./photo-actions";
import { Button, ErrorBanner, Field, inputClass } from "@/components/ui";
import { saveCourseAndRedirect } from "./actions";
import type { CourseInput } from "./schema";

type TeeDraft = { name: string; courseRating: string; slope: string; distances: Record<number, string> };
type HoleDraft = { par: string; strokeIndex: string };

const DEFAULT_TEES = ["Blancas", "Azules", "Amarillas", "Rojas"];

export function CourseForm({
  courseId,
  initial,
}: {
  courseId: string | null;
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
  const [holesCount, setHolesCount] = useState<9 | 18>((initial?.holesCount as 9 | 18) ?? 18);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [holes, setHoles] = useState<HoleDraft[]>(() =>
    Array.from({ length: 18 }, (_, i) => {
      const h = initial?.holes.find((x) => x.number === i + 1);
      return { par: h ? String(h.par) : "4", strokeIndex: h?.strokeIndex ? String(h.strokeIndex) : "" };
    }),
  );
  const [tees, setTees] = useState<TeeDraft[]>(() =>
    initial?.tees.length
      ? initial.tees.map((t) => ({
          name: t.name,
          courseRating: t.courseRating?.toString() ?? "",
          slope: t.slope?.toString() ?? "",
          distances: Object.fromEntries(Object.entries(t.distances).map(([k, v]) => [k, String(v)])),
        }))
      : [{ name: "Blancas", courseRating: "", slope: "", distances: {} }],
  );
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  async function readCard(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.set("file", new File([await resizeImage(file, 2000)], "tarjeta.jpg", { type: "image/jpeg" }));
      const r = await readCourseCard(fd);
      if (r.error || !r.card) {
        setError(r.error ?? "No se pudo leer la tarjeta");
        return;
      }
      const card = r.card;
      if (!name && card.courseName) setName(card.courseName);
      if (!club && card.club) setClub(card.club);
      const count = card.holes.length >= 18 ? 18 : 9;
      setHolesCount(count);
      setHoles(
        Array.from({ length: 18 }, (_, i) => {
          const h = card.holes.find((x) => x.number === i + 1);
          return h ? { par: String(h.par), strokeIndex: h.strokeIndex ? String(h.strokeIndex) : "" } : holes[i];
        }),
      );
      if (card.tees.length) {
        setTees(
          card.tees.map((t) => ({
            name: t.name,
            courseRating: t.courseRating?.toString() ?? "",
            slope: t.slope?.toString() ?? "",
            distances: Object.fromEntries(
              t.distances
                .map((d, i) => [card.holes[i]?.number ?? i + 1, d == null ? "" : String(t.unit === "yardas" ? Math.round(d * 0.9144) : d)] as const)
                .filter(([, v]) => v !== ""),
            ),
          })),
        );
      }
      if (card.notes) setError(`Leído. Revisá: ${card.notes}`);
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const visibleHoles = holes.slice(0, holesCount);
  const totalPar = visibleHoles.reduce((s, h) => s + (Number(h.par) || 0), 0);

  function submit() {
    const input: CourseInput = {
      name,
      club: club || undefined,
      city: city || undefined,
      holesCount,
      validFrom,
      holes: visibleHoles.map((h, i) => ({
        number: i + 1,
        par: Number(h.par),
        strokeIndex: h.strokeIndex ? Number(h.strokeIndex) : null,
      })),
      tees: tees
        .filter((t) => t.name.trim())
        .map((t) => ({
          name: t.name,
          courseRating: t.courseRating ? Number(t.courseRating) : null,
          slope: t.slope ? Number(t.slope) : null,
          distances: Object.fromEntries(
            Object.entries(t.distances)
              .filter(([n, v]) => Number(n) <= holesCount && v !== "")
              .map(([n, v]) => [n, Number(v)]),
          ),
        })),
    };
    start(async () => {
      const r = await saveCourseAndRedirect(courseId, input);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <div>
        <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => readCard(e.target.files?.[0])} />
        <Button type="button" variant="secondary" disabled={reading} onClick={() => fileInput.current?.click()}>
          {reading ? "Leyendo la tarjeta…" : "📷 Leer la tarjeta del club"}
        </Button>
        <p className="mt-1 text-xs text-muted">Sacale una foto a la tarjeta impresa (par, hándicap de hoyo, distancias) y se prellena todo.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Nombre de la cancha">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Miraflores" />
          </Field>
        </div>
        <Field label="Club">
          <input className={inputClass} value={club} onChange={(e) => setClub(e.target.value)} placeholder="Miraflores CC" />
        </Field>
        <Field label="Localidad">
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Garín" />
        </Field>
        <Field label="Hoyos">
          <select className={inputClass} value={holesCount} onChange={(e) => setHolesCount(Number(e.target.value) as 9 | 18)}>
            <option value={18}>18</option>
            <option value={9}>9</option>
          </select>
        </Field>
        <Field label={courseId ? "Vigente desde" : "Fecha de alta"} hint={courseId ? "Las partidas anteriores conservan la versión vieja." : undefined}>
          <input type="date" className={inputClass} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </Field>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Hoyos</h2>
          <span className="text-sm text-muted">Par {totalPar}</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                <th className="px-2 py-2 text-left">Hoyo</th>
                <th className="px-2 py-2">Par</th>
                <th className="px-2 py-2">Hcp</th>
                {tees.map((t, ti) => (
                  <th key={ti} className="px-2 py-2">{t.name || `Tee ${ti + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleHoles.map((h, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1 font-medium">{i + 1}</td>
                  <td className="px-1 py-1">
                    <select
                      className="w-14 rounded-lg border border-border bg-surface px-1 py-1"
                      value={h.par}
                      onChange={(e) => setHoles(holes.map((x, j) => (j === i ? { ...x, par: e.target.value } : x)))}
                    >
                      {[3, 4, 5, 6].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      inputMode="numeric"
                      className="w-12 rounded-lg border border-border bg-surface px-1 py-1 text-center"
                      value={h.strokeIndex}
                      onChange={(e) => setHoles(holes.map((x, j) => (j === i ? { ...x, strokeIndex: e.target.value } : x)))}
                    />
                  </td>
                  {tees.map((t, ti) => (
                    <td key={ti} className="px-1 py-1">
                      <input
                        inputMode="numeric"
                        placeholder="m"
                        className="w-16 rounded-lg border border-border bg-surface px-1 py-1 text-center"
                        value={t.distances[i + 1] ?? ""}
                        onChange={(e) =>
                          setTees(tees.map((x, j) => (j === ti ? { ...x, distances: { ...x.distances, [i + 1]: e.target.value } } : x)))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Tees</h2>
        {tees.map((t, ti) => (
          <div key={ti} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2 rounded-2xl border border-border p-3">
            <Field label="Nombre">
              <input
                list="tee-names"
                className={inputClass}
                value={t.name}
                onChange={(e) => setTees(tees.map((x, j) => (j === ti ? { ...x, name: e.target.value } : x)))}
              />
            </Field>
            <Field label="CR">
              <input
                inputMode="decimal"
                className={`${inputClass} w-20`}
                value={t.courseRating}
                onChange={(e) => setTees(tees.map((x, j) => (j === ti ? { ...x, courseRating: e.target.value } : x)))}
              />
            </Field>
            <Field label="Slope">
              <input
                inputMode="numeric"
                className={`${inputClass} w-20`}
                value={t.slope}
                onChange={(e) => setTees(tees.map((x, j) => (j === ti ? { ...x, slope: e.target.value } : x)))}
              />
            </Field>
            <button
              type="button"
              aria-label="Quitar tee"
              className="pb-3 text-muted"
              onClick={() => setTees(tees.filter((_, j) => j !== ti))}
              disabled={tees.length === 1}
            >
              ✕
            </button>
          </div>
        ))}
        <datalist id="tee-names">
          {DEFAULT_TEES.map((n) => <option key={n} value={n} />)}
        </datalist>
        <Button type="button" variant="secondary" onClick={() => setTees([...tees, { name: "", courseRating: "", slope: "", distances: {} }])}>
          + Agregar tee
        </Button>
        <p className="text-xs text-muted">CR y Slope salen de la tarjeta del club o de la AAG. Sin ellos no se puede calcular el hándicap en esta cancha.</p>
      </section>

      <Button className="w-full" disabled={pending || !name.trim()} onClick={submit}>
        {pending ? "Guardando…" : courseId ? "Guardar nueva versión" : "Crear cancha"}
      </Button>
    </div>
  );
}
