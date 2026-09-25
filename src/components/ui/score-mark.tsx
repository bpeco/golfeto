"use client";

import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { notationFor, notationLabel, type NotationShape } from "@/lib/score-notation";
import { cn } from "@/lib/utils";

// Grosor del trazo en unidades del viewBox (40): ~1,5 px en sm/md y ~3 px en lg. No se usa
// vector-effect: non-scaling-stroke porque rompe el pathLength de la animación de dibujo.
const SIZES = {
  sm: { box: "size-9", text: "text-lg", stroke: 1.7 },
  md: { box: "size-12", text: "text-2xl", stroke: 1.7 },
  lg: { box: "size-36", text: "text-numeral-2xl", stroke: 0.9 },
} as const;

const TONE = {
  under: "text-score-under",
  over: "text-score-over",
  par: "text-foreground",
  "picked-up": "text-warn-ink",
  empty: "text-muted-foreground",
} as const;

/**
 * Golpes de un hoyo con la marca de la tarjeta de papel alrededor: círculo (birdie),
 * doble círculo (eagle o mejor), cuadrado (bogey), doble cuadrado (doble bogey o peor),
 * barra (Hoyo no terminado). Con `animate`, la marca se dibuja al cambiar (250 ms).
 */
export function ScoreMark({
  strokes,
  par,
  pickedUp = false,
  size = "sm",
  animate = false,
  className,
}: {
  strokes: number | null | undefined;
  par: number;
  pickedUp?: boolean;
  size?: keyof typeof SIZES;
  animate?: boolean;
  className?: string;
}) {
  const n = notationFor(strokes, par, pickedUp);
  const s = SIZES[size];
  const reduced = useReducedMotion();
  const draw = animate && !reduced;
  return (
    <span
      role="img"
      aria-label={notationLabel(strokes, par, pickedUp)}
      data-shape={n.shape}
      className={cn("relative inline-flex shrink-0 items-center justify-center", s.box, TONE[n.tone], className)}
    >
      <svg viewBox="0 0 40 40" aria-hidden className="absolute inset-0 size-full overflow-visible" fill="none" stroke="currentColor">
        <Shape shape={n.shape} strokeWidth={s.stroke} draw={draw} drawKey={`${strokes}-${pickedUp}`} />
      </svg>
      {n.tone !== "picked-up" && (
        <span aria-hidden className={cn("relative font-display leading-none font-bold tabular-nums", s.text)}>
          {strokes ?? "—"}
        </span>
      )}
    </span>
  );
}

function Shape({ shape, strokeWidth, draw, drawKey }: { shape: NotationShape; strokeWidth: number; draw: boolean; drawKey: string }) {
  const common = { strokeWidth };
  const anim = draw
    ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] as const } }
    : {};
  switch (shape) {
    case "circle":
      return <m.circle key={drawKey} cx={20} cy={20} r={17} {...common} {...anim} />;
    case "double-circle":
      return (
        <g key={drawKey}>
          <m.circle cx={20} cy={20} r={14.5} {...common} {...anim} />
          <m.circle cx={20} cy={20} r={18.5} {...common} {...anim} />
        </g>
      );
    case "square":
      return <m.rect key={drawKey} x={3.5} y={3.5} width={33} height={33} rx={1.5} {...common} {...anim} />;
    case "double-square":
      return (
        <g key={drawKey}>
          <m.rect x={6} y={6} width={28} height={28} rx={1} {...common} {...anim} />
          <m.rect x={2} y={2} width={36} height={36} rx={1.5} {...common} {...anim} />
        </g>
      );
    case "slash":
      return <m.line key={drawKey} x1={12} y1={32} x2={28} y2={8} {...common} strokeWidth={strokeWidth * 1.6} strokeLinecap="round" {...anim} />;
    default:
      return null;
  }
}
