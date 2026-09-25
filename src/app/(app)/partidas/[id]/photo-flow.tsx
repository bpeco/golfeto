"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Camera, Images } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { usePhotoPicker } from "@/components/ui/use-photo-picker";
import { fmtCount } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { resizeImage } from "@/lib/image-resize";
import { applyExtraction, readScorecardPhoto, uploadScorecardPhoto, type ExtractionResult } from "./photo-actions";

// La hoja de pasos y el visor de fotos se bajan aparte, al usarlos.
const loadSheet = () => import("./photo-sheet");
const PhotoSheet = dynamic(loadSheet, { ssr: false });
const PhotoViewer = dynamic(() => import("./photo-viewer"), { ssr: false });

export type Step =
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
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [assign, setAssign] = useState<(string | null)[]>([]);
  const [rows, setRows] = useState<(number | null)[][]>([]);
  const [pending, start] = useTransition();
  const [sheetMounted, setSheetMounted] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [viewerMounted, setViewerMounted] = useState(false);

  async function onFile(file: File) {
    const preview = URL.createObjectURL(file);
    setSheetMounted(true);
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

  const { inputs, takePhoto, pickPhoto } = usePhotoPicker((file) => void onFile(file));

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

  function view(i: number) {
    setViewerMounted(true);
    setViewing(i);
  }

  const viewed = viewing == null ? undefined : photos[viewing];

  return (
    <section aria-label="Fotos de la tarjeta" className="mt-6 border-t border-border pt-4">
      {inputs}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onPointerDown={() => void loadSheet()} onClick={takePhoto}>
          <Camera /> Sacar foto
        </Button>
        <Button variant="secondary" onPointerDown={() => void loadSheet()} onClick={pickPhoto}>
          <Images /> De la galería
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden">
        {photos.map((p, i) =>
          p.url ? (
            <button
              key={p.id}
              type="button"
              aria-haspopup="dialog"
              aria-label={`Ver la foto ${i + 1} de la tarjeta`}
              onClick={() => view(i)}
              className="size-14 overflow-hidden rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, sin optimizar */}
              <img src={p.url} alt="" className="size-full object-cover" />
            </button>
          ) : null,
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Si anotaron en papel, sacale una foto a la tarjeta (o subí una que ya tengas) y cargamos los golpes. Cada uno firma la suya.</p>

      {viewerMounted && (
        <PhotoViewer
          open={viewing != null}
          onOpenChange={(o) => !o && setViewing(null)}
          url={viewed?.url ?? null}
          label={`Foto ${(viewing ?? 0) + 1} de la tarjeta`}
        />
      )}

      {sheetMounted && (
        <PhotoSheet
          step={step}
          players={players}
          holesInRound={holesInRound}
          assign={assign}
          rows={rows}
          pending={pending}
          onAssign={(i, id) => setAssign(assign.map((a, j) => (j === i ? id : a)))}
          onCell={(i, k, v) => setRows(rows.map((r, j) => (j === i ? r.map((x, q) => (q === k ? v : x)) : r)))}
          onRetry={read}
          onTakePhoto={takePhoto}
          onPickPhoto={pickPhoto}
          onApply={apply}
          onDiscard={discard}
          onClose={() => setStep({ kind: "idle" })}
        />
      )}
    </section>
  );
}

function padTo(arr: (number | null)[], n: number) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push(null);
  return out;
}
