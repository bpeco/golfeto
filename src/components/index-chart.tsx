"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fmtIndex, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Series = { id: string; name: string; points: { date: string; value: number }[] };

// Paleta categórica validada (skill dataviz, claro y oscuro) en los tokens --chart-1..8 de
// globals.css: orden fijo, nunca cíclico.
const seriesColor = (i: number) => `var(--chart-${i + 1})`;

/**
 * Evolución del Hándicap Index, una línea por golfista. Se dibuja al ancho real del contenedor
 * (las etiquetas quedan de 12 px de verdad). Tocar o arrastrar muestra los valores de esa fecha;
 * "Ver tabla" da lo mismo en texto. Deja scrollear la página (touch-action: pan-y).
 */
export function IndexChart({
  series,
  title,
  highlightId,
  height = 220,
  className,
}: {
  series: Series[];
  title: string;
  /** Serie propia: línea más gruesa. */
  highlightId?: string;
  height?: number;
  className?: string;
}) {
  const uid = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = useMemo(() => series.filter((s) => s.points.length > 0).slice(0, 8), [series]);
  const dates = useMemo(() => Array.from(new Set(visible.flatMap((s) => s.points.map((p) => p.date)))).sort(), [visible]);
  const values = visible.flatMap((s) => s.points.map((p) => p.value));

  if (dates.length === 0 || values.length === 0) {
    return (
      <p className={cn("border-y border-dashed border-line-strong py-6 text-base text-muted-foreground", className)}>
        Con 3 tarjetas firmadas aparece la evolución.
      </p>
    );
  }

  const W = width;
  const H = height;
  const m = { top: 14, right: 40, bottom: 26, left: 30 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const span = Math.max(...values) - Math.min(...values);
  const step = span > 12 ? 5 : 2;
  const minV = Math.floor(Math.min(...values) / step) * step;
  const maxV = Math.max(minV + step, Math.ceil(Math.max(...values) / step) * step);
  const t0 = Date.parse(dates[0]);
  const t1 = Date.parse(dates.at(-1)!);
  const x = (d: string) => (t1 === t0 ? m.left + iw / 2 : m.left + ((Date.parse(d) - t0) / (t1 - t0)) * iw);
  const y = (v: number) => m.top + ih - ((v - minV) / (maxV - minV)) * ih;
  const ticks = Array.from({ length: (maxV - minV) / step + 1 }, (_, i) => minV + i * step);

  const hoverDate = hover != null ? dates[hover] : null;
  const readout = hoverDate
    ? visible.map((s, i) => ({ id: s.id, name: s.name, color: i, value: s.points.filter((q) => q.date <= hoverDate).at(-1)?.value ?? null }))
    : [];

  function pick(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left;
    let best = 0;
    let bd = Infinity;
    dates.forEach((d, i) => {
      const dd = Math.abs(x(d) - px);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <figure className={cn("border-y border-border py-3", className)}>
      <figcaption className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">↓ más bajo es mejor</span>
        <button type="button" className="min-h-tap px-1 text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setTable(!table)}>
          {table ? "Ver gráfico" : "Ver tabla"}
        </button>
      </figcaption>

      <div ref={box}>
        {table ? (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="border-b border-line-strong text-muted-foreground">
                  <th className="py-2 text-left font-semibold">Fecha</th>
                  {visible.map((s) => (
                    <th key={s.id} className="py-2 text-right font-semibold">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((d) => (
                  <tr key={d} className="border-b border-border">
                    <td className="py-1.5">{formatDate(d)}</td>
                    {visible.map((s) => {
                      const p = s.points.find((q) => q.date === d);
                      return (
                        <td key={s.id} className="py-1.5 text-right font-display text-base font-bold tabular-nums">
                          {p ? fmtIndex(p.value) : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              className="block touch-pan-y select-none"
              role="img"
              aria-labelledby={`${uid}-t`}
              onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
              onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons ? pick(e.clientX, e.currentTarget.getBoundingClientRect()) : undefined)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
            >
              <title id={`${uid}-t`}>{title}</title>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
                  <text x={m.left - 6} y={y(t) + 4} fontSize={12} textAnchor="end" fill="var(--muted-foreground)">
                    {t}
                  </text>
                </g>
              ))}
              {[dates[0], dates.at(-1)!].map((d, i) => (
                <text key={d + i} x={i === 0 ? m.left : W - m.right} y={H - 6} fontSize={12} textAnchor={i === 0 ? "start" : "end"} fill="var(--muted-foreground)">
                  {formatDate(d, { year: false })}
                </text>
              ))}
              {visible.map((s, i) => {
                const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
                const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
                const last = pts.at(-1)!;
                const mine = s.id === highlightId;
                return (
                  <g key={s.id}>
                    <path d={d} fill="none" stroke={seriesColor(i)} strokeWidth={mine ? 2.5 : 1.75} strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={x(last.date)} cy={y(last.value)} r={mine ? 5 : 4} fill={seriesColor(i)} stroke="var(--background)" strokeWidth={2} />
                    {visible.length <= 3 && (
                      <text x={x(last.date) + 8} y={y(last.value) + 4} fontSize={12} fontWeight={600} fill="var(--foreground)">
                        {fmtIndex(last.value)}
                      </text>
                    )}
                  </g>
                );
              })}
              {hoverDate && (
                <line x1={x(hoverDate)} x2={x(hoverDate)} y1={m.top} y2={m.top + ih} stroke="var(--foreground)" strokeOpacity={0.45} strokeWidth={1} />
              )}
            </svg>
            <div aria-live="polite" className="mt-2 min-h-6 text-sm">
              {hoverDate ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">{formatDate(hoverDate)}</span>
                  {readout.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: seriesColor(r.color) }} />
                      <span className="text-muted-foreground">{r.name}</span>
                      <strong className="font-display text-base tabular-nums">{r.value == null ? "—" : fmtIndex(r.value)}</strong>
                    </span>
                  ))}
                </div>
              ) : (
                visible.length >= 2 && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {visible.map((s, i) => (
                      <li key={s.id} className={cn("inline-flex items-center gap-1.5", s.id === highlightId && "font-semibold")}>
                        <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: seriesColor(i) }} />
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </>
        )}
      </div>
    </figure>
  );
}
