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
| Rama del rediseño (sesión 3) | `claude/sleepy-wozniak-v86mqg` (fusionada por fast-forward en producción el 2026-09-25; versión anterior: `1924828`, deploy `dpl_5JZsaVjb4EYJrHjmbnoWerZbax3b`) |
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

- **Miraflores** tiene un layout inventado (par 71: 4 par-3, 3 par-5, 11 par-4, hándicap de hoyo en orden fijo) con `valid_from = 2020-01-01` y nota "Layout provisional". CR 70.3 / Slope 125 en blancas, de snippets sin verificar. Reemplazar cargando la tarjeta real como **versión nueva** (Editar cancha), nunca editando la vieja: sus tarjetas históricas apuntan a la versión provisional y solo usan CR/Slope y par total.
- **CUBA Villa de Mayo** (antes "Los Cedros", nombre equivocado): cargada de la tarjeta del club el 2026-09-25 (`supabase/data-fixes/2026-09-25_cuba_villa_de_mayo.sql`). 9 hoyos jugados dos veces, **par 68** (34 + 34), hándicap de hoyo impar en la ida y par en la vuelta, tees Azules/Blancas/Rojas con distancias convertidas de yardas. **CR/Slope de blancas 68 / 113 es una aproximación declarada** (CR = par, Slope estándar); azules y rojas sin rating. El oficial lo midió la AAG en junio de 2017 (nota del club "Recalificación de las canchas de golf del club" en cuba.org.ar; el proxy de las sesiones la bloquea). Al tenerlo: actualizar el tee y volver a firmar las tarjetas de CUBA (el script regenera el SQL con otro CR/Slope). Como el layout provisional nunca existió, esa vez se dio de baja y las partidas se movieron a la versión real (excepción consciente al ADR-0001).
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
pnpm a11y           # axe (WCAG 2.2 A/AA, @axe-core/playwright) sobre /login y /dev/playground, claro y oscuro, con la confirmación y la hoja de acciones abiertas; falla con violaciones serias o críticas
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
- UI (rediseño "tarjeta y pizarra", ver `DESIGN.md`): primitivas en `src/components/ui/` con forma de shadcn sobre `@base-ui/react` (polimorfismo con `render`, no `asChild`) + propias; `cn()` en `src/lib/utils.ts` (tailwind-merge extendido con `text-numeral*`, `tap`, `thumb`). Íconos `lucide-react` 1.x (verificar nombres en su `.d.ts`: la 1.x quitó alias, p. ej. `Trash2` → `Trash`). Animaciones en CSS (`globals.css`, con su bloque de `prefers-reduced-motion`); `motion` se quitó en la Fase 6. Tema con `next-themes` (clase `.dark` en `<html>`, clave `galf:theme`). Toasts: `import { toast } from "@/lib/toast"` (nunca de `"sonner"`: el wrapper baja sonner y monta el Toaster en un momento libre o con el primer toast). Numerales que ruedan: `AnimatedBoardNumber` / `RollingNumber` (`@number-flow/react`, bajado aparte; `from` para rodar desde un valor anterior). Versiones pineadas exactas en `package.json`: no actualizar a mitad del rediseño.
- Clases de color solo sobre roles (`bg-card`, `text-muted-foreground`, `text-score-under`…): `pnpm lint:tokens` falla con nombres viejos o colores crudos, y `pnpm contrast` valida los pares de contraste de `globals.css` (claro y oscuro). Si cambia un token que también se usa como hex (theme-color, manifest, íconos), regenerar `src/lib/theme-colors.ts` con `pnpm contrast -- --json`.
- **Primer JS liviano** (presupuesto en `docs/perf/bundle-baseline.md`): lo que se abre por una acción (hojas, visor, menú ⋯) va con `next/dynamic` y se monta la primera vez que se abre; lo pesado que se usa tarde (cliente de Supabase en el login, NumberFlow, sonner) se importa con `import()` en el momento. Medir con `pnpm build && pnpm bundle` antes de sumar una dependencia de cliente.
- **shadcn CLI:** `ui.shadcn.com` está bloqueado en las sesiones de Claude (403), así que `shadcn add` no funciona desde acá; `components.json` está listo para usarlo desde una red libre. Lo que agregue se re-estila a mano.

## Skills útiles para próximas sesiones

`domain-modeling` al tocar el modelo o el glosario; `tdd` para el motor WHS; `code-review` antes de mergear; `claude-api` si se toca `src/lib/vision/`; `dataviz` para cualquier gráfico nuevo. Conectores: Supabase Galf, Vercel, GitHub.

**UI/UX Pro Max** (skill de diseño, MIT) está en `.claude/skills/ui-ux-pro-max/`: se instaló con `npx uipro-cli@2.2.3 init --ai claude --offline` (usa los datos que trae el paquete npm; no baja nada de GitHub). Sus scripts solo leen CSV locales: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain ux|web|…` o `--stack html-tailwind|nextjs|…`. Usarla para el checklist de UX y accesibilidad; **no** usar `--design-system --persist` (generaría un `design-system/MASTER.md` genérico que choca con `DESIGN.md`, que es la fuente de verdad).

**Impeccable** (skill de diseño) no está instalado: en la sesión del rediseño `npx impeccable install` falló con 403 del proxy al bajar el bundle de skills. Instalarlo desde una máquina con red libre (`npx impeccable install -y --providers=claude --scope=project --no-hooks`, revisar y commitear lo que escriba en `.claude/`) y correr `/impeccable init` para que reconcilie con `PRODUCT.md`. El detector sí anda desde la sesión: `npx impeccable detect src/` (estático) y, con `pnpm dev` levantado, `npx impeccable detect --viewport 390x844 http://localhost:3000/dev/playground` (como root necesita un Chrome con `--no-sandbox`: `PUPPETEER_EXECUTABLE_PATH` apuntando a un script que agregue el flag).

**Conector de Vercel:** con `teamId`/`slug` del team devuelve 403 (hay que re-autorizar el scope), pero **sin pasar team** funciona: `list_deployments` con `branch` da los deploys y `get_deployment` el alias fijo de la rama. Preview de la rama del rediseño: https://golfeto-git-claude-sle-0e6b3c-bautistapeco97-gmailcoms-projects.vercel.app (sigue cada push).
