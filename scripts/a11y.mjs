// Auditoría automática de accesibilidad (axe, WCAG 2.2 A/AA) sobre /login y /dev/playground,
// en claro y oscuro, y con la hoja de confirmación y la de acciones abiertas. Levanta `next dev`
// con variables de mentira salvo que se pase --url. Falla con violaciones serias o críticas.
//
//   pnpm a11y
//   pnpm a11y -- --url http://localhost:3000
import { spawn } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const urlArg = args.includes("--url") ? args[args.indexOf("--url") + 1] : undefined;
const PORT = 3997;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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
let base = urlArg;
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

// Escenarios: ruta + qué abrir antes de auditar.
const SCENES = [
  { name: "login", route: "/login" },
  { name: "playground", route: "/dev/playground" },
  {
    name: "confirmación abierta",
    route: "/dev/playground",
    open: async (page) => {
      await page.locator("#overlays").getByRole("button", { name: "Confirmación" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "hoja de acciones abierta",
    route: "/dev/playground",
    open: async (page) => {
      await page.locator("#overlays").getByRole("button", { name: "Más acciones (hoja)" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
];

const browser = await chromium.launch();
let serious = 0;
try {
  for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme, reducedMotion: "reduce", locale: "es-AR" });
    for (const scene of SCENES) {
      const page = await context.newPage();
      await page.goto(base + scene.route, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      if (scene.open) await scene.open(page);
      await page.waitForTimeout(400);
      const builder = new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal");
      // Con una hoja abierta solo interesa la hoja (el resto queda inerte detrás).
      if (scene.open) builder.include("[role=dialog]");
      const { violations, passes } = await builder.analyze();
      for (const v of violations) {
        const bad = v.impact === "serious" || v.impact === "critical";
        if (bad) serious++;
        console.log(`${bad ? "✗" : "·"} [${colorScheme}] ${scene.name}: ${v.id} (${v.impact}) — ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
      }
      if (violations.length === 0) console.log(`ok [${colorScheme}] ${scene.name} (${passes.length} reglas pasan)`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
if (serious) {
  console.error(`${serious} violación(es) serias o críticas.`);
  process.exit(1);
}
console.log("Accesibilidad OK (axe).");
