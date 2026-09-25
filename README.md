# Galf

Anotador de golf para un grupo de amigos: partidas, tarjetas (a mano o por foto) y hándicap WHS.

- Vocabulario del dominio: `CONTEXT.md`. Decisiones: `docs/adr/`. Diseño de datos: `docs/db-design.md`.
- Stack: Next.js (App Router, PWA), Supabase (Postgres, Auth con Google, Storage), Vercel, Claude (visión).
- Esquema: `supabase/migrations/` (aplicadas en el proyecto vía MCP; el archivo es la fuente de verdad).

## Qué hace

- Grupos con link de invitación; un admin por grupo.
- Canchas versionadas: hoyos (par, hándicap de hoyo), tees (CR/Slope, distancias). Se cargan a mano o leyendo la tarjeta del club con una foto.
- Partidas con miembros e invitados sin cuenta; 18 hoyos, ida/vuelta, o cancha de 9 en dos vueltas.
- Golpes hoyo por hoyo (cualquiera anota por cualquiera) o foto de la tarjeta de papel → filas propuestas → confirmación.
- Firma personal de la tarjeta; solo lo firmado cuenta. La firma congela el snapshot WHS (hándicap de cancha, gross ajustado, diferencial).
- Hándicap Index WHS (`src/lib/handicap/`), evolución por golfista, comparación del grupo y cara a cara.
- Historial previo importado como tarjetas históricas (`scripts/seed.ts`, `docs/seed/historial.md`); cada uno lo reclama desde Perfil.

## Desarrollo

```bash
cp .env.example .env.local   # completar con las keys de Supabase y Anthropic
pnpm install
pnpm dev
pnpm test                    # vitest (motor WHS, matcher de nombres)
pnpm typecheck && pnpm lint && pnpm build
```

Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` (servidor), opcional `GALF_VISION_MODEL` (default `claude-sonnet-5`).
