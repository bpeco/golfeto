"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import type { SaveState } from "@/components/ui/save-status";
import { fail, friendlyDbError, type ActionResult } from "@/lib/action-result";
import type { HoleScore } from "@/lib/scorecard-totals";

const EMPTY: HoleScore = { strokes: null, pickedUp: false };

export type CardScores = Record<string, Record<number, HoleScore>>;

type Options = {
  initial: CardScores;
  save: (cardId: string, position: number, score: HoleScore) => Promise<ActionResult>;
  holeLabel: (cardId: string, position: number) => string;
  delay?: number;
};

/**
 * Guardado automático de golpes, por tarjeta y hoyo. El cambio se ve al instante y la tarjeta
 * queda "sucia" (no se puede firmar) hasta que el servidor confirma. Si falla, ese hoyo vuelve
 * al último valor guardado, se avisa con un toast y se puede reintentar. Al ocultarse la app
 * (bloquear el teléfono, cambiar de app) se mandan los cambios pendientes sin esperar.
 */
export function useScoresAutosave(options: Options) {
  const [scores, setScores] = useState<CardScores>(options.initial);
  const [status, setStatus] = useState<SaveState>("idle");
  const [dirtyCards, setDirtyCards] = useState<ReadonlySet<string>>(new Set());
  const [engine] = useState(() =>
    createEngine(options.initial, {
      setScores,
      report: (pendingKeys, failed) => {
        setDirtyCards(new Set(pendingKeys.map((k) => k.split("|")[0])));
        setStatus(pendingKeys.length > 0 ? "saving" : failed ? "error" : "saved");
      },
      options,
    }),
  );
  // save y holeLabel cambian en cada render: el motor usa la última versión.
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

  return {
    scores,
    update: engine.update,
    status,
    dirtyCards,
    retry: engine.retry,
    flush: engine.flush,
    /** Lo que vino del servidor (refresh): pisa las tarjetas sin cambios pendientes. */
    syncFromServer: engine.syncFromServer,
  };
}

function createEngine(
  initial: CardScores,
  io: {
    setScores: (fn: (s: CardScores) => CardScores) => void;
    report: (pendingKeys: string[], failed: boolean) => void;
    options: Options;
  },
) {
  let options = io.options;
  const confirmed: CardScores = structuredClone(initial);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const queued = new Map<string, HoleScore>();
  const inFlight = new Set<string>();
  let lastFailure: { cardId: string; position: number; value: HoleScore } | null = null;

  const key = (cardId: string, position: number) => `${cardId}|${position}`;
  // Pendiente = con timer, en vuelo, o esperando que termine el guardado anterior del mismo hoyo.
  const pendingKeys = () => [...new Set([...timers.keys(), ...inFlight, ...queued.keys()])];
  const report = () => io.report(pendingKeys(), !!lastFailure);
  const setOne = (cardId: string, position: number, value: HoleScore) =>
    io.setScores((s) => ({ ...s, [cardId]: { ...s[cardId], [position]: value } }));

  // Un solo guardado en vuelo por hoyo: si llega otro cambio, espera y sale al terminar el
  // anterior (así el último valor es el que queda en la base y en pantalla).
  async function send(cardId: string, position: number) {
    const k = key(cardId, position);
    timers.delete(k);
    const value = queued.get(k);
    if (!value || inFlight.has(k)) return report();
    queued.delete(k);
    inFlight.add(k);
    report();
    let r: ActionResult;
    try {
      r = await options.save(cardId, position, value);
    } catch (err) {
      r = fail(friendlyDbError(err instanceof Error ? err.message : String(err)));
    }
    inFlight.delete(k);
    if (r.ok) {
      confirmed[cardId] = { ...confirmed[cardId], [position]: value };
      if (lastFailure && key(lastFailure.cardId, lastFailure.position) === k) lastFailure = null;
    } else {
      // Rollback, salvo que ya haya un cambio más nuevo de ese hoyo esperando.
      if (!queued.has(k) && !timers.has(k)) setOne(cardId, position, confirmed[cardId]?.[position] ?? EMPTY);
      lastFailure = { cardId, position, value };
      toast.error(`No se guardó el ${options.holeLabel(cardId, position)}`, {
        id: `save-${k}`,
        description: r.error,
        action: { label: "Reintentar", onClick: () => update(cardId, position, value) },
      });
    }
    // Un cambio más nuevo que esperaba a este (su timer ya venció): sale ahora.
    if (queued.has(k) && !timers.has(k)) return send(cardId, position);
    report();
  }

  function update(cardId: string, position: number, next: HoleScore) {
    const k = key(cardId, position);
    setOne(cardId, position, next);
    queued.set(k, next);
    clearTimeout(timers.get(k));
    timers.set(
      k,
      setTimeout(() => void send(cardId, position), options.delay ?? 400),
    );
    report();
  }

  function flush() {
    for (const [k, t] of timers) {
      clearTimeout(t);
      const [cardId, position] = k.split("|");
      void send(cardId, Number(position));
    }
  }

  function retry() {
    if (lastFailure) update(lastFailure.cardId, lastFailure.position, lastFailure.value);
  }

  function syncFromServer(server: CardScores) {
    const busy = new Set(pendingKeys().map((k) => k.split("|")[0]));
    const fresh: CardScores = {};
    for (const [cardId, s] of Object.entries(server)) {
      if (busy.has(cardId)) continue;
      confirmed[cardId] = { ...s };
      fresh[cardId] = s;
    }
    if (Object.keys(fresh).length) io.setScores((prev) => ({ ...prev, ...fresh }));
  }

  function setOptions(next: Options) {
    options = next;
  }

  return { update, flush, retry, syncFromServer, setOptions };
}
