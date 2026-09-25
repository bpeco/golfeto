"use client";

import { Check, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CellInput } from "@/components/ui/cell-input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { fmtCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Step } from "./photo-flow";
import type { ExtractionResult } from "./photo-actions";

/** Los pasos de la foto (subiendo, leyendo, error, revisar) en una hoja. Se baja aparte, al elegir la foto. */
export default function PhotoSheet({
  step,
  players,
  holesInRound,
  assign,
  rows,
  pending,
  onAssign,
  onCell,
  onRetry,
  onPickPhoto,
  onApply,
  onDiscard,
  onClose,
}: {
  step: Step;
  players: { id: string; name: string; locked: boolean }[];
  holesInRound: number;
  assign: (string | null)[];
  rows: (number | null)[][];
  pending: boolean;
  onAssign: (i: number, id: string | null) => void;
  onCell: (i: number, k: number, v: number | null) => void;
  onRetry: (photoId: string, preview: string) => void;
  onPickPhoto: () => void;
  onApply: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={step.kind !== "idle"} onOpenChange={(o) => !o && step.kind !== "uploading" && step.kind !== "reading" && onClose()}>
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
                <Button size="lg" onClick={() => onRetry(step.photoId!, step.preview!)}>
                  Leer de nuevo
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={onPickPhoto}>
                <Images /> Cargar otra
              </Button>
              <Button size="lg" variant="ghost" onClick={onClose}>
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
            onAssign={onAssign}
            onCell={onCell}
            footer={
              <SheetFooter>
                <Button size="lg" pending={pending} pendingLabel="Cargando…" disabled={assign.every((a) => !a)} onClick={onApply}>
                  Cargar golpes
                </Button>
                <Button size="lg" variant="ghost" disabled={pending} onClick={onDiscard}>
                  Descartar
                </Button>
              </SheetFooter>
            }
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type StepState = "done" | "current" | "next";

/**
 * Mientras sube y lee: los pasos reales del proceso, con el actual marcado, y la foto al lado.
 * Sin contar segundos: un número que sube hace la espera más larga.
 */
function Progress({ step }: { step: Extract<Step, { kind: "uploading" | "reading" }> }) {
  const uploading = step.kind === "uploading";
  const steps: { label: string; state: StepState }[] = [
    { label: "Subir la foto", state: uploading ? "current" : "done" },
    { label: "Leer los golpes", state: uploading ? "next" : "current" },
    { label: "Revisar y cargar", state: "next" },
  ];
  return (
    <>
      <SheetHeader>
        <SheetTitle aria-live="polite">{uploading ? "Subiendo la foto" : "Leyendo la tarjeta"}</SheetTitle>
        <SheetDescription>Suele tardar menos de medio minuto.</SheetDescription>
      </SheetHeader>
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
        <img src={step.preview} alt="La foto que se está leyendo" className="aspect-[3/4] w-24 shrink-0 rounded-md border border-border object-cover" />
        <ol className="grid flex-1 gap-3 pt-1">
          {steps.map((s) => (
            <li key={s.label} className="flex min-h-7 items-center gap-3" aria-current={s.state === "current" ? "step" : undefined}>
              <StepMark state={s.state} />
              <span className={cn("text-base", s.state === "current" ? "font-semibold text-foreground" : s.state === "done" ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

function StepMark({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check role="img" aria-label="listo" className="size-4" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") return <Spinner label="en curso" className="size-6 shrink-0 text-primary" />;
  return <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/50" />;
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
                <Select className="ml-auto w-44" aria-label={`De quién es la fila “${row.name}”`} value={assign[i] ?? ""} onChange={(e) => onAssign(i, e.target.value || null)}>
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
