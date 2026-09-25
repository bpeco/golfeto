// Capturas de /login y /dev/playground en dos teléfonos, claro, oscuro y con movimiento reducido.
// Levanta `next dev` con variables de mentira (no hace falta Supabase para estas rutas) salvo que
// se pase --url. Salida en $GALF_SHOTS_DIR (por defecto <tmp>/galf-shots), nunca en el repo.
//
//   pnpm screenshots                         # todo
//   pnpm screenshots -- --url http://localhost:3000 --route /dev/playground?variant=B
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const OUT = process.env.GALF_SHOTS_DIR ?? join(tmpdir(), "galf-shots");
const PORT = 3999;
const ROUTES = arg("route") ? [arg("route")] : ["/login", "/dev/playground"];
const DEVICES = [
  { name: "390", viewport: { width: 390, height: 844 } },
  { name: "360", viewport: { width: 360, height: 800 } },
];
const PASSES = [
  { name: "claro", colorScheme: "light", reducedMotion: "no-preference" },
  { name: "oscuro", colorScheme: "dark", reducedMotion: "no-preference" },
  { name: "reducido", colorScheme: "light", reducedMotion: "reduce" },
];

async function waitFor(url, ms = 120_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {
      /* todavía no levantó */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No respondió ${url}`);
}

let server;
let base = arg("url");
if (!base) {
  base = `http://localhost:${PORT}`;
  server = spawn("pnpm", ["exec", "next", "dev", "-p", String(PORT)], {
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy",
      ANTHROPIC_API_KEY: "dummy",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "ignore",
    detached: true,
  });
  await waitFor(`${base}/login`);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let count = 0;
let overflows = 0;
try {
  for (const device of DEVICES) {
    for (const pass of PASSES) {
      const context = await browser.newContext({
        viewport: device.viewport,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        colorScheme: pass.colorScheme,
        reducedMotion: pass.reducedMotion,
        locale: "es-AR",
      });
      const page = await context.newPage();
      for (const route of ROUTES) {
        await page.goto(base + route, { waitUntil: "networkidle" });
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // indicador de next dev
        await page.waitForTimeout(1400); // deja terminar el reveal del login
        const overflow = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          if (document.documentElement.scrollWidth <= vw) return null;
          const culprits = [];
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.right <= vw + 1 || r.width === 0) continue;
            let clipped = false;
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
              if (getComputedStyle(a).overflowX !== "visible") clipped = true;
            }
            if (!clipped) culprits.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" (right ${Math.round(r.right)})`);
          }
          return culprits.slice(0, 5);
        });
        if (overflow) {
          overflows++;
          console.warn(`Scroll horizontal en ${route} a ${device.name} px: ${overflow.join("; ")}`);
        }
        const slug = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "inicio";
        const prefix = `${slug}_${device.name}_${pass.name}`;
        await page.screenshot({ path: join(OUT, `${prefix}.png`), fullPage: true });
        count++;
        for (const shot of await page.locator("[data-shot]").all()) {
          const name = await shot.getAttribute("data-shot");
          await shot.screenshot({ path: join(OUT, `${prefix}__${name}.png`) });
          count++;
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
console.log(`${count} capturas en ${OUT}`);
if (overflows) {
  console.error(`${overflows} pantalla(s) con scroll horizontal.`);
  process.exit(1);
}
