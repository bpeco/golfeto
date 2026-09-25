// JS de primera carga por ruta (gzip) a partir de los manifiestos de `next build`.
// Next 16 ya no imprime tamaños en la tabla de rutas; esto la reemplaza.
// Uso: pnpm build && node scripts/bundle-size.mjs [--json]
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const NEXT = ".next";
if (!existsSync(join(NEXT, "build-manifest.json"))) {
  console.error("No hay build: correr `pnpm build` primero.");
  process.exit(1);
}

const build = JSON.parse(readFileSync(join(NEXT, "build-manifest.json"), "utf8"));
// Los polyfills van con `nomodule`: los navegadores modernos no los bajan.
const root = [...build.rootMainFiles];
const gz = new Map();
const size = (file) => {
  const clean = file.replace(/^\/?_next\//, "");
  if (!gz.has(clean)) gz.set(clean, gzipSync(readFileSync(join(NEXT, clean))).length);
  return gz.get(clean);
};

function* manifests(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* manifests(p);
    else if (name === "page_client-reference-manifest.js") yield p;
  }
}

const rows = [];
for (const file of manifests(join(NEXT, "server", "app"))) {
  const src = readFileSync(file, "utf8");
  const match = src.match(/"entryJSFiles":(\{.*?\})\s*,\s*"/s) ?? src.match(/"entryJSFiles":(\{[^}]*\})/s);
  if (!match) continue;
  const entry = JSON.parse(match[1]);
  const files = new Set([...root, ...Object.values(entry).flat()]);
  const route = "/" + relative(join(NEXT, "server", "app"), file).replace(/\/?page_client-reference-manifest\.js$/, "");
  const bytes = [...files].reduce((s, f) => s + size(f), 0);
  rows.push({ route: route.replace(/\/\([^)]+\)/g, "") || "/", kb: Math.round(bytes / 102.4) / 10 });
}
rows.sort((a, b) => a.route.localeCompare(b.route));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const shared = Math.round(root.reduce((s, f) => s + size(f), 0) / 102.4) / 10;
  console.log(`Compartido por todas las rutas: ${shared} kB gz`);
  for (const r of rows) console.log(`${r.route.padEnd(32)} ${String(r.kb).padStart(7)} kB gz`);
}
