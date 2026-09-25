// Contraste WCAG de los tokens de src/app/globals.css, en claro y oscuro. Sin dependencias.
// Resuelve var(), convierte OKLCH → sRGB y compara los pares mínimos del brief de diseño.
// Imprime los hex de fondo (para theme_color y el viewport) y sale con 1 si algún par no llega.
//
//   pnpm contrast            # tabla + verificación
//   pnpm contrast -- --json  # hex de cada token resuelto, para usar en manifest/íconos
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No encontré ${selector} en globals.css`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const light = block(":root");
const dark = { ...light, ...block(".dark") };

function resolve(vars, value, depth = 0) {
  const m = value.match(/^var\(--([\w-]+)\)$/);
  if (!m) return value;
  if (depth > 10 || !(m[1] in vars)) throw new Error(`No se puede resolver ${value}`);
  return resolve(vars, vars[m[1]], depth + 1);
}

// OKLCH → sRGB (Björn Ottosson). Devuelve [r, g, b] en 0..1 (sin recortar) y alpha.
function oklchToSrgb(str) {
  const m = str.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (!m) return null;
  const [L, C, H] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, mm, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const gamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return { rgb: lin.map((x) => Math.min(1, Math.max(0, gamma(x)))), alpha: m[4] ? Number(m[4]) : 1 };
}

function hex(rgb) {
  return "#" + rgb.map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

function luminance(rgb) {
  const lin = rgb.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratio(vars, fg, bg) {
  const f = oklchToSrgb(resolve(vars, vars[fg]));
  const b = oklchToSrgb(resolve(vars, vars[bg]));
  const [l1, l2] = [luminance(f.rgb), luminance(b.rgb)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// [texto, fondo, mínimo, para qué]
const PAIRS = [
  ["foreground", "background", 12, "tinta sobre la página"],
  ["foreground", "card", 12, "tinta sobre superficie"],
  ["muted-foreground", "background", 4.5, "metadatos"],
  ["muted-foreground", "card", 4.5, "metadatos sobre superficie"],
  ["muted-foreground", "muted", 4.5, "cabeceras de tabla"],
  ["primary", "background", 4.5, "links y acciones en texto"],
  ["primary-foreground", "primary", 4.5, "botón primario"],
  ["destructive", "background", 4.5, "texto destructivo"],
  ["destructive-foreground", "destructive", 4.5, "botón destructivo"],
  ["board-foreground", "board", 7, "numerales de pizarra"],
  ["board-muted", "board", 4.5, "etiquetas de pizarra"],
  ["board-under", "board", 4.5, "bajo par en la pizarra"],
  ["board-over", "board", 4.5, "sobre par en la pizarra"],
  ["score-under", "card", 4.5, "bajo par"],
  ["score-over", "card", 4.5, "sobre par"],
  ["score-under", "background", 4.5, "bajo par sobre la página"],
  ["score-over", "background", 4.5, "sobre par sobre la página"],
  ["warn-foreground", "warn", 4.5, "aviso sobre ámbar"],
  ["warn-ink", "background", 3, "ícono y marca de aviso (no texto)"],
  ["ring", "background", 3, "foco visible"],
  ["line-strong", "background", 1.8, "regla fuerte de la grilla (decorativa)"],
];

if (process.argv.includes("--json")) {
  const out = {};
  for (const [name, vars] of [["light", light], ["dark", dark]]) {
    out[name] = {};
    for (const key of Object.keys(vars)) {
      const c = oklchToSrgb(resolve(vars, vars[key]));
      if (c) out[name][key] = hex(c.rgb);
    }
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

let failed = 0;
for (const [name, vars] of [["claro", light], ["oscuro", dark]]) {
  console.log(`\n${name}  (background ${hex(oklchToSrgb(resolve(vars, vars.background)).rgb)}, board ${hex(oklchToSrgb(resolve(vars, vars.board)).rgb)})`);
  for (const [fg, bg, min, what] of PAIRS) {
    const r = ratio(vars, fg, bg);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "  ok " : "  NO "} ${r.toFixed(2).padStart(6)} ≥ ${String(min).padEnd(4)} ${fg} / ${bg}  (${what})`);
  }
}
if (failed) {
  console.error(`\n${failed} par(es) sin contraste suficiente. Ajustar L (nunca chroma > 0.19).`);
  process.exit(1);
}
console.log("\nContraste OK.");
