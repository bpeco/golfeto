"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorBanner } from "@/components/ui";
import { resizeImage } from "@/lib/image-resize";
import { applyExtraction, uploadAndExtract, type ExtractionResult } from "./photo-actions";

export function PhotoPanel({
  roundId,
  holesInRound,
  players,
  photos,
}: {
  roundId: string;
  holesInRound: number;
  players: { id: string; name: string; signed: boolean }[];
  photos: { id: string; url: string | null }[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [assign, setAssign] = useState<(string | null)[]>([]);
  const [rows, setRows] = useState<(number | null)[][]>([]);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setBusy("Subiendo foto…");
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.set("roundId", roundId);
      fd.set("file", new File([blob], "tarjeta.jpg", { type: "image/jpeg" }));
      setBusy("Leyendo la tarjeta…");
      const r = await uploadAndExtract(fd);
      if (r.error || !r.result) {
        setError(r.error ?? "Error");
      } else {
        setResult(r.result);
        setAssign(r.result.suggestions);
        setRows(r.result.extraction.rows.map((row) => padTo(row.strokes, holesInRound)));
      }
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  function apply() {
    if (!result) return;
    const assignments = assign
      .map((scorecardId, i) => (scorecardId ? { scorecardId, strokes: rows[i] } : null))
      .filter((a): a is { scorecardId: string; strokes: (number | null)[] } => !!a);
    start(async () => {
      const r = await applyExtraction(roundId, assignments);
      if (r.error) setError(r.error);
      else {
        setResult(null);
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-3">
      <ErrorBanner message={error} />
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy ?? "📷 Foto de la tarjeta"}
        </Button>
        {photos.map((p) =>
          p.url ? (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block h-12 w-12 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Foto de tarjeta" className="h-full w-full object-cover" />
            </a>
          ) : null,
        )}
      </div>

      {result && (
        <div className="space-y-3 rounded-2xl border border-accent/40 bg-surface p-3">
          <p className="text-sm font-semibold">Leí {result.extraction.rows.length} fila{result.extraction.rows.length === 1 ? "" : "s"}. Revisá y confirmá:</p>
          {result.extraction.notes && <p className="text-xs text-muted">{result.extraction.notes}</p>}
          {result.extraction.rows.map((row, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  “{row.name}” <span className="text-muted">→</span>
                </span>
                <select
                  className="flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                  value={assign[i] ?? ""}
                  onChange={(e) => setAssign(assign.map((a, j) => (j === i ? e.target.value || null : a)))}
                >
                  <option value="">(ignorar)</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.signed}>
                      {p.name}{p.signed ? " (firmada)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-9 gap-1">
                {rows[i].map((v, k) => (
                  <input
                    key={k}
                    inputMode="numeric"
                    aria-label={`Hoyo ${k + 1}`}
                    className={`h-8 rounded-md border text-center text-sm ${
                      row.uncertain.includes(k) ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30" : "border-border bg-background"
                    }`}
                    value={v ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? null : Number(e.target.value);
                      setRows(rows.map((r, j) => (j === i ? r.map((x, q) => (q === k ? (Number.isNaN(n) ? x : n) : x)) : r)));
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted">
                Suma {rows[i].reduce((acc: number, v) => acc + (v ?? 0), 0)}
                {row.writtenTotal != null ? ` · en la tarjeta dice ${row.writtenTotal}` : ""}
                {row.uncertain.length ? ` · ${row.uncertain.length} dudosos en amarillo` : ""}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            <Button disabled={pending || assign.every((a) => !a)} onClick={apply}>
              {pending ? "Aplicando…" : "Cargar golpes"}
            </Button>
            <Button variant="secondary" onClick={() => setResult(null)}>Descartar</Button>
          </div>
          <p className="text-xs text-muted">Los golpes se cargan como borrador; cada uno firma la suya.</p>
        </div>
      )}
    </section>
  );
}

function padTo(arr: (number | null)[], n: number) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push(null);
  return out;
}
