"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SaveState } from "@/components/ui/save-status";
import { fail, friendlyDbError, type ActionResult } from "@/lib/action-result";
import type { HoleScore } from "@/lib/scorecard-totals";

const EMPTY: HoleScore = { strokes: null, pickedUp: false };

type Options = {
  initial: Record<number, HoleScore>;
  save: (position: number, score: HoleScore) => Promise<ActionResult>;
  holeLabel: (position: number) => string;
  delay?: number;
};

/**
 * Guardado automático de golpes por hoyo. El cambio se ve al instante y la tarjeta queda
 * "sucia" (no se puede firmar) hasta que el servidor confirma. Si falla, ese hoyo vuelve al
 * último valor guardado, se avisa con un toast y se puede reintentar. Al ocultarse la app
 * (bloquear el teléfono, cambiar de app) se mandan los cambios pendientes sin esperar.
 */
export function useHoleAutosave(options: Options) {
  const [scores, setScores] = useState<Record<number, HoleScore>>(options.initial);
  const [status, setStatus] = useState<SaveState>("idle");
  const [pending, setPending] = useState(0);

  // El motor se crea una vez por montaje y guarda su propio estado mutable (timers, cola).
  const [engine] = useState(() =>
    createEngine(options.initial, {
      setScores,
      report: (n, failed) => {
        setPending(n);
        setStatus(n > 0 ? "saving" : failed ? "error" : "saved");
      },
      options,
    }),
  );
  // Las funciones de la pantalla (save, holeLabel) cambian en cada render: el motor usa la última.
  useEffect(() => {
    engine.setOptions(options);
  });

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") engine.flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      engine.flush();
    };
  }, [engine]);

  return { scores, update: engine.update, status, dirty: pending > 0, retry: engine.retry, flush: engine.flush, replaceAll: engine.replaceAll };
}

function createEngine(
  initial: Record<number, HoleScore>,
  io: {
    setScores: (fn: (s: Record<number, HoleScore>) => Record<number, HoleScore>) => void;
    report: (pending: number, failed: boolean) => void;
    options: Options;
  },
) {
  let options = io.options;
  let confirmed: Record<number, HoleScore> = { ...initial };
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const queued = new Map<number, HoleScore>();
  let inFlight = 0;
  let lastFailure: { position: number; value: HoleScore } | null = null;

  const report = () => io.report(timers.size + inFlight, !!lastFailure);

  async function send(position: number) {
    timers.delete(position);
    const value = queued.get(position);
    if (!value) return report();
    queued.delete(position);
    inFlight++;
    report();
    let r: ActionResult;
    try {
      r = await options.save(position, value);
    } catch (err) {
      r = fail(friendlyDbError(err instanceof Error ? err.message : String(err)));
    }
    inFlight--;
    if (r.ok) {
      confirmed[position] = value;
      if (lastFailure?.position === position) lastFailure = null;
    } else {
      // Rollback, salvo que ya haya un cambio más nuevo de ese hoyo esperando.
      if (!queued.has(position)) io.setScores((s) => ({ ...s, [position]: confirmed[position] ?? EMPTY }));
      lastFailure = { position, value };
      toast.error(`No se guardó el ${options.holeLabel(position)}`, {
        id: `save-${position}`,
        description: r.error,
        action: { label: "Reintentar", onClick: () => update(position, value) },
      });
    }
    report();
  }

  function update(position: number, next: HoleScore) {
    io.setScores((s) => ({ ...s, [position]: next }));
    queued.set(position, next);
    clearTimeout(timers.get(position));
    timers.set(
      position,
      setTimeout(() => void send(position), options.delay ?? 400),
    );
    report();
  }

  function flush() {
    for (const [position, t] of timers) {
      clearTimeout(t);
      void send(position);
    }
  }

  function retry() {
    if (lastFailure) update(lastFailure.position, lastFailure.value);
  }

  /** Reemplaza todo (p. ej. después de cargar la foto): lo nuevo ya está guardado. */
  function replaceAll(next: Record<number, HoleScore>) {
    confirmed = { ...next };
    io.setScores(() => next);
  }

  function setOptions(next: Options) {
    options = next;
  }

  return { update, flush, retry, replaceAll, setOptions };
}
