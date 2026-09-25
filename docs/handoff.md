# Handoff operativo

Lo que una sesión nueva necesita saber para tocar el proyecto sin romper nada. Sin secretos: las keys viven en Vercel y en `.env.local` (ignorado por git).

## Lectura obligatoria al arrancar

1. `CLAUDE.md` → `CONTEXT.md` (vocabulario; usar esos términos)
2. `docs/roadmap.md` (qué está hecho, qué sigue)
3. `docs/adr/` (no reabrir decisiones sin motivo)
4. `docs/db-design.md` (convenciones: baja lógica con `DELETE`, nunca `update deleted_at`; unicidad parcial; firmas como eventos)

## Infraestructura

| Cosa | Valor |
|---|---|
| Repo | `bpeco/golfeto` (GitHub) |
| Rama de producción hoy | `claude/vigilant-bardeen-6iwzid` (default del repo). Pendiente: mover a `main` |
| Rama de trabajo de la sesión 2 | `claude/awesome-lovelace-6ooihh` (ya fusionada por fast-forward en producción) |
| Vercel | proyecto `golfeto` (`prj_r4pOTc4yzgWUJlUxhs0tt9ZgRf5K`), team `bautistapeco97-gmailcoms-projects`, framework Next.js, Node 22, Deployment Protection **desactivada** (la app tiene su propio login) |
| Producción | https://golfeto.vercel.app |
| Supabase | proyecto `ktklvnwprfxlcncrjdjj` (São Paulo). Conector MCP "Supabase Galf" apunta ahí |
| Auth | Google OAuth (Google Cloud project "Galf", en modo *Testing*: solo los mails agregados como test users pueden entrar hasta apretar *Publish app*) |
| Redirect URLs en Supabase | `http://localhost:3000/**`, `https://golfeto.vercel.app/**`, `https://*.vercel.app/**` |
| Variables en Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (sensitive), `ANTHROPIC_API_KEY` (sensitive) |
| Modelo de visión | `claude-sonnet-5` (env `GALF_VISION_MODEL` para cambiarlo) |

## Migraciones

`supabase/migrations/*.sql` es la fuente de verdad. Se aplicaron con `apply_migration` del conector MCP (0001 init, 0002 security lints, 0003 claim_guest, 0004 helpers de RLS a `private`, 0005 `claimable_guests`). Para una nueva: escribir el archivo `000N_nombre.sql`, aplicarla con el conector, regenerar `src/lib/supabase/database.types.ts` (`generate_typescript_types`), correr `get_advisors` (security) y arreglar lo que marque. No hay CLI de Supabase configurada.

**Probar como usuario, no como service role.** El conector corre como `postgres` y saltea RLS y privilegios: 0002 dejó la app rota para todo usuario logueado (403 en grupos, partidas, tarjetas y en toda escritura auditada) y nadie lo vio hasta la Fase 2. Antes de aplicar una migración que toque permisos, correrla en una transacción que se deshace, haciéndose pasar por un golfista:

```sql
begin;
-- ... la migración ...
select set_config('request.jwt.claims', json_build_object('sub', '<auth user id>', 'role', 'authenticated')::text, true);
set local role authenticated;
-- ... selects / inserts / rpc como los hace la app ...
rollback;
```

No arreglar lints de "security definer ejecutable" revocando `EXECUTE` a helpers que usan las políticas: moverlos a `private` (ver `docs/db-design.md`, RLS).

## Datos que hay que saber que son provisionales

- **Miraflores y Los Cedros** tienen un layout inventado (par 71: 4 par-3, 3 par-5, 11 par-4, hándicap de hoyo en orden fijo) con `valid_from = 2020-01-01` y nota "Layout provisional". CR 70.3 / Slope 125 en blancas: el de Miraflores viene de snippets sin verificar; el de Los Cedros es una copia declarada. Reemplazar cargando la tarjeta real como **versión nueva** (Editar cancha), nunca editando la vieja: las 32 tarjetas históricas apuntan a la versión provisional y solo usan CR/Slope y par total.
- **Golfistas históricos** (Agus, Manu, Javo, Bauti, Fava) son invitados (`players.user_id` nulo) creados por el seed. Cada uno los reclama desde Perfil → "Soy yo" (RPC `claim_guest`, migración 0003). Bauti es el dueño del proyecto.
- Fechas históricas: semanales hacia atrás desde 2026-09-25, `date_approximate = true`.

## Comandos

```bash
pnpm dev            # http://localhost:3000 (necesita .env.local; ver .env.example)
pnpm test           # vitest: motor WHS, matcher de nombres, rutas públicas, …
pnpm typecheck && pnpm lint && pnpm build   # lo que corre Vercel (typecheck corre `next typegen` antes de tsc)
pnpm bundle         # JS de primera carga por ruta (gzip), después de `pnpm build`; baseline en docs/perf/
pnpm screenshots    # capturas de /login y /dev/playground (390 y 360 px, claro/oscuro/reducido) en $GALF_SHOTS_DIR; falla si hay scroll horizontal
pnpm lint:tokens    # clases fuera del sistema de tokens (nombres viejos, colores crudos, <12 px, rounded-2xl, sombras de kit)
pnpm contrast       # contraste WCAG de los tokens en claro y oscuro; `-- --json` imprime los hex
npx tsx scripts/seed.ts > seed.sql          # regenera el SQL del seed (ya aplicado; no reaplicar)
```

Sin `.env.local` se puede trabajar en UI con variables de mentira: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy ANTHROPIC_API_KEY=dummy`. Así renderizan `/login` y `/dev/playground`; el resto necesita Supabase.

**Playground** (`/dev/playground`, `src/app/dev/playground/`): catálogo de componentes con fixtures tipados (sin Supabase). Visible en desarrollo, en los deploys Preview de Vercel (`VERCEL_ENV=preview`, automático) o con `GALF_PLAYGROUND=1`; en producción da 404. `/dev` es público solo en esos casos (`src/lib/public-paths.ts`).

**Rutas públicas:** toda ruta o archivo que tenga que servirse sin sesión (íconos, splash, manifest) va en `src/lib/public-paths.ts` (`isPublicPath`, con test) y, si es un estático nuevo, en el `matcher` de `src/proxy.ts`.

## Convenciones de código

- App Router, Server Components por defecto; `"use client"` solo donde hay interacción. Las pantallas con sesión viven en el route group `src/app/(app)/` (su `layout.tsx` pone el `<main>` y la `BottomNav`); `login`, `auth` y `dev` quedan afuera. Cada página pone su `PageHeader`. Lecturas que comparten página y `generateMetadata` van envueltas en `cache()` (`getRound`, `getCourse`, `getPlayerStats`, `getGroup`, `listMyGroups`); **no** envolver `getPlayerHandicap` (la firma lo lee antes y después de firmar en la misma acción).
- Acciones de servidor en `actions.ts` por feature; esquemas zod en `schema.ts` aparte (un archivo `"use server"` solo puede exportar funciones async), importando `z` de `@/lib/zod` (locale español). Toda acción devuelve `ActionResult` (`src/lib/action-result.ts`): `ok(data)` o `fail(mensaje, fields?)`; errores de Supabase siempre por `friendlyDbError`. Si la acción redirige, el mensaje de éxito va con `flash()` (`src/lib/flash.ts`, cookie de 30 s que muestra `FlashToaster`). Confirmaciones con `useConfirm()` (hoja desde abajo), nunca `confirm()`.
- Embeds de Supabase con hint de FK cuando hay ambigüedad por las columnas de auditoría: `players!group_members_player_id_fkey(...)`.
- Cálculo WHS solo en `src/lib/handicap/` (puro, testeado). La base guarda el snapshot en `scorecard_signatures`.
- Gráficos: SVG propio en `src/components/index-chart.tsx`, paleta validada con el skill `dataviz` (tokens `--chart-1..8`).
- UI (rediseño "tarjeta y pizarra", ver `DESIGN.md`): primitivas en `src/components/ui/` con forma de shadcn sobre `@base-ui/react` (polimorfismo con `render`, no `asChild`) + propias; `cn()` en `src/lib/utils.ts` (tailwind-merge extendido con `text-numeral*`, `tap`, `thumb`). Íconos `lucide-react` 1.x (verificar nombres en su `.d.ts`: la 1.x quitó alias, p. ej. `Trash2` → `Trash`). Animación solo con `m.*` de `motion/react-m` (LazyMotion strict en `src/app/providers.tsx`). Tema con `next-themes` (clase `.dark` en `<html>`, clave `galf:theme`). Toasts con `sonner`. Numerales animados con `@number-flow/react`. Versiones pineadas exactas en `package.json`: no actualizar a mitad del rediseño.
- Clases de color solo sobre roles (`bg-card`, `text-muted-foreground`, `text-score-under`…): `pnpm lint:tokens` falla con nombres viejos o colores crudos, y `pnpm contrast` valida los pares de contraste de `globals.css` (claro y oscuro). Si cambia un token que también se usa como hex (theme-color, manifest, íconos), regenerar `src/lib/theme-colors.ts` con `pnpm contrast -- --json`.
- **shadcn CLI:** `ui.shadcn.com` está bloqueado en las sesiones de Claude (403), así que `shadcn add` no funciona desde acá; `components.json` está listo para usarlo desde una red libre. Lo que agregue se re-estila a mano.

## Skills útiles para próximas sesiones

`domain-modeling` al tocar el modelo o el glosario; `tdd` para el motor WHS; `code-review` antes de mergear; `claude-api` si se toca `src/lib/vision/`; `dataviz` para cualquier gráfico nuevo. Conectores: Supabase Galf, Vercel, GitHub.

**Impeccable** (skill de diseño) no está instalado: en la sesión del rediseño `npx impeccable install` falló con 403 del proxy al bajar el bundle de skills. Instalarlo desde una máquina con red libre (`npx impeccable install -y --providers=claude --scope=project --no-hooks`, revisar y commitear lo que escriba en `.claude/`) y correr `/impeccable init` para que reconcilie con `PRODUCT.md`. El detector sí anda desde la sesión: `npx impeccable detect src/`.

**Conector de Vercel:** en la sesión del rediseño (2026-09-25) devolvió 403 para el team `bautistapeco97-gmailcoms-projects` (hay que re-autorizar el scope). Mientras tanto, los previews se miran desde el teléfono o desde GitHub (el check de Vercel en cada commit tiene el link).
