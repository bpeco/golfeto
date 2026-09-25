# Galf

Anotador de golf para un grupo de amigos (Next.js + Supabase + Vercel + Claude visión).

**Al arrancar una sesión, leer en este orden:** `docs/handoff.md` (infra y estado operativo), `docs/roadmap.md` (hecho / pendiente), `CONTEXT.md` (vocabulario obligatorio), `docs/adr/` (decisiones), `docs/db-design.md` (convenciones de base de datos). Antes de tocar UI: `PRODUCT.md` (para quién y en qué condiciones) y `DESIGN.md` (lenguaje visual, tokens, primitivas). Al cerrar una sesión, actualizar `docs/roadmap.md` y, si cambió la infraestructura, `docs/handoff.md`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `bpeco/golfeto` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
