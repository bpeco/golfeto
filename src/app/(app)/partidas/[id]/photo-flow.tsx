"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CellInput } from "@/components/ui/cell-input";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { fmtCount } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { resizeImage } from "@/lib/image-resize";
import { applyExtraction, readScorecardPhoto, uploadScorecardPhoto, type ExtractionResult } from "./photo-actions";

type Step =
  | { kind: "idle" }
  | { kind: "uploading"; preview: string }
  | { kind: "reading"; preview: string; photoId: string; since: number }
  | { kind: "review"; result: ExtractionResult }
  | { kind: "error"; message: string; photoId?: string; preview?: string };

/**
 * Foto de la tarjeta de papel → golpes. Pasos en una hoja: subiendo, leyendo (10–20 s),
 * revisar (a quién es cada fila, números dudosos en ámbar) y cargar. La foto queda guardada
 * aunque la lectura falle o se descarte.
 */
export function PhotoFlow({
  roundId,
  holesInRound,
  players,
  photos,
  onApplied,
}: {
  roundId: string;
  holesInRound: number;
  players: { id: string; name: string; locked: boolean }[];
  photos: { id: string; url: string | null }[];
  onApplied: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [assign, setAssign] = useState<(string | null)[]>([]);
  const [rows, setRows] = useState<(number | null)[][]>([]);
  const [pending, start] = useTransition();
  const open = step.kind !== "idle";

  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setStep({ kind: "uploading", preview });
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.set("roundId", roundId);
      fd.set("file", new File([blob], "tarjeta.jpg", { type: "image/jpeg" }));
      const up = await uploadScorecardPhoto(fd);
      if (!up.ok) return setStep({ kind: "error", message: up.error, preview });
      await read(up.data.photoId, preview);
    } catch {
      setStep({ kind: "error", message: "Sin conexión. La foto no se subió; probá de nuevo.", preview });
    }
  }

  async function read(photoId: string, preview: string) {
    setStep({ kind: "reading", preview, photoId, since: Date.now() });
    try {
      const r = await readScorecardPhoto(roundId, photoId);
      if (!r.ok) return setStep({ kind: "error", message: r.error, photoId, preview });
      setAssign(r.data.suggestions);
      setRows(r.data.extraction.rows.map((row) => padTo(row.strokes, holesInRound)));
      setStep({ kind: "review", result: r.data });
    } catch {
      setStep({ kind: "error", message: "Sin conexión mientras leíamos la foto. Quedó guardada: probá leerla de nuevo.", photoId, preview });
    }
  }

  function apply() {
    if (step.kind !== "review") return;
    const assignments = assign
      .map((scorecardId, i) => (scorecardId ? { scorecardId, strokes: rows[i] } : null))
      .filter((a): a is { scorecardId: string; strokes: (number | null)[] } => !!a);
    start(async () => {
      const r = await applyExtraction(roundId, assignments);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      haptics.success();
      toast.success(`Cargamos ${fmtCount(r.data.strokes, "golpe")} en ${fmtCount(r.data.applied, "tarjeta")}`);
      setStep({ kind: "idle" });
      onApplied();
    });
  }

  function discard() {
    setStep({ kind: "idle" });
    toast("Descartamos la lectura", { description: "La foto quedó guardada en la partida." });
  }

  return (
    <section aria-label="Fotos de la tarjeta" className="mt-6 border-t border-border pt-4">
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => input.current?.click()}>
          <Camera /> Foto de la tarjeta
        </Button>
        {photos.map((p, i) =>
          p.url ? (
            <Dialog key={p.id}>
              <DialogTrigger className="size-14 overflow-hidden rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, sin optimizar */}
                <img src={p.url} alt={`Foto ${i + 1} de la tarjeta`} className="size-full object-cover" />
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-2">
                <DialogTitle className="sr-only">Foto {i + 1} de la tarjeta</DialogTitle>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Foto ${i + 1} de la tarjeta`} className="h-auto w-full rounded-lg" />
              </DialogContent>
            </Dialog>
          ) : null,
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Si anotaron en papel, sacale una foto y cargamos los golpes. Cada uno firma la suya.</p>

      <Sheet open={open} onOpenChange={(o) => !o && step.kind !== "uploading" && step.kind !== "reading" && setStep({ kind: "idle" })}>
        <SheetContent>
          {(step.kind === "uploading" || step.kind === "reading") && <Progress step={step} />}
          {step.kind === "error" && (
            <>
              <SheetHeader>
                <SheetTitle>No pudimos leer la foto</SheetTitle>
              </SheetHeader>
              <Notice tone="error">{step.message}</Notice>
              <SheetFooter>
                {step.photoId && step.preview && (
                  <Button size="lg" onClick={() => read(step.photoId!, step.preview!)}>
                    Leer de nuevo
                  </Button>
                )}
                <Button size="lg" variant="secondary" onClick={() => input.current?.click()}>
                  <Camera /> Sacar otra
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setStep({ kind: "idle" })}>
                  Cerrar
                </Button>
              </SheetFooter>
            </>
          )}
          {step.kind === "review" && (
            <Review
              result={step.result}
              players={players}
              holesInRound={holesInRound}
              assign={assign}
              rows={rows}
              onAssign={(i, id) => setAssign(assign.map((a, j) => (j === i ? id : a)))}
              onCell={(i, k, v) => setRows(rows.map((r, j) => (j === i ? r.map((x, q) => (q === k ? v : x)) : r)))}
              footer={
                <SheetFooter>
                  <Button size="lg" pending={pending} pendingLabel="Cargando…" disabled={assign.every((a) => !a)} onClick={apply}>
                    Cargar golpes
                  </Button>
                  <Button size="lg" variant="ghost" disabled={pending} onClick={discard}>
                    Descartar
                  </Button>
                </SheetFooter>
              }
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Progress({ step }: { step: Extract<Step, { kind: "uploading" | "reading" }> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (step.kind !== "reading") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step.kind]);
  const seconds = step.kind === "reading" ? Math.max(0, Math.round((now - step.since) / 1000)) : 0;
  return (
    <div aria-live="polite">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Spinner className="size-5" /> {step.kind === "uploading" ? "Subiendo la foto" : "Leyendo la tarjeta"}
        </SheetTitle>
        <SheetDescription>{step.kind === "uploading" ? "La achicamos para que suba rápido." : `Suele tardar 10–20 segundos. Van ${seconds}.`}</SheetDescription>
      </SheetHeader>
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
      <img src={step.preview} alt="Vista previa de la foto" className="max-h-72 w-full rounded-md object-contain opacity-80" />
    </div>
  );
}

function Review({
  result,
  players,
  holesInRound,
  assign,
  rows,
  onAssign,
  onCell,
  footer,
}: {
  result: ExtractionResult;
  players: { id: string; name: string; locked: boolean }[];
  holesInRound: number;
  assign: (string | null)[];
  rows: (number | null)[][];
  onAssign: (i: number, id: string | null) => void;
  onCell: (i: number, k: number, v: number | null) => void;
  footer: React.ReactNode;
}) {
  const halves = holesInRound === 18 ? [0, 9] : [0];
  return (
    <>
      <SheetHeader>
        <SheetTitle>Revisá lo que leímos</SheetTitle>
        <SheetDescription>
          {fmtCount(result.extraction.rows.length, "fila")}. Elegí de quién es cada una y corregí lo que haga falta. Lo dudoso está en ámbar.
        </SheetDescription>
      </SheetHeader>
      {result.extraction.notes && <Notice tone="info">{result.extraction.notes}</Notice>}
      <div className="mt-2 divide-y divide-border">
        {result.extraction.rows.map((row, i) => {
          const sum = rows[i].reduce<number>((acc, v) => acc + (v ?? 0), 0);
          return (
            <div key={i} className="py-4">
              <div className="flex items-center gap-2">
                <span className="min-w-0 shrink truncate text-base">“{row.name}”</span>
                <Select size="sm" className="ml-auto w-44" aria-label={`De quién es la fila “${row.name}”`} value={assign[i] ?? ""} onChange={(e) => onAssign(i, e.target.value || null)}>
                  <option value="">(ignorar)</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.locked}>
                      {p.name}
                      {p.locked ? " (firmada)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              {halves.map((start) => (
                <div key={start} className="mt-2 grid grid-cols-9 gap-1">
                  {rows[i].slice(start, start + 9).map((v, k) => (
                    <CellInput
                      key={start + k}
                      aria-label={`Hoyo ${start + k + 1}`}
                      uncertain={row.uncertain.includes(start + k)}
                      value={v ?? ""}
                      className="h-11 px-0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        onCell(i, start + k, raw === "" ? null : Math.min(30, Number(raw)));
                      }}
                    />
                  ))}
                </div>
              ))}
              <p className="mt-2 text-sm text-muted-foreground">
                Suma <strong className="text-foreground">{sum}</strong>
                {row.writtenTotal != null && row.writtenTotal !== sum && (
                  <span className="text-warn-ink">, en la tarjeta dice {row.writtenTotal}</span>
                )}
                {row.uncertain.length > 0 && `. ${fmtCount(row.uncertain.length, "número dudoso", "números dudosos")}`}
              </p>
            </div>
          );
        })}
      </div>
      {footer}
    </>
  );
}

function padTo(arr: (number | null)[], n: number) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push(null);
  return out;
}
