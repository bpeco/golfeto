"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import type NumberFlowType from "@number-flow/react";
import { MINUS } from "@/lib/format";
import { BoardNumber, boardNumberClass, type BoardNumberProps } from "./board-number";

type NumberFlowComponent = typeof NumberFlowType;

// NumberFlow se baja aparte del primer JS. `false` = no se pudo bajar (sin red): número quieto.
let loaded: NumberFlowComponent | false | null = null;
let loading: Promise<NumberFlowComponent | false> | null = null;

/** Empieza a bajar NumberFlow (p. ej. al abrir la hoja de firma, antes de que haga falta). */
export function preloadNumberFlow() {
  loading ??= import("@number-flow/react").then(
    (mod) => (loaded = mod.default),
    () => (loaded = false),
  );
  return loading;
}

/** true cuando NumberFlow ya bajó (o falló): recién ahí tiene sentido cambiar el valor para rodar. */
function useNumberFlowSettled() {
  const [settled, setSettled] = useState(() => loaded !== null);
  useEffect(() => {
    if (settled) return;
    let alive = true;
    preloadNumberFlow().then(() => {
      if (alive) setSettled(true);
    });
    return () => {
      alive = false;
    };
  }, [settled]);
  return settled;
}

/** NumberFlow cuando está; mientras tanto (o sin red), `fallback`. */
function Flow({ fallback, ...props }: ComponentProps<NumberFlowComponent> & { fallback: ReactNode }) {
  const [NumberFlow, setNumberFlow] = useState<NumberFlowComponent | null>(() => loaded || null);
  useEffect(() => {
    if (NumberFlow) return;
    let alive = true;
    preloadNumberFlow().then((c) => {
      if (alive && c) setNumberFlow(() => c);
    });
    return () => {
      alive = false;
    };
  }, [NumberFlow]);
  return NumberFlow ? <NumberFlow {...props} /> : fallback;
}

/**
 * Si hay `from`, arranca mostrándolo y pasa a `value` recién cuando NumberFlow está listo
 * (+350 ms), para que se vea rodar aunque el JS llegue tarde. Sin NumberFlow, salta.
 */
function useRollFrom(value: number | null | undefined, from: number | null | undefined, ready: boolean) {
  const [arrived, setArrived] = useState(from === undefined);
  useEffect(() => {
    if (arrived) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- con movimiento reducido no hay nada que esperar
      setArrived(true);
      return;
    }
    if (!ready) return;
    const t = setTimeout(() => setArrived(true), 350);
    return () => clearTimeout(t);
  }, [arrived, ready]);
  return arrived ? value : from;
}

/**
 * BoardNumber que rueda de un valor al siguiente (NumberFlow; respeta "reducir movimiento").
 * Hasta que llega NumberFlow se ve el número quieto, idéntico.
 */
export function AnimatedBoardNumber({ from, ...props }: BoardNumberProps & { from?: number | null }) {
  const value = useRollFrom(props.value, from, useNumberFlowSettled());
  const { kind = "int" } = props;
  const still = <BoardNumber {...props} value={value} />;
  if (value == null || (kind === "toPar" && value === 0)) return still;

  const className = boardNumberClass({ ...props, value });
  if (kind === "index") {
    return (
      <Flow
        fallback={still}
        className={className}
        value={Math.abs(value)}
        prefix={value < 0 ? "+" : undefined}
        locales="es-AR"
        format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
      />
    );
  }
  if (kind === "toPar") return <Flow fallback={still} className={className} value={Math.abs(value)} prefix={value > 0 ? "+" : MINUS} />;
  return <Flow fallback={still} className={className} value={value} />;
}

/** Entero que rueda al cambiar (el número del stepper). Mismas clases que el texto que reemplaza. */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  return <Flow fallback={<span className={className}>{value}</span>} className={className} value={value} />;
}
