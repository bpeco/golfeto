"use client";

import { useId, useMemo, useState } from "react";

export type Series = { id: string; name: string; points: { date: string; value: number }[] };

// Paleta categórica validada (dataviz/validate_palette.js, light y dark): orden fijo, nunca cíclico.
const LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

/**
 * Evolución del Hándicap Index (línea por golfista). Eje Y invertido no: menor es mejor,
 * pero se lee mejor como valor; se anota "↓ mejor" en el eje.
 */
export function IndexChart({ series, title }: { series: Series[]; title: string }) {
  const uid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const visible = series.filter((s) => s.points.length > 0).slice(0, 8);
  const dates = useMemo(
    () => Array.from(new Set(visible.flatMap((s) => s.points.map((p) => p.date)))).sort(),
    [visible],
  );
  const values = visible.flatMap((s) => s.points.map((p) => p.value));
  if (dates.length === 0 || values.length === 0) {
    return <p className="text-sm text-muted">Sin tarjetas firmadas suficientes para graficar (mínimo 3).</p>;
  }

  const W = 640;
  const H = 260;
  const m = { top: 16, right: 56, bottom: 28, left: 36 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const minV = Math.floor(Math.min(...values) / 5) * 5;
  const maxV = Math.ceil(Math.max(...values) / 5) * 5;
  const t0 = new Date(dates[0]).getTime();
  const t1 = new Date(dates.at(-1)!).getTime();
  const x = (d: string) => (t1 === t0 ? m.left + iw / 2 : m.left + ((new Date(d).getTime() - t0) / (t1 - t0)) * iw);
  const y = (v: number) => m.top + ih - ((v - minV) / Math.max(1, maxV - minV)) * ih;
  const ticks = Array.from({ length: (maxV - minV) / 5 + 1 }, (_, i) => minV + i * 5).filter((_, i, a) => a.length <= 7 || i % 2 === 0);

  const hoverDate = hover != null ? dates[hover] : null;
  const readout = hoverDate
    ? visible.map((s, i) => {
        const p = [...s.points].filter((q) => q.date <= hoverDate).at(-1);
        return { name: s.name, value: p?.value ?? null, color: i };
      })
    : [];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
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
    <figure className="viz-root rounded-2xl border border-border bg-surface p-3">
      <style>{`
        .viz-root { --viz-grid: color-mix(in oklab, var(--foreground) 12%, transparent); ${LIGHT.map((c, i) => `--s${i}: ${c};`).join(" ")} }
        @media (prefers-color-scheme: dark) { .viz-root { ${DARK.map((c, i) => `--s${i}: ${c};`).join(" ")} } }
      `}</style>
      <figcaption className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <button type="button" className="text-xs text-muted underline" onClick={() => setTable(!table)}>
          {table ? "Ver gráfico" : "Ver tabla"}
        </button>
      </figcaption>

      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 text-left">Fecha</th>
                {visible.map((s) => <th key={s.id} className="py-1 text-right">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => (
                <tr key={d} className="border-t border-border">
                  <td className="py-1">{d}</td>
                  {visible.map((s) => {
                    const p = s.points.find((q) => q.date === d);
                    return <td key={s.id} className="py-1 text-right tabular-nums">{p ? p.value.toFixed(1) : ""}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none"
            role="img"
            aria-labelledby={`${uid}-t`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <title id={`${uid}-t`}>{title}</title>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
                <text x={m.left - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">{t}</text>
              </g>
            ))}
            <text x={m.left - 6} y={m.top - 4} fontSize={9} textAnchor="end" fill="var(--muted)">↓ mejor</text>
            {[dates[0], dates.at(-1)!].map((d, i) => (
              <text key={d + i} x={x(d)} y={H - 8} fontSize={10} textAnchor={i === 0 ? "start" : "end"} fill="var(--muted)">
                {shortDate(d)}
              </text>
            ))}
            {visible.map((s, i) => {
              const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
              const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
              const last = pts.at(-1)!;
              return (
                <g key={s.id}>
                  <path d={d} fill="none" stroke={`var(--s${i})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={x(last.date)} cy={y(last.value)} r={6} fill="var(--surface)" />
                  <circle cx={x(last.date)} cy={y(last.value)} r={4} fill={`var(--s${i})`} />
                  <text x={x(last.date) + 8} y={y(last.value) + 3} fontSize={10} fill="var(--foreground)">
                    {last.value.toFixed(1)}
                  </text>
                </g>
              );
            })}
            {hoverDate && (
              <line x1={x(hoverDate)} x2={x(hoverDate)} y1={m.top} y2={m.top + ih} stroke="var(--foreground)" strokeOpacity={0.4} strokeWidth={1} />
            )}
          </svg>
          {hoverDate && (
            <div className="mt-1 rounded-xl bg-background px-3 py-2 text-xs">
              <p className="mb-1 text-muted">{shortDate(hoverDate)}</p>
              {readout.map((r) => (
                <p key={r.name} className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-4" style={{ background: `var(--s${r.color})` }} />
                  <strong className="tabular-nums">{r.value == null ? "—" : r.value.toFixed(1)}</strong>
                  <span className="text-muted">{r.name}</span>
                </p>
              ))}
            </div>
          )}
          {visible.length >= 2 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {visible.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4" style={{ background: `var(--s${i})` }} />
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </figure>
  );
}

function shortDate(iso: string) {
  const [y, mo, d] = iso.split("-");
  return `${d}/${mo}/${y.slice(2)}`;
}
