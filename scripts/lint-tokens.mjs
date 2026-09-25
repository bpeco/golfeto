// Puerta de tokens: Tailwind no tipa clases, así que un nombre viejo o un color crudo pierde
// estilo (o se sale del sistema) en silencio. Falla si aparece alguno de estos en src/.
//   pnpm lint:tokens
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RULES = [
  [/\btext-muted(?![-\w])/, "text-muted ya no es texto: usar text-muted-foreground"],
  [/\bbg-surface(?![-\w])|--surface(?![-\w])/, "surface se llama card: bg-card / var(--card)"],
  [/\b(?:text|border)-accent(?![-\w])/, "accent ya no es la marca: usar primary (accent es solo el tinte de hover)"],
  [/\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:red|yellow|blue|green|amber|orange|gray|slate|zinc|neutral|stone|emerald|lime)-\d{2,3}\b/, "color de la paleta de Tailwind: usar un token (score-under, warn, destructive…)"],
  [/\b(?:bg|text|border)-(?:white|black)\b/, "blanco o negro puro: usar un token (card, foreground, surface-raised…)"],
  [/text-\[(?:[0-9]|1[01])px\]/, "nada por debajo de 12 px"],
  [/\bfont-geist\b|--font-geist/, "Geist se fue: font-sans / font-display"],
  [/\brounded-2xl\b|\brounded-3xl\b/, "sin rounded-2xl: rounded-xl solo sheet, toast y pizarra"],
  [/\bshadow-(?:xs|sm|md|lg|xl|2xl)\b/, "sin sombras de kit: solo shadow-raised (sheet, toast, barra fija)"],
  [/\buppercase tracking-(?:wide|wider|widest)\b/, "sin eyebrows en mayúsculas: encabezados en sentence case"],
];

const ROOT = "src";
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name)) files.push(p);
  }
})(ROOT);

let found = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comentarios
    for (const [re, why] of RULES) {
      if (re.test(line)) {
        found++;
        console.log(`${relative(".", file)}:${i + 1}  ${why}\n    ${line.trim()}`);
      }
    }
  });
}
if (found) {
  console.error(`\n${found} uso(s) fuera del sistema de tokens.`);
  process.exit(1);
}
console.log(`lint:tokens OK (${files.length} archivos).`);
