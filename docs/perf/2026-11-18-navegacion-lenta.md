# Navegación lenta: diagnóstico y opciones (2026-11-18)

Investigación sobre fuentes primarias: no se tocó código ni configuración. Cada afirmación lleva su fuente; lo que no se pudo confirmar está marcado como **sin verificar**, y lo que sale de nuestras cuentas como **estimación**.

**Abreviaturas:** `next-docs/` = `node_modules/next/dist/docs/01-app/` (Next 16.3.6 instalado); `next-src/` = `node_modules/next/dist/`; `auth-js/` = `node_modules/.pnpm/@supabase+auth-js@2.117.1/node_modules/@supabase/auth-js/dist/main/`. Desde esta sesión `vercel.com` y `supabase.com` están bloqueados por el proxy, así que las docs de Vercel y de Supabase se leyeron con los conectores de búsqueda de docs (Vercel MCP `search_vercel_documentation`, Supabase MCP `search_docs`), que devuelven extractos con la URL de origen. Los de Supabase traen la página entera; los de Vercel, casi solo fragmentos de código.

## Diagnóstico medido (sábado 2026-11-14)

Fuente: logs de borde de Supabase (1363 requests, 59 renders reconstruidos query por query).

- Las funciones de Vercel corren en `iad1` (Washington; el default, nunca se cambió; el deploy dice `regions: ["iad1"]`). Supabase está en São Paulo (sa-east-1). Los usuarios están en Argentina.
- El `src/proxy.ts` (llama a `supabase.auth.getUser()`) le llega a Supabase desde São Paulo (colo GRU); los renders, desde Virginia (colo IAD).
- El mismo `/auth/v1/user` cuesta p50 **19 ms** de red desde São Paulo y **374 ms** desde Virginia; el trabajo en la base es de 3–4 ms en los dos casos. 529 de 779 queries salidas de iad1 pagaron 300–500 ms solo de red.
- Toda pantalla hace 3 pasos en serie: `getUser` → buscar en `players` (los dos en `requirePlayer`, `src/lib/db/player.ts`) → los datos de la página. Espera mediana a Supabase por render: **1,25 s** (p90 2,1 s); del proxy a la última query: 1,47 s (p90 3,0 s). Trabajo real en la base: p50 ~0,2 s. Los dos primeros pasos solos: p50 631 ms, con 10 ms de base.
- Tokens ES256 (claves de firma asimétricas). `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.1.
- Hay `loading.tsx` en casi todas las rutas; no hay `staleTimes` ni Cache Components. Cada toque en una pestaña renderiza de cero.
- Cold starts: 8 de 49 renders (~16 %) tuvieron 1,1–2,4 s extra antes de la primera query.
- Grupo (`src/app/(app)/grupos/[id]/page.tsx`): ~4 queries por golfista (~24 en paralelo); el tiempo en la base sube a 100–330 ms con esa ráfaga (3–5 ms de a una). `listRecentRounds` (`src/lib/db/rounds-list.ts`) promedia 184 ms con 47 partidas / 60 tarjetas / 360 golpes.
- Prefetch: 461 invocaciones del proxy contra 59 renders (~8 pedidos al servidor por pantalla vista). Después de cargar Partidas corrieron 7 queries con forma de `getRound` sin `getUser`.
- Descartado: tamaño del JS, advisors de Supabase (solo nivel info), refresh de token (~1 s, pero raro).

---

## 1. Región de las funciones vs región de la base

**Qué dicen las fuentes**
- La región se fija a nivel proyecto: el default es `iad1`; **Hobby puede elegir cualquier región, una sola**; Pro y Enterprise, varias. `regions` en `vercel.json`/`vercel.ts` pisa la "Function Region" de Project Settings (https://vercel.com/docs/project-configuration/vercel-ts, vía MCP). Ejemplo de la doc, que acá sería con `gru1` (https://vercel.com/docs/functions/configuring-functions/region, vía MCP):
  ```json
  { "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["sfo1"] }
  ```
  También se puede por CLI (`vercel --regions sfo1`, https://vercel.com/docs/cli/deploy, vía MCP).
- La doc pone las regiones por función como algo "útil cuando distintas funciones acceden a distintas fuentes de datos" (vercel-ts, mismo extracto). Supabase recomienda elegir la región de la base "más cercana a tus usuarios" (https://supabase.com/docs/guides/platform/regions). No encontré ninguna página de Vercel ni de Supabase que diga en prosa "poné el cómputo al lado de la base": **sin verificar**. El argumento sale de nuestros números.
- `preferredRegion` (segment config de Next) **está deprecado**: "Remove the `preferredRegion` export" (`next-docs/03-api-reference/03-file-conventions/02-route-segment-config/preferredRegion.md`). No es el camino.
- Proxy: en Next 16 corre en Node por defecto y no acepta `runtime` (`next-docs/03-api-reference/03-file-conventions/proxy.md`, «Runtime»). **Sin verificar** en la doc de Vercel dónde despliega una Routing Middleware Node: la página de prosa no se pudo leer. Lo medido es que ya corre en GRU.

**Cómo aplica a Galf.** Los renders (páginas, `generateMetadata`, server actions) corren en iad1 y cada viaje a Supabase cruza el continente. El proxy ya está en GRU, así que no cambia. Además de la base, el servidor llama a Storage (URLs firmadas de fotos, en São Paulo) y a la API de Anthropic (`src/lib/vision/client.ts`).

**Impacto esperado (estimación).** Por cada viaje en serie, 374 → ~19 ms p50 (−355 ms). Con 3 viajes mínimos por render: **~−1 s en la mediana**, de 1,25 s de espera a Supabase a ~0,25–0,35 s (piso: 0,2 s de base). Los dos primeros pasos pasarían de 631 a ~50 ms. Las 529 queries con 300–500 ms de red caen a decenas de ms. Es el cambio de mayor impacto y no toca código.

**Riesgos.** (a) La llamada de visión a Anthropic sale desde Brasil. **Sin verificar** dónde termina esa API; como una lectura de tarjeta tarda segundos, un viaje intercontinental más casi no se nota (estimación). (b) El cambio entra con un deploy nuevo: inferencia a partir de que `regions` es un atributo de cada deployment (`get_deployment` lo devuelve por deploy), **sin verificar** en la doc. (c) `gru1` como región de funciones: la doc de Vercel dice que Hobby elige "cualquier región"; `gru1` figura en las listas de regiones de la API de Vercel (p. ej. el enum de https://vercel.com/docs/rest-api/sandboxes/get-or-create-a-drive), pero no pude leer la tabla de regiones de cómputo.

## 2. Doble validación de sesión (`getUser` en proxy y en render)

**Qué dicen las fuentes**
- Supabase: "Use `getClaims` to protect pages and user data… Locally via the WebCrypto API and a cached JWKS endpoint when the project uses asymmetric signing keys… The returned claims always come from decoding the JWT, not from a user lookup." `getUser` "makes a network call to the project's Auth instance". `getSession` "isn't re-validated" (https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs, «Summary of the methods»).
- La guía SSR de Next.js usa **`getClaims()` en el proxy** para refrescar el token, avisa "*Never* trust `getSession()` inside server code such as Proxy" y "It's safe to trust `getClaims()` because it validates the JWT signature… every time". También advierte: "If you remove getClaims()… your users may be randomly logged out" (https://supabase.com/docs/guides/auth/server-side/creating-a-client, «Hook up proxy» y `lib/supabase/proxy.ts`).
- Caché de claves: el endpoint JWKS "is cached by Supabase's edge servers for 10 minutes… client libraries may cache the keys in memory for an additional 10 minutes" (https://supabase.com/docs/guides/auth/signing-keys, «Public key discovery and caching»).
- **Verificado en el código instalado:** `getClaims(jwt?, { jwks?, allowExpired? })` existe en auth-js 2.117.1 (`auth-js/GoTrueClient.d.ts`, línea ~2563). La implementación (`auth-js/GoTrueClient.js`, `getClaims` y `fetchJwk`, líneas ~5418–5560) valida `exp`, busca la clave por `kid` y verifica con `crypto.subtle.verify`. Si el algoritmo es HS* o no hay WebCrypto, cae a `getUser()`. El JWKS se guarda en `GLOBAL_JWKS`, a nivel de módulo y por `storageKey` ("if they share the same storage key they will use the same JWKS cache", línea ~45), con `JWKS_TTL = 10 * 60 * 1000` (`auth-js/lib/constants.js`). Como sobrevive entre requests de la misma instancia, solo una instancia fría va a la red.
- Lo que `getClaims` **no** ve: un logout o una sesión revocada antes de que venza el JWT. Supabase: "Most applications rarely need such strong guarantees. Consider adjusting the JWT expiry time… When a user signs out, the sessions affected… are removed… You can check that the `session_id` claim… corresponds to a row in `auth.sessions`" (https://supabase.com/docs/guides/auth/sessions, «How to ensure an access token (JWT) cannot be used after a user signs out»).
- Next 16: el proxy corre "on every route, including prefetched routes", así que solo conviene leer la sesión de la cookie ("optimistic checks") y evitar ir a la base. La verificación segura va en un Data Access Layer con `cache()` (`next-docs/02-guides/authentication.md`, «Optimistic checks with Proxy» y «Creating a Data Access Layer»). Con Cache Components, la lectura de sesión va en `'use cache: private'` (`next-docs/02-guides/authentication-with-cache-components.md`, «Step 1»).

**Cómo aplica a Galf.** `src/proxy.ts` llama a `getUser()` (con el comentario "valida el token contra Supabase") en cada request, incluidos los ~8 prefetch por pantalla. `requirePlayer` (`src/lib/db/player.ts`) vuelve a llamar a `getUser()` desde iad1 (374 ms p50) y recién después busca en `players`. Con `getClaims` en los dos lugares, la identidad sale de verificar una firma ES256 en memoria.

Hay un segundo paso que se puede sacar del camino crítico: la búsqueda en `players`.
- **Paralelizarla** con la consulta de la página cuando esa consulta no necesita `me.id`. Pasa con `getRound(id)`, `getGroup(id)`, `getPlayerStats(id)`, y también con `listRecentRounds`, que usa `meId` solo para ordenar en JS (`src/lib/db/rounds-list.ts`). Es el patrón «Parallel data fetching» / «Preloading data» de `next-docs/01-getting-started/06-fetching-data.md`.
- **Llevar `player_id` al JWT** con el Custom Access Token Hook. `getClaims` devuelve claims "customized per project using the Custom Access Token Hook" (`auth-js/GoTrueClient.js`, JSDoc de `getClaims`; https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook). El costo es que "a JWT is not always fresh" (https://supabase.com/docs/guides/database/postgres/row-level-security, `auth.jwt()`) y que hay que mantener el hook.

**Impacto esperado (estimación).** Mientras sigamos en iad1: −~370 ms p50 por render, porque sale 1 de los 3 viajes. En gru1: −~20 ms por render. Además, el proxy deja de llamar a Auth en cada prefetch (461 llamadas el sábado). Si se paraleliza `players`, el render queda en **un solo viaje** antes de pintar.

**Riesgos.** (a) Seguridad: con `getClaims` un token robado o una sesión cerrada sigue valiendo hasta que vence el JWT. Inferencia (no lo dice Supabase con estas palabras): las queries de PostgREST ya aceptan hoy un JWT válido por firma y vencimiento, así que el `getUser` del render agrega poca protección sobre los datos. Si alguna acción la necesita (firmar, borrar partida), se puede chequear `session_id` en `auth.sessions` solo ahí, como sugiere la doc de sesiones. (b) La primera vez en una instancia fría hay una ida a `/.well-known/jwks.json`. Se puede evitar pasando `options.jwks`, a costa de redeployar al rotar claves (`auth-js/GoTrueClient.d.ts`). (c) Aparte: el ejemplo oficial reenvía el segundo argumento de `setAll(cookiesToSet, headers)` y `src/proxy.ts` lo ignora. Son headers `Cache-Control: private, no-cache, no-store…` (`node_modules/.pnpm/@supabase+ssr@0.12.7_…/dist/main/cookies.js`, línea ~506).

## 3. Caché de navegación en Next 16

**Qué dicen las fuentes**
- Sin Cache Components, una ruta dinámica con `loading.js` se prefetchea "Layout to first loading boundary", con TTL de Client Cache "Off by default (`staleTimes.dynamic`)"; al tocar hay "Server roundtrip" (`next-docs/02-guides/prefetching.md`, tablas de «Prefetching static vs. dynamic routes» y «Automatic prefetch»). El Client Cache no guarda páginas por defecto; sí las reusa en atrás/adelante y se borra al recargar (`next-docs/04-glossary.md`, «Client Cache»).
- **`experimental.staleTimes`** (frontmatter `version: experimental`). `dynamic` tiene default 0 s; `static`, 5 min, y además define cuánto se reusan los `loading` (`next-docs/03-api-reference/05-config/01-next-config-js/staleTimes.md`):
  ```js
  experimental: { staleTimes: { dynamic: 30, static: 180 } }
  ```
- **Invalidación.** Llamar desde una Server Action a `revalidatePath`, `revalidateTag`, `updateTag` o `refresh` hace que "the entire client cache is immediately cleared, bypassing the stale time" (`next-docs/03-api-reference/04-functions/cacheLife.md`, «Client cache behavior»). `revalidatePath` "also causes all previously visited pages to refresh when navigated to again" (`.../revalidatePath.md`). `router.refresh()` limpia el Client Cache "for the current route" (`.../use-router.md`). `cookies.set`/`delete` también invalidan (`next-docs/04-glossary.md`).
- **Cache Components** (`cacheComponents: true`, sin marca experimental en 16.3.6). Con **`'use cache: private'`** se pueden cachear funciones que leen `cookies()`. El resultado queda solo en el navegador y aporta su `stale` al Client Cache (`next-docs/03-api-reference/01-directives/use-cache-private.md`). `stale` ≥ 30 s para que entre en el prefetch y ≥ 5 min para que entre en el App Shell (misma página, «Good to know»; `next-docs/04-glossary.md`, «App Shell»).
- **`partialPrefetching: true`** (16.3.0, requiere Cache Components). Hay un App Shell por ruta, compartido por todos los links, y "Routes that read `cookies()`… produce an App Shell that includes session data… cached per session on the client" (`.../partialPrefetching.md`). Lo que depende de `params` necesita `prefetch={true}`, que cuesta "a server invocation per prefetchable link" (`next-docs/02-guides/optimizing-prefetching.md`, «Trade-offs»). Con ese setup el router mantiene rutas ocultas con `<Activity>` y preserva estado (`.../cacheComponents.md`, «Navigation with Activity»).
- `use cache` en el servidor, en serverless, "will not persist across instances" (`next-docs/02-guides/instant-navigation.md`, Step 2).

**Opciones para Galf**

| Opción | Qué logra | Costo | Estado en 16.3.6 |
|---|---|---|---|
| `staleTimes.dynamic` = 30–60 s | Volver a una pestaña dentro de la ventana no pide nada al servidor | Datos de otros golfistas viejos hasta N s. `saveHoleScore` (autosave, `src/app/(app)/partidas/actions.ts`) no revalida: la tarjeta sin firmar del Inicio puede mostrar un conteo de hoyos viejo hasta N s. Las otras ~42 llamadas a `revalidatePath`/`router.refresh` vacían el caché, así que nuestras propias escrituras se ven al toque | Experimental |
| Cache Components + `'use cache: private'` + `partialPrefetching` | App Shell por sesión ya prefetcheado: navegación instantánea; un prefetch por ruta en vez de uno por link | Migración grande: validación ruta por ruta, `<Suspense>`, `instant = false` como escape. Los `dynamicParams = false` de `src/app/icons/[name]/route.tsx` y `src/app/splash/[spec]/route.tsx` rompen el build (`next-docs/02-guides/migrating-to-cache-components.md`, «`dynamicParams` is not supported»). Activity preserva estado de hojas y formularios (misma guía, «UI state preservation») | Estable, según las docs locales; `partialPrefetching` es nuevo (16.3.0) |
| `use cache` servidor por `playerId` | Comparte resultados entre requests | No sobrevive entre instancias; con poco tráfico rinde poco | Requiere Cache Components |

**Impacto esperado (estimación).** `staleTimes` vuelve instantáneas las re-visitas dentro de la ventana, pero no la primera visita ni las pantallas nuevas (partida, golfista). Cache Components ataca todo, a costa de semanas de trabajo. Las dos opciones ganan mucho menos si antes no se arreglan los puntos 1 y 2, porque igual hay que ir al servidor la primera vez.

**Riesgos.** `staleTimes` es experimental y puede cambiar. Cerrar sesión no es problema: `/auth/signout` es un POST de formulario nativo (`src/app/(app)/perfil/page.tsx`) que recarga la página, y eso vacía el caché.

## 4. Cold starts en Vercel Hobby

**Qué dicen las fuentes**
- "As of April 23, 2025, Fluid compute is enabled by default for new projects". Se puede forzar con `"fluid": true` en `vercel.json`/`vercel.ts` (https://vercel.com/docs/project-configuration/vercel-ts y https://vercel.com/docs/fluid-compute, vía MCP).
- Para diagnosticar, Vercel sugiere comparar el primer request contra los siguientes: "If the first request is significantly slower… cold starts are the issue" (https://vercel.com/docs/functions/debug-slow-functions, vía MCP).
- **Sin verificar:** si Hobby tiene bytecode caching o pre-warming, y qué documenta Vercel sobre la frecuencia de cold starts en proyectos con poco tráfico. La página de Fluid compute no se pudo leer en prosa: el índice solo devolvió el snippet de configuración.

**Cómo aplica a Galf.** El proyecto se creó el 2026-09-24 (`get_project.createdAt`), después del cambio de default, así que *debería* tener Fluid activo. La API no devolvió el flag: **confirmarlo en el dashboard**.

**Impacto esperado (estimación).** El 16 % de renders con 1,1–2,4 s extra no lo arregla ninguna medida verificada acá. Mover la región no evita el arranque en frío, pero abarata todo lo que viene después. `staleTimes` y Cache Components esconden el cold start en las re-visitas porque no van al servidor. Bajar los ~8 pedidos por pantalla (puntos 2 y 6) reduce la concurrencia; si eso baja las instancias nuevas es una hipótesis **no medida**.

## 5. Fan-out de queries y costo de RLS

**Qué dicen las fuentes** (https://supabase.com/docs/guides/database/postgres/row-level-security, «RLS performance recommendations», y https://supabase.com/docs/guides/database/postgres/row-level-security-performance)
- Indexar las columnas que usan las políticas.
- Envolver funciones en `select` para que corran como `initPlan`, una vez por sentencia, con la advertencia "only… if the results… do not change based on the row data".
- Usar `security definer` en esquemas no expuestos.
- **"Minimize joins"**: armar el conjunto una sola vez (`team_id in (select team_id from team_user where user_id = (select auth.uid()))`, o `team_id=any(array(select user_teams()))`) en vez de evaluar la membresía por fila.
- Filtrar también en la query del cliente.
- Para medir: `explain analyze` como `authenticated` con `request.jwt.claims`, mirando "Rows Removed by Filter" («Diagnose whether RLS is the bottleneck»).
- Funciones: "For data-intensive operations, use Database Functions"; mejor `security invoker`, que es el default y respeta RLS (https://supabase.com/docs/guides/database/functions, «Suggestions»).
- Embedding: PostgREST resuelve relaciones por FK en una sola request (https://supabase.com/docs/guides/database/joins-and-nesting).

**Cómo aplica a Galf** (lectura de `supabase/migrations/0001_init.sql` y `0004_private_rls_helpers.sql`; no se corrió nada contra la base)
- Lo que ya está bien: `current_player_id()` va envuelto (`created_by = (select current_player_id())`), los helpers viven en `private` y son `security definer`, y existen los índices `scorecards_round_idx`, `group_members_player_active_idx` y `players_user_id_active_uidx`.
- El sospechoso es un helper que depende de la fila, evaluado por fila. Aparece en `rounds_select … or can_view_round(id)`, en `scorecards_select … can_view_round(round_id)`, en `signatures_select … exists (select 1 from scorecards s where … can_view_round(s.round_id))` y en `hole_scores_select … exists (… can_view_round(s.round_id))`. A su vez, `can_view_round(r)` llama a `is_round_participant(r)` (dos `exists`) y a `shares_group_with(s.player_id)` por cada tarjeta, que hace join de `group_members` × 2 + `groups`. `listRecentRounds` embebe `hole_scores(count)`, así que la política corre para cada golpe (360 filas). Esa es la **hipótesis** para los 184 ms con tan pocos datos; hay que confirmarla con `explain analyze` como golfista (el snippet de impersonación está en `docs/handoff.md`). Envolver `can_view_round(id)` en `select` no sirve porque depende de la fila. Lo que aplica es "Minimize joins": algo como `round_id in (select private.visible_round_ids())`, calculado una vez por sentencia. También se puede restringir el `hole_scores(count)` a la tarjeta propia, que es lo único que usa la tarjeta sin firmar del Inicio.
- **Grupo.** `getPlayerStats` (`src/lib/db/stats.ts`) hace 2 queries más 2 de `getPlayerHandicap` (`src/lib/db/handicap.ts`), y dos de esas 4 leen las mismas tarjetas firmadas del mismo golfista. Con 6 golfistas son ~24 requests en paralelo. Alternativas: una query con `.in('player_id', ids)` y embedding (2 requests en total), o una RPC `security invoker` que devuelva tarjetas firmadas + hándicap declarado de todos los miembros. En las dos, el cálculo WHS sigue en `src/lib/handicap/`.

**Impacto esperado (estimación).** Grupo pasa de ~24 a 1–2 requests y el tiempo en la base vuelve a la escala de 3–5 ms por query, en vez de 100–330 ms bajo ráfaga. Si se confirma la hipótesis de RLS, `listRecentRounds` baja de 184 ms a pocos ms, y eso mejora Inicio, Partidas y Grupo.

**Riesgos.** Las políticas nuevas se prueban como usuario y no como service role (lección de la 0002, `docs/handoff.md`). Una RPC es una pieza más que mantener en migraciones y tipos.

## 6. Prefetch y `generateMetadata`

**Qué dicen las fuentes**
- Los links se prefetchean al entrar en el viewport, con una cola: primero los visibles, después los que muestran intención ("hover or touch"), y los que salen de pantalla se descartan (`next-docs/02-guides/prefetching.md`, «Prefetch scheduling»).
- Valores de `prefetch` (`next-docs/03-api-reference/02-components/link.md`, «`prefetch`»): `"auto"`/`null` (dinámica: hasta el `loading.js` más cercano), `true` (ruta completa) y `false` (nunca, ni en viewport ni en hover). Con `false`, "dynamic routes will wait for the server to render before navigating". Para listas largas la doc propone `prefetch={false}` o prefetch por intención, con `prefetch={active ? null : false}` y `onMouseEnter` (`prefetching.md`, «Preventing too many prefetches»).
- El proxy corre también en los prefetch. Para salteárselos, la doc trae un matcher con `missing: [{ type: 'header', key: 'next-router-prefetch' }, …]` (`.../proxy.md`, «Negative matching»). Verifiqué en el cliente que los prefetch mandan `next-router-prefetch` (`next-src/client/components/segment-cache/cache.js`, líneas ~1195, ~1511, ~1961–1971).
- **¿Corre `generateMetadata` en el prefetch de una ruta con `loading.js`?** Las docs no lo dicen. **El código dice que sí.** Sin PPR, el servidor corta el árbol en el `loading` (`next-src/server/app-render/create-component-tree.js`, línea ~350, `isPrefetch && (Loading || …) && !isRoutePPREnabled`), pero igual devuelve el `rscHead` con `<Metadata>` (`next-src/server/app-render/app-render.js`, `generateDynamicRSCPayload`, líneas ~350–369; `walk-tree-with-flight-router-state.js`, rama `renderComponentsOnThisLevel`). Del lado del cliente, el head se pide siempre en el prefetch: "When prefetching the head, there's no difference between Full and LoadingBoundary" (`next-src/client/components/segment-cache/scheduler.js`, `pingRuntimeHead`, línea ~766). Coincide con las 7 queries tipo `getRound` sin `getUser` medidas después de cargar Partidas.

**Cómo aplica a Galf.** Cada link visible a una ruta con `generateMetadata` corre queries en el prefetch, después de pasar por el proxy con `getUser`:
- `partidas/[id]` → `getRound`. Filas de Partidas (hasta 100), Inicio (5) y Grupo (30).
- `golfistas/[id]` → `getPlayerStats`, que son **4 queries por link**. Ranking del Grupo.
- `grupos/[id]` → `getGroup`.
- `canchas/[id]` y `canchas/[id]/editar` → `getCourse`. Lista de Canchas.

La app es una PWA de teléfono, casi nunca de desktop (`PRODUCT.md`), así que el prefetch por `onMouseEnter` de la doc no aplica tal cual. Un equivalente táctil no está documentado.

**Opciones y costos**
1. **`generateMetadata` sin base de datos** (título fijo o con datos que no requieran query). El prefetch pasa a costar proxy + layout + `loading`. Costo: títulos genéricos ("Partida").
2. **`prefetch={false}` en `RoundRow` (`src/components/ui/round-row.tsx`) y en los links del ranking.** Se pierde el esqueleto instantáneo: el toque espera al servidor.
3. **Saltear el proxy en prefetch** (matcher `missing`). Riesgo: si el prefetch toca Supabase (hoy sí, por `generateMetadata`) y el token venció, el cliente refresca desde un Server Component que no puede escribir cookies. Ese es el caso del "randomly logged out" de Supabase. Solo es seguro después de la opción 1. Mejor dejar el proxy y que sea barato con `getClaims` (punto 2).
4. **Partial Prefetching:** un App Shell por ruta para todos los links. Requiere Cache Components (punto 3), y un `params` leído en `generateMetadata` aparece como insight "URL data in `generateMetadata()`" (`next-docs/02-guides/adopting-partial-prefetching.md`, nota en «Move URL data behind Suspense»).

**Impacto esperado (estimación).** Las opciones 1 y 2 de este punto eliminan casi todas las queries de prefetch: el Grupo con 6 golfistas visibles ahorra ~24 queries por visita. Junto con `getClaims`, los ~8 pedidos por pantalla dejan de tocar Auth y la base. No acelera el render que el usuario espera, pero saca carga y concurrencia de la misma ventana.

---

## Por dónde empezar

Ordenado por impacto esperado contra esfuerzo:

1. **Funciones a `gru1`** (Project Settings → Function Region, o `regions` en `vercel.json`; deploy nuevo). Sin código. ~−1 s de mediana por render (estimación). Después, repetir la reconstrucción con los logs del sábado.
2. **`getClaims` en `src/proxy.ts` y en `requirePlayer`.** Cambio chico; antes hay que decidir el trade-off de sesiones revocadas. Saca un viaje por render (~−370 ms en iad1, ~−20 ms en gru1) y Auth de todos los prefetch.
3. **Paralelizar `players` con la consulta de la página** (`partidas/[id]`, `grupos/[id]`, `golfistas/[id]`, `partidas`). Cambio chico: el render queda en un viaje antes de pintar.
4. **`generateMetadata` sin queries** en las 5 rutas listadas. Cambio chico: corta las queries de prefetch.
5. **Confirmar que Fluid compute está activo** en el dashboard. Trivial.
6. **`explain analyze` de `listRecentRounds` como golfista** y, si se confirma, una política "por conjunto" en vez de `can_view_round` por fila (migración, esfuerzo medio, probar como usuario).
7. **Grupo en 1–2 requests** (embedding con `.in()` o RPC `security invoker`). Esfuerzo medio.
8. **`experimental.staleTimes.dynamic` 30 s** para re-visitas instantáneas. Una línea, pero experimental y con datos viejos hasta 30 s. Probarlo después de 1–4.
9. **Cache Components + Partial Prefetching.** Lo más ambicioso; solo si después de lo anterior sigue lento.

## Lo que no se pudo verificar

- Páginas de prosa de Vercel (regiones, Fluid compute, Routing Middleware): `vercel.com` está bloqueado en esta sesión y el índice MCP solo devolvió snippets. Quedan sin verificar: la ruta exacta del dashboard, si el cambio de región exige deploy (inferido de que `regions` es por deployment), dónde corre la Routing Middleware Node (medimos GRU), bytecode caching, pre-warming y frecuencia de cold starts en Hobby, y si Fluid está activo en `golfeto` (la API no devolvió el flag).
- La lista oficial de regiones de cómputo con `gru1`. Vercel documenta "cualquier región" para Hobby y `gru1` aparece en enums de su API, pero no leí la tabla.
- Dónde está alojada la API de Anthropic y su latencia desde `gru1`.
- La causa de los 184 ms de `listRecentRounds`: es una hipótesis hasta correr `explain analyze`.
- Una doc oficial que diga explícitamente "co-ubicar cómputo y base": no la encontré. El argumento es nuestra medición (19 vs 374 ms).

## Fuentes externas usadas

- https://vercel.com/docs/project-configuration/vercel-ts · https://vercel.com/docs/functions/configuring-functions/region · https://vercel.com/docs/cli/deploy · https://vercel.com/docs/fluid-compute · https://vercel.com/docs/functions/debug-slow-functions · https://vercel.com/docs/rest-api/sandboxes/get-or-create-a-drive (todas vía Vercel MCP)
- https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs · https://supabase.com/docs/guides/auth/server-side/creating-a-client · https://supabase.com/docs/guides/auth/signing-keys · https://supabase.com/docs/guides/auth/sessions · https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook · https://supabase.com/docs/guides/database/postgres/row-level-security · https://supabase.com/docs/guides/database/postgres/row-level-security-performance · https://supabase.com/docs/guides/database/functions · https://supabase.com/docs/guides/database/joins-and-nesting · https://supabase.com/docs/guides/platform/regions (todas vía Supabase MCP `search_docs`)
