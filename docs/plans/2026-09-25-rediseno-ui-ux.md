# Rediseño UI/UX de Galf — plan de implementación ("Tarjeta y pizarra")

> **Cómo ejecutar este plan.** Se ejecuta por sesiones sobre la rama `claude/sleepy-wozniak-v86mqg` (producción es `claude/vigilant-bardeen-6iwzid` y no se toca hasta el merge). Reglas: (1) la base de datos es intocable: sin migraciones, sin `apply_migration`/`execute_sql`, sin regenerar `database.types.ts`; lo que la necesite se anota como ToDo en la sección "Excluido" de este plan y en `docs/roadmap.md`, y se sigue con el resto; (2) si el dueño no está para las Puertas 1 y 2, se toma la opción recomendada (variante A, tipografía A) y queda anotada como provisional en `DESIGN.md` y en el roadmap; (3) al cerrar cada fase o sesión: marcar el checklist de la Fase 4 en `docs/roadmap.md`, actualizar `docs/handoff.md` si cambió algo operativo, commitear y pushear la rama; (4) nunca pushear a `claude/vigilant-bardeen-6iwzid`; PR solo si el dueño lo pide.

## Contexto

Galf es el anotador de golf del grupo (Next.js 16.3.6 App Router, React 19.2, Tailwind v4 CSS-first, Supabase, Vercel, pnpm). El MVP funciona (Fase 1 del roadmap), pero la interfaz es la que sale por defecto de cualquier generador: cards redondeadas uniformes, encabezados en mayúsculas con tracking, metadatos encadenados con "·", fuente Geist, un ícono "G" generado, sin splash, sin skeletons, sin toasts, `confirm()` nativos, errores que se tragan, botones de 32 px para anotar golpes bajo el sol. El dueño pide un rediseño completo de UI y UX (feedback, animación de arranque, colores, botones, layouts) con referencias de golf que no parezcan "hechas por IA", sin tocar la base de datos.

Resultado buscado: una app que se sienta como un objeto de golf (la tarjeta de papel y la pizarra de resultados), cómoda con una mano en la cancha, con feedback claro en cada acción.

## Confirmaciones hechas en esta sesión

| Qué | Resultado |
|---|---|
| Rama productiva en Vercel | Confirmada por el conector de Vercel: los últimos 3 deploys con `target: production` del proyecto `golfeto` salen de `githubCommitRef: claude/vigilant-bardeen-6iwzid`; GitHub la tiene como rama default. |
| Rama de trabajo | `claude/sleepy-wozniak-v86mqg`, ya existe en `origin`, sin commits propios y **1 commit detrás** de producción (`a922ce1` "Fix RLS helpers permission"). Se sincroniza con `merge --ff-only` en la Fase 0. Nunca se pushea a `claude/vigilant-bardeen-6iwzid`; PR solo si lo pedís. |
| Base de datos | **Cero cambios.** Sin migraciones, sin `apply_migration`/`execute_sql`, sin regenerar `database.types.ts`. Lo que tentaría tocarla está listado al final como excluido. |
| Entorno de esta sesión | No hay `node_modules` ni `.env.local`. Con variables dummy renderizan `/login` y el playground; el resto se verifica en el preview de Vercel de la rama y en el teléfono del dueño. Chromium está preinstalado para Playwright. |
| Skills | Ninguno instalado todavía (modo plan). Leídos: `frontend-design` de Anthropic, Impeccable, ui-ux-pro-max. Disponible en el catálogo de tu organización: plugin "Design" de Anthropic (crítica, design system, ux-copy, accesibilidad). |

## Decisiones del dueño (ya tomadas)

1. **Estética: "tarjeta y pizarra".** La gramática común de toda tarjeta de papel (grilla Hoyo | Par | Hcp | Golpes con Ida / Vuelta / Total; círculo = birdie, doble círculo = eagle, cuadrado = bogey, doble cuadrado = doble bogey o peor; puntitos de golpes recibidos; colores de tee) más la pizarra manual de resultados (numerales grandes condensados, rojo bajo par, azul sobre par) en exactamente dos lugares: el Hándicap Index del Inicio y el ranking del Grupo. Papel teñido en claro, verde-negro en oscuro, un verde de acento. Sin crema, sin serif.
2. **Kit completo:** shadcn/ui sobre Base UI (default desde julio 2026) + `lucide-react` + `motion` + `sonner` + `@number-flow/react` + `next-themes`.
3. **Skills:** Impeccable instalado en el repo + `DESIGN.md` propio + ADR-0004.
4. **Anotación:** modo "Hoyo a hoyo" por defecto mientras se juega + "Tarjeta completa" editable.

## Cómo se toman las decisiones de diseño (proceso, con skills corriendo)

En esta sesión **leí** los skills y apliqué sus reglas al brief, pero no los ejecuté: en modo plan no se instala nada y un skill de diseño actúa sobre código real. El brief es una **hipótesis fundamentada**; las decisiones se cierran así:

| Paso | Quién decide | Con qué | Cuándo |
|---|---|---|---|
| 1. Reglas | skills leídos | anti-patrones y principios de `frontend-design` e Impeccable → brief | hecho |
| 2. Contexto del producto | Impeccable | `npx impeccable install` + `/impeccable init` → `PRODUCT.md` | Fase 0 |
| 3. Forma antes de código | Impeccable + skill `prototype` del repo | `/impeccable shape` de Partida e Inicio; **3 variantes** en el playground (`?variant=A\|B\|C`): A = brief tal cual; B = más pizarra (fondo oscuro también en claro); C = más papel (todo grilla, sin pizarra) | fin de Fase 1 |
| **Puerta 1 (vos)** | dueño | capturas claro/oscuro o el preview en el teléfono → elegís o mezclás → se fija `DESIGN.md` y la tipografía | fin de Fase 1 |
| 4. Construcción | Impeccable + `dataviz` | `/impeccable craft` por pantalla clave; `dataviz` para el gráfico | Fases 4–5 |
| 5. Control por fase | Impeccable + plugin Design (si lo habilitás) | `/impeccable audit`, `/impeccable critique`, `/impeccable polish`; `design:design-critique`, `design:accessibility-review` | cierre de cada fase |
| **Puerta 2 (vos)** | dueño | partida real de prueba con la PWA instalada; lista de ajustes | fin de Fase 5 |
| 6. Cierre | skill `code-review` del repo | estándares y spec antes de proponer el merge | Fase 6 |

Si preferís una Puerta 1 más abierta (por ejemplo, que la variante B sea "Deportivo / broadcast"), se cambia.

## Investigación: qué evitar, qué usar, qué está verificado

**Patrones "IA genérica"** (skill `frontend-design`, Impeccable). Cinco clusters: (1) crema + serif de display + terracota; (2) negro con acento verde ácido; (3) hairlines y radio cero tipo periódico; (4) kit SaaS de cards idénticas con sombra gris y gradientes; (5) chrome de template: eyebrows en mayúsculas, "A · B · C", monospace para datos, flechas en links. Impeccable suma: fuentes sobreusadas (Inter, Arial, system), gris sobre color, negros y grises puros, cards anidadas, easing elástico. **Hoy la app tiene los clusters 4 y 5**; un restyle ingenuo "golf = verde + crema + serif" caería en el 1. Regla: un elemento memorable por pantalla, el resto callado; una sola secuencia orquestada al arrancar; después, movimiento solo disparado por el usuario para mostrar qué cambió.

**Vocabulario auténtico de golf.** Notación de tarjeta círculo/cuadrado (también resuelve "significado sin depender del color"); puntitos de hándicap; colores de tee; pizarras manuales con rojo bajo par; yardage books con grilla mínima. Uso en cancha: contraste ≥ 7:1 en números principales por el sol, targets ≥ 44 px (el pulgar cubre ~72 px), acciones primarias abajo al centro, 5 pestañas máximo, una mano.

**Hechos técnicos verificados en los docs de Next 16.3.6 (tarball) y registries:** `params`/`searchParams`/`cookies()` asíncronos; `src/proxy.ts` reemplaza a middleware (sus `PUBLIC_PATHS` con `startsWith` y el matcher que solo excluye imágenes: toda ruta o archivo nuevo debe agregarse); `error.tsx` recibe `retry` (estable en 16.3); `useLinkStatus()` da `pending`; `loading.tsx` se prefetchea; `<ViewTransition>` se importa de `react` y **no necesita flag**: las navegaciones de ruta animan solas, y el morph de elemento compartido solo se empareja cuando el destino renderiza en el mismo commit (con rutas dinámicas + `loading.tsx` va a caer casi siempre al reveal de Suspense: inofensivo); `next/image` usa `preload`; Safari 16.4+. shadcn CLI: `init --base base|radix|aria`, escribe variables OKLCH en `:root`/`.dark`, `@custom-variant dark (&:is(.dark *))`, `@theme inline`, `src/lib/utils.ts` (`cn`), y agrega `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tw-animate-css`. Versiones vistas hoy (pinear al instalar): shadcn 4.21, lucide-react 1.48, motion 13.4, sonner 2.0, @number-flow/react 0.6, next-themes 0.4.6, impeccable 4.1, playwright-core 1.56 (coincide con el Chromium preinstalado). Haptics: `navigator.vibrate` solo Android y solo dentro del gesto; iOS solo con el truco `<input type="checkbox" switch>` (Safari 17.4+), sin garantías. Splash PWA: Android usa ícono + `background_color`; iOS necesita `apple-touch-startup-image` por tamaño (`metadata.appleWebApp.startupImage`); Apple y Android piden que el splash imite la primera pantalla y no anime: la "animación de arranque" va dentro de la app, en el primer paint, respetando `prefers-reduced-motion`. RLS (`supabase/migrations/0001_init.sql`): un no-miembro no puede leer `groups`; `join_group` es el único camino → no se puede mostrar el nombre del grupo antes de unirse sin un RPC nuevo.

Fuentes: [frontend-design (Anthropic)](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), [Impeccable](https://github.com/pbakaus/impeccable), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [notación de tarjeta](https://thegolfnewsnet.com/ryan_ballengee/2024/12/29/what-circles-squares-golf-scorecard-mean-explained-105507/), [thumb zone](https://parachutedesign.ca/blog/thumb-zone-ux/), [contraste y sol](https://coloruxlab.com/guides/mobile-app-color-design), [haptics web 2026](https://creativealive.com/haptics-web-whats-possible-whats-fake-2026/), [splash PWA](https://web.dev/learn/pwa/enhancements), [shadcn Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default), [shadcn Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4), [NumberFlow](https://number-flow.barvian.me/), [Sonner](https://sonner.emilkowal.ski/), [Motion + App Router](https://motion.dev/docs/react-motion-component), [View Transitions en Next 16](https://www.digitalapplied.com/blog/react-19-2-view-transitions-animate-navigation-nextjs-16), [tokens Tailwind v4](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/).

## Brief de diseño (lenguaje visual)

Termina en `DESIGN.md` (raíz, única fuente de verdad; lo lee Impeccable), `docs/design.md` (puntero de cinco líneas) y `docs/adr/0004-lenguaje-visual-tarjeta-y-pizarra.md`.

### Principios

1. **Un objeto por pantalla.** Login: el círculo de lapicera dibujándose alrededor de la G. Inicio: el Hándicap Index en la pizarra. Partida: el numeral gigante con su marca sobre el stepper. Grupo: el ranking en la pizarra. Lo demás es tinta sobre papel con reglas, sin cajas.
2. **Significado sin depender del color.** Birdie/bogey se leen por la forma; el color solo refuerza. Toda badge lleva ícono o texto.
3. **Pensado para la cancha.** Una mano, sol, guantes: números grandes, contraste alto, targets ≥ 44 px, stepper de 56 px en la zona del pulgar.
4. **Feedback en cada acción.** Pendiente, éxito, error y vacío tienen forma propia; ningún error se traga.
5. **Movimiento con motivo.** Una secuencia orquestada (login); después, solo disparado por el usuario.

### Qué se elimina del estado actual

| Patrón | Dónde está hoy | Reemplazo |
|---|---|---|
| `text-sm font-semibold uppercase tracking-wide text-muted` (8×) | page, grupos/[id], golfistas/[id] | `Section` en sentence case |
| cadenas `" · "` (12+ lugares) | page, partidas, grupos, golfistas, canchas, perfil, firma | `RoundRow`, filas etiqueta/valor, chips |
| `Card rounded-2xl` uniforme (8 list-cards) | todas las páginas | reglas (`List`/`ListRow`); una `Board` por pantalla |
| emoji 📷; glifos ✓ ✕ + − • → | photo-panel, course-form, forms, score-grid | `lucide-react`, `StrokeDots`, layout |
| `confirm()` nativo (4×) | round-menu, member-actions ×2, claim-guest | `ConfirmSheet` |
| `?ok=1` / `?error=` como feedback | perfil, grupos/nuevo | `useActionState` + errores inline + toast |
| `text-[10px]` | score-grid, round-menu, Stat | nada por debajo de 12 px |
| `font-mono` en el link de invitación | invite-panel | texto plano + botón Copiar |
| `active:scale` sin transición | Button, GoogleButton | `transition-transform duration-120` |
| `touch-none` en el gráfico | index-chart | `touch-action: pan-y` |
| color como único significado del golpe | `scoreColor()` | `ScoreMark` + color |
| ícono "G" generado, sin maskable/apple/splash | icon.tsx, manifest.ts | assets de la Fase 4 |

### Tokens (OKLCH; tres capas: marca → rol semántico de shadcn → componente)

Capa de marca (crudas, en `:root`, nunca en componentes): `--papel oklch(0.972 0.008 120)` (papel teñido, hue 120, no crema), `--pizarra oklch(0.21 0.018 160)` (página oscura verde-negra), `--tinta`, `--pasto oklch(0.50 0.12 155)` (el único verde; chroma ≤ 0.13, nunca ácido), `--rojo oklch(0.55 0.19 27)` (lapicera roja: bajo par y destructivo), `--azul oklch(0.48 0.13 262)` (tinta azul: sobre par), `--ambar oklch(0.72 0.15 75)` (celdas dudosas, Hoyo no terminado).

Capa semántica (nombres de shadcn porque sus componentes dependen de ellos) + propios:

| Rol | Claro | Oscuro (`.dark`, solo lo que cambia) | Uso |
|---|---|---|---|
| `--background` | `var(--papel)` | `oklch(0.21 0.018 160)` | página |
| `--foreground` | `oklch(0.24 0.02 160)` | `oklch(0.95 0.008 120)` | tinta |
| `--card` / `--popover` | `oklch(0.99 0.004 120)` | `oklch(0.25 0.018 160)` / `0.27` | superficies (sin sombra) |
| `--primary` / `-foreground` | `oklch(0.50 0.12 155)` / `oklch(0.985 0.01 120)` | `oklch(0.74 0.13 155)` / `oklch(0.18 0.03 160)` | botón primario, pestaña activa, foco |
| `--secondary`, `--muted` | `oklch(0.94 0.012 130)` | `oklch(0.30 0.018 160)` | botón secundario, cabeceras de tabla |
| `--muted-foreground` | `oklch(0.50 0.02 160)` | `oklch(0.72 0.015 140)` | metadatos (≥ 4.5:1) |
| `--accent` / `-foreground` | `oklch(0.93 0.02 150)` | `oklch(0.32 0.03 160)` | **tinte de hover, no la marca** |
| `--destructive` | `oklch(0.52 0.19 27)` | `oklch(0.70 0.17 25)` | dar de baja, sacar |
| `--border`, `--input` | `oklch(0.87 0.012 130)` | `oklch(0.33 0.02 160)` / `0.36` | reglas de la tarjeta |
| `--ring` | `var(--primary)` | ídem | foco visible |
| `--radius` | `0.5rem` | igual | shadcn deriva sm/md/lg/xl |
| **Propios** | | | |
| `--surface-raised` | `oklch(1 0 0)` | `oklch(0.29 0.02 160)` | solo sheet y toast |
| `--line-strong` | `oklch(0.72 0.02 150)` | `oklch(0.48 0.02 160)` | regla después del hoyo 9, marco de la grilla |
| `--board` / `-foreground` / `-muted` | `oklch(0.30 0.05 160)` / `oklch(0.975 0.008 120)` / `oklch(0.80 0.03 150)` | `var(--card)` / `var(--foreground)` / `var(--muted-foreground)` | la pizarra (Inicio y Grupo) |
| `--score-under` / `--score-over` | `var(--rojo)` / `var(--azul)` | `oklch(0.74 0.17 25)` / `oklch(0.76 0.11 258)` | notación y "+3 / −2" |
| `--warn` / `-foreground` | `var(--ambar)` / `oklch(0.30 0.06 75)` | `oklch(0.82 0.15 80)` / `oklch(0.22 0.05 80)` | dudosos, Hoyo no terminado, avisos |
| `--tee-blancas … -negras` | blanco con borde tinta / `oklch(0.52 0.17 255)` / `oklch(0.86 0.17 95)` / `oklch(0.58 0.20 27)` / `oklch(0.20 0 0)` | +0.1 L | `TeeChip`, columnas de distancias |
| `--chart-1..5` | paleta ya validada de `index-chart.tsx` (LIGHT/DARK) pasada a OKLCH | ídem | gráfico |
| `--shadow-raised`, `--nav-h` | sombra teñida de tinta al 35 %, `3.5rem` | | sheet/toast; alto de la barra |

`@theme inline` expone además `--font-sans`, `--font-display`, tamaños `text-board` 28 / `text-board-lg` 40 / `text-board-xl` 72, espaciados `tap` 44 px y `thumb` 56 px, `--ease-out cubic-bezier(0.2,0,0,1)`. `@layer base`: `html { color-scheme }`, sin `padding-bottom` en `body` (la barra es dueña de la safe area), `.font-display { font-variant-numeric: tabular-nums }`, y `prefers-reduced-motion` anula las animaciones de view transition.

Contraste, verificado por `scripts/contrast.mjs` (Fase 1): `foreground/background` ≥ 12:1; `muted-foreground/background` ≥ 4.5:1; numerales de pizarra ≥ 7:1; `score-under`/`score-over` sobre `card` ≥ 4.5:1; `primary-foreground/primary` y `warn-foreground/warn` ≥ 4.5:1. Si algo falla se ajusta L, nunca chroma por encima de 0.19. Nada de negro o gris puro.

**Mapeo viejo → nuevo (cambia el significado, no solo el nombre):** `--surface` → `--card` (`bg-surface` → `bg-card`); `--muted` era *texto* → `--muted-foreground` (`text-muted` → `text-muted-foreground`, `var(--muted)` → `var(--muted-foreground)`); `--accent` era *la marca* → `--primary` (`bg-accent` → `bg-primary`, `text-accent` → `text-primary`, `border-accent` → `border-primary`, `bg-accent/10` → `bg-primary/10`, `border-accent/40` → `border-primary/40`, `text-accent-foreground` → `text-primary-foreground`, `focus:border-accent` → `focus-visible:border-ring`); `red-*` → `destructive` o `warn`; `yellow-*` → `warn`; `blue-*` → `ScoreMark`; `--font-geist-sans` → `--font-text`/`--font-numerals`. Usos por archivo (para el sed y la revisión del diff): shell (text-muted ×2), index-chart (text-muted ×3, bg-surface, `var(--surface)`, `var(--muted)`), page (text-muted ×5, text-accent ×3), login/page (text-muted, red), google-button (bg-surface, shadow-sm), partidas/page (×2), partidas/[id]/page (×1), player-tabs (accent ×3, bg-surface), score-grid (text-muted ×6, text-accent, bg-accent/10, yellow/red/blue ×5), photo-panel (border-accent/40, bg-surface ×2, text-muted ×4, yellow ×3), round-menu (red ×2), new-round-form (text-muted ×3, accent ×3, bg-surface), grupos/[id]/page (×7), invite-panel (font-mono, text-muted), member-actions (text-muted, red), grupos/nuevo (×1), unirse (×1), golfistas/[id] (text-muted ×8, accent ×5), perfil/page (text-muted ×5, bg-accent/10), claim-guest (×2), canchas/page (×1), canchas/[id] (×5), course-form (text-muted ×4, bg-surface ×3), canchas/[id]/editar (×1).

### Tipografía (vía `next/font/google`; decisión en la Puerta 1)

Requisitos: figuras tabulares, cara condensada para numerales, texto humanista, nada de Inter/Geist/Space Grotesk/Manrope/DM Sans/Plus Jakarta.

| Opción | Texto | Numerales de pizarra, golpes y wordmark | Por qué |
|---|---|---|---|
| **A (recomendada)** | `Sofia_Sans` (variable 400–700) | `Sofia_Sans_Extra_Condensed` 600–800 | una superfamilia, dos anchos inconfundibles; sets numéricos completos |
| B | `Archivo` con `axes: ["wdth"]` | la misma a `font-stretch: 75%` 700 | una sola familia con eje de ancho (verificar soporte de `axes`) |
| C | `Public_Sans` | `Big_Shoulders` 700 | más sabor de pizarra, más riesgo |

Verificación en el playground: `1111,1` y `8888,8` con `tabular-nums` en el mismo contenedor deben medir igual; legibilidad de 1/7, 3/8, 6/8 a 12 px. Si la cara elegida no tiene `tnum`, se cambia de opción (las celdas de la grilla son de ancho fijo de todos modos). Si el proxy del sandbox bloquea Google Fonts en el build: `next/font/local` con los OFL en `src/app/fonts/`.

Roles: cuerpo 16/1.5, pequeño 14/1.4, caption 12/1.3 (**nada por debajo de 12 px**); `text-board` 28, `text-board-lg` 40, `text-board-xl` 72 (hero del Inicio), numeral del modo foco 96 (`text-[6rem]`); título de página 20/600 (texto), encabezado de sección 16/600 tinta, sentence case; inputs ≥ 16 px para que iOS no haga zoom; línea ≤ 60 caracteres (el `max-w-lg` actual).

### Espacio, radio, sombra

Escala de 4 px; `tap` 44 px (mínimo interactivo), `thumb` 56 px (stepper), gutter 16, entre secciones 32, dentro 12. Radio base 0.5rem: `rounded-sm` celdas e inputs, `rounded-md` chips y botones, `rounded-xl` solo sheet, toast y pizarra, `rounded-full` solo botones del stepper e iniciales. **Sin `rounded-2xl` ni cards con sombra.** Sombra `shadow-raised` únicamente en sheet, toast y barra fija de totales. Las listas y grillas usan reglas (`border-b border-border`; `border-line-strong` después del hoyo 9). Sin gradientes. La textura es la grilla rayada, no un patrón de fondo.

### Movimiento

- Duraciones: 120 ms estado (press, toggle), 200 ms enter/exit chico, 240 ms deslizar de hoyo, 320 ms sheet, 600 ms rodar de número; reveal de login ≤ 1,1 s total. Easing `--ease-out` para entradas, `--ease-in-out` para movimientos; sin rebote.
- **La única secuencia orquestada:** login (se dibujan cuatro reglas de tarjeta, el círculo rojo rodea la G con `pathLength` 0→1, aparecen wordmark y botón). El Inicio tiene un stagger silencioso una vez por lanzamiento (`sessionStorage`), nunca en navegaciones posteriores.
- Disparado por el usuario: el dígito del stepper rueda (NumberFlow), `ScoreMark` dibuja su círculo/cuadrado (250 ms), el cambio de hoyo desliza según la dirección, la firma rueda de índice anterior a nuevo, los toasts entran. Nunca: hover en touch, skeletons con shimmer (pulso lento de 1,6 s en dos tonos), animar listas al navegar.
- `motion` solo vía `LazyMotion features={domAnimation} strict` y `m.*` en hojas cliente finas; `useReducedMotion()` en cada una; NumberFlow respeta la preferencia por defecto.
- Rutas: `<ViewTransition>` con crossfade (`::view-transition-old(.page)` 120 ms, `new` 200 ms); `name` compartido en el número del índice (Inicio ↔ Perfil ↔ Golfista) y en el título de cancha (fila ↔ partida), sabiendo que el morph rara vez se empareja en rutas dinámicas.

### Copy (rioplatense, vocabulario de `CONTEXT.md`)

Sentence case; sin mayúsculas sostenidas salvo IDA / VUELTA / TOTAL en la grilla. Mismo verbo en todo el flujo: Firmar → Firmando… → Firmada; Cargar golpes → Cargando… → "Cargamos 36 golpes en 2 tarjetas"; Crear partida → Creando…. Sin "·" para encadenar: dos líneas o etiqueta/valor; el único separador permitido es el de una frase fija de golf ("CR 70,3 / Slope 125"). Vacíos con dirección y con el CTA adentro. Errores con causa y salida; `friendlyDbError` traduce RLS/red/unicidad ("No tenés permiso para esto.", "Sin conexión. Probá de nuevo."). Términos: "Hoyo no terminado" (la marca es una barra, nunca la palabra "X"), "Invitado" como badge en vez de "(inv.)", coma decimal en pantalla ("21,3").

### Wireframes (390 px)

```
LOGIN (la secuencia orquestada; tiempos en ms)        INICIO
┌──────────────────────────────┐                     ┌──────────────────────────────┐
│      ──────────────          │ 0–300 reglas        │ Hola, Bauti                  │
│      ──────────────          │  scaleX 0→1         │ ┌──────────────────────────┐ │
│          ╭─────╮             │                     │ │ Hándicap Index           │ │ ← Board (verde en claro)
│          │  G  │             │ 250–750 círculo     │ │  21,3      ↘ −0,4        │ │   BoardNumber xl + tendencia
│          ╰─────╯             │  rojo se dibuja     │ │  12 tarjetas firmadas    │ │
│      ──────────────          │                     │ └──────────────────────────┘ │
│            Galf              │ 600–900 wordmark    │ [       Nueva partida      ] │ ← el único botón primario
│     El anotador del grupo    │                     │ ⚠ Tu tarjeta de Miraflores   │ ← Notice warn si hay
│  ┌──────────────────────────┐│                     │   (12 sep) está sin firmar › │   una sin firmar
│  │  [G]  Entrar con Google  ││ 850–1100 botón      │ Grupos                 Nuevo │
│  └──────────────────────────┘│                     │ Los del sábado    5 golf.  › │ ← ListRow con reglas, sin caja
│  No pudimos iniciar sesión.  │ solo con ?error     │ ──────────────────────────── │
│  Probá de nuevo.             │                     │ Últimas partidas   Ver todas │
└──────────────────────────────┘                     │ Miraflores            12 sep │ ← RoundRow
                                                     │ Bauti 84 ✓ Agus 91 ✓ Manu —  │   chips por jugador
                                                     ├──────────────────────────────┤
                                                     │ Inicio Partidas Grupos Canchas Perfil │ ← 5 pestañas, activa = tinta
                                                     └──────────────────────────────┘
PARTIDA — Hoyo a hoyo                                GRUPO — pizarra
┌──────────────────────────────┐                     ┌──────────────────────────────┐
│ ‹ Miraflores               ⋯ │ menú: Fotos, Baja   │ ‹ Los del sábado           ⋯ │ menú: Invitar, Salir…
│ aprox. 12 sep  ● Blancas  18 │ chips, sin "·"      │ ┌──────────────────────────┐ │
│ [Bauti 41] [Agus 43] [Manu —]│ switcher            │ │ 1  AG Agus     18,4  ↘   │ │ ← Leaderboard: puesto,
│ Hoyo 7               ‹ 6  8 ›│                     │ │ 2  BA Bauti    21,3  ↗   │ │   iniciales, BoardNumber lg
│ Par 4   Hcp 5   312 m        │                     │ │ 3  MA Manu     24,0  →   │ │   yo = fila teñida
│ ●● Recibís 2 golpes          │ StrokeDots          │ │ 5  FA Fava  decl. 30,0   │ │   badge "declarado"
│           ┌─────┐            │                     │ └──────────────────────────┘ │
│           │  5  │            │ ScoreMark lg:       │ [       Nueva partida      ] │ preselecciona el grupo
│           └─────┘            │  cuadrado = bogey   │ Evolución                    │
│    (  −  )       (  +  )     │ Stepper 56 px       │ ┌ IndexChart responsivo ───┐ │
│    [ No terminé el hoyo ]    │ toggle warn         │ └──────────────────────────┘ │
│ ○○○○○○●○○ │ ○○○○○○○○○         │ tira de hoyos       │ Comparación                  │
│ Gross 41 (+5)  Neto al final │ barra fija +        │ Golfista Hcp Prom Últ5 Mejor │ ← DataGrid con reglas
│ [Tarjeta completa] [Firmar]  │  SaveStatus         │ Últimas partidas / Invitar   │
└──────────────────────────────┘                     └──────────────────────────────┘
PARTIDA — Tarjeta completa: grilla rayada Hoyo | Par | Hcp | Golpes por jugador (columnas), filas Ida / Vuelta / Total,
ScoreMark sm en cada celda, Lock en columnas firmadas; tap en una celda abre el modo foco en ese hoyo y jugador.
```

## Arquitectura resultante

```
src/app/
  layout.tsx                 fuentes, <html suppressHydrationWarning>, Providers, metadata + startupImage
  providers.tsx              ThemeProvider (next-themes, class) → LazyMotion → ConfirmProvider → Toaster
  globals.css                tokens (arriba)
  (app)/layout.tsx           BottomNav + <main> con padding de la barra + <ViewTransition default="page">
  (app)/{page,partidas,grupos,canchas,golfistas,perfil,unirse}/…   (URLs iguales; movidos con git mv)
  (app)/loading.tsx, error.tsx (retry), not-found.tsx; loading.tsx específicos por ruta
  login/, auth/ (sin cambios de rutas), dev/playground/ (solo dev y preview)
  icon.tsx, apple-icon.tsx, icons/[name]/route.tsx (192, 512, maskable), splash/[spec]/route.tsx, manifest.ts
src/components/ui/           generados por shadcn (button input textarea label field select checkbox toggle-group
                             sheet dialog dropdown-menu badge separator skeleton spinner sonner) re-estilados + propios:
  page-header back-button bottom-nav section list board board-number score-mark stroke-dots stepper tee-chip
  initials round-row leaderboard scorecard-grid cell-input notice empty-state submit-button save-status icon
  confirm-sheet use-confirm theme-provider legacy (TEMPORAL: Card/LinkButton/Field/Empty/ErrorBanner sobre tokens nuevos)
src/lib/
  format.ts (formatDate, fmtIndex con coma, fmtToPar, fmtCount) · score-notation.ts · tee-color.ts · scorecard-totals.ts
  action-result.ts (ActionResult, fail, fromZod, friendlyDbError) · zod.ts (locale es) · haptics.ts · public-paths.ts
  pwa/devices.ts · utils.ts (cn, lo crea shadcn) · db/groups.ts (listMyGroups)
scripts/screenshots.mjs · scripts/contrast.mjs
DESIGN.md · PRODUCT.md (Impeccable) · docs/design.md · docs/adr/0004-…md · .env.example
```

`src/components/ui.tsx` **desaparece** en la Fase 1 (colisiona con la carpeta `src/components/ui/`); `src/components/shell.tsx` y `ui/legacy.tsx` desaparecen al cerrar la Fase 5.

## Fases (cada una se pushea a la rama y se ve en el preview de Vercel)

### Fase 0 — Preparación (sin cambio visible)

1. `git fetch origin && git merge --ff-only origin/claude/vigilant-bardeen-6iwzid` (falla en voz alta si la rama dejara de ser fast-forward) → `git push -u origin claude/sleepy-wozniak-v86mqg`.
2. `pnpm install`; con env dummy (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`, `ANTHROPIC_API_KEY=dummy`) correr `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; guardar la tabla de rutas de `next build` como baseline de bundle. Si `next/font/google` no baja las fuentes por el proxy, anotarlo (fallback local en Fase 1).
3. `.env.example` (el README lo menciona y no existe): solo nombres de variables.
4. `pnpm add -D playwright-core@1.56` y `scripts/screenshots.mjs`: levanta `next dev` con env dummy, dispositivos 390×844 @3 y 360×800 @3, `colorScheme` claro y oscuro, tercera pasada con `reducedMotion: "reduce"`, rutas `/login` y `/dev/playground` (página entera y cada `[data-shot]`), salida en `$GALF_SHOTS_DIR` (por defecto la carpeta scratch de la sesión, nunca el repo). Script `"screenshots"` en `package.json`.
5. Playground `src/app/dev/playground/{page.tsx,playground.tsx,fixtures.ts}`: `notFound()` si `NODE_ENV === "production"` salvo `GALF_PLAYGROUND=1` (se setea solo en el entorno **Preview** de Vercel para revisar componentes en el teléfono antes de migrar pantallas); `/dev` entra en `PUBLIC_PATHS` bajo la misma condición; fixtures tipados con `src/lib/db/*.ts` (una partida de Miraflores con 3 tarjetas: la mía sin firmar con 12 hoyos, Agus firmada 91, Manu histórica; series de índice de 5 golfistas; grupos; canchas); acciones stubeadas. Sigue el skill `prototype` del repo para las variantes `?variant=`.
6. Baseline de capturas de `/login`.
7. `npx impeccable install` (escribe `PRODUCT.md`, `DESIGN.md`, entradas en `.claude/`, `.impeccable/config.json`; revisar y commitear) → `/impeccable init` con el contexto (5 amigos en Argentina, sol y una mano, rioplatense, vocabulario WHS, sin marketing). `DESIGN.md` se escribe al final de la Fase 1 desde el brief; `/impeccable document` solo reconcilia. Agregar `PRODUCT.md`/`DESIGN.md` al orden de lectura de `CLAUDE.md`.

Verificación: los cuatro comandos en verde; baseline guardado; `/dev/playground` devuelve 404 en `pnpm build && pnpm start` y renderiza en dev.

### Fase 1 — Fundamentos (tokens, fuentes, primitivas; misma estructura, piel nueva)

1. **Retirar `src/components/ui.tsx` primero.** `src/lib/format.ts` con `formatDate`, `fmtIndex` (coma decimal), `fmtToPar` ("E", "+3", "−2"), `fmtCount`; tests en `format.test.ts`. Los 17 importadores pasan a `@/lib/format` y a `@/components/ui/legacy` (Card, LinkButton, Field, inputClass, Empty, ErrorBanner reimplementados sobre tokens nuevos). Borrar `ui.tsx`.
2. **shadcn init** (commit limpio antes): `pnpm dlx shadcn@latest init --base base --css-variables -y` (confirmar flags con `--help`); `components.json` con `aliases.ui = "@/components/ui"`, `iconLibrary = "lucide"`; reescribe `globals.css`. Reconciliar a mano a la forma del brief (conservar `@theme inline` y `@custom-variant dark` del CLI, reemplazar valores, agregar tokens propios, borrar `--sidebar-*`, quitar el `padding-bottom` del `body`). `pnpm dlx shadcn@latest add button input textarea label field select checkbox toggle-group sheet dialog dropdown-menu badge separator skeleton spinner sonner`. **No** se agregan card, avatar, table, alert, tabs, tooltip, drawer (vaul), form. `pnpm add motion sonner @number-flow/react next-themes`. `cn` con `extendTailwindMerge` para los tamaños `text-board*`.
3. **Re-estilar lo generado** (ya es nuestro): `button.tsx` variantes `default | secondary | ghost | destructive | link`, tamaños `sm` 36 / `default` 44 / `lg` 52 / `icon` 44, `rounded-md`, sin `shadow-xs`, `transition-[transform,background-color,border-color] duration-120 active:scale-[0.97]`, `focus-visible:ring-2`, prop `pending` (deshabilita, muestra `Spinner`, conserva el ancho del label); `input`/`textarea` 44 px `text-base`, `aria-invalid` → borde destructivo; `badge` con tonos `under | over | warn | signed (ícono Check) | guest`; `toggle-group` segmentado con reglas; `sheet` `side="bottom"` con `rounded-t-xl`, manija, `pb-[env(safe-area-inset-bottom)]`, `shadow-raised`, `max-h-[85dvh]`; `skeleton` pulso lento; `sonner` arriba al centro con offset de safe area, clases mapeadas a tokens, 3 s.
4. **Primitivas propias** (contratos):
   - `PageHeader({ title, back?: { fallback }, action?, meta? })`; `BackButton`: `router.back()` si hay historial propio (profundidad guardada en `sessionStorage`), si no `push(fallback)`.
   - `BottomNav` (cliente): `usePathname` → `aria-current`; `useLinkStatus` por pestaña.
   - `Section({ title, action? })`, `List`, `ListRow({ href?, leading?, title, meta?, trailing? })`.
   - `Board`, `BoardNumber({ value, kind: "index"|"int"|"toPar", size, animate?, tone? })` (NumberFlow cuando `animate`; tono automático bajo/sobre par).
   - `ScoreMark({ strokes, par, pickedUp?, size, animate? })` sobre `src/lib/score-notation.ts` (`notationFor` → forma `none|circle|double-circle|square|double-square|slash` + tono); `aria-label` "5 golpes, bogey".
   - `StrokeDots({ count })` (1–3 puntos, ≥ 4 → "×4"; negativos huecos).
   - `Stepper({ value, onChange, min, max, disabled, size: "md"|"lg", label, children })`: flechas y +/− por teclado, `haptics.tap`, `aria-label` "Un golpe menos/más".
   - `TeeChip({ name, size, selected?, onSelect? })` sobre `src/lib/tee-color.ts`.
   - `Initials({ name, size })`, `RoundRow({ round })`, `Leaderboard({ rows })`.
   - `ScorecardGrid({ positions, holesInRound, loops, columns, highlight?, onCellTap?, mode: "scores"|"course" })` con `src/lib/scorecard-totals.ts` (Ida/Vuelta/Total).
   - `CellInput` (44 px numérico para course-form y revisión de foto), `Notice({ tone })` (reemplaza ErrorBanner), `EmptyState({ icon, title, body?, action? })`, `SubmitButton` (`useFormStatus`), `SaveStatus({ state, onRetry })`, `Icon`, `theme-provider.tsx`.
   - Íconos lucide por uso (verificar nombres en `lucide-react.d.ts`, la 1.x quitó alias): nav `House ClipboardList Users LandPlot CircleUserRound`; header `ChevronLeft Ellipsis`; acciones `Plus Minus Camera Check X PenLine Undo2 Share2 Copy RefreshCw Ban Trash2 LogOut UserRoundMinus DoorOpen`; estado `TriangleAlert Info CircleCheck LoaderCircle Lock TrendingDown TrendingUp MoveRight ChevronRight`; tema `Sun Moon Monitor`; otros `Image Slash CalendarDays MapPin`.
5. **Fuentes y providers**: `layout.tsx` con `Sofia_Sans` (`--font-text`) y `Sofia_Sans_Extra_Condensed` (`--font-numerals`), `<html suppressHydrationWarning>`; `providers.tsx` con `ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange` → `LazyMotion` → `ConfirmProvider` → children + `<Toaster />`; un efecto actualiza las `<meta name="theme-color">` cuando cambia `resolvedTheme`.
6. **Migración mecánica** de las páginas: sed en este orden (luego revisar el diff): `text-muted(?!-)` → `text-muted-foreground`; `bg-surface` → `bg-card`; `var(--surface)` → `var(--card)`; `var(--muted)` → `var(--muted-foreground)`; `border-accent/40` → `border-primary/40`; `bg-accent/10` → `bg-primary/10`; `text-accent-foreground` → `text-primary-foreground`; `bg-accent` → `bg-primary`; `text-accent` → `text-primary`; `border-accent` → `border-primary`; `focus:border-accent` → `focus-visible:border-ring`; `variant="danger"` → `"destructive"`; rojos/amarillos/azules según la tabla. `Button` viejo → `Button` de shadcn; el resto → `legacy`. Puerta de grep en `package.json` (`"lint:tokens"`): `rg -n "text-muted\b|bg-surface|text-accent\b|bg-accent\b|border-accent\b|(text|bg|border)-(red|yellow|blue)-\d|text-\[10px\]|font-geist" src` debe estar vacío (Tailwind no tipa clases; un rename olvidado pierde estilo en silencio).
7. **`scripts/contrast.mjs`** (node, sin deps): parsea `:root`/`.dark` de `globals.css`, OKLCH → sRGB, WCAG para los pares del brief, imprime los hex para `theme_color`/viewport, sale con 1 si algo no llega. Script `"contrast"`.
8. Tests: `format.test.ts`, `score-notation.test.ts`, `tee-color.test.ts`, `scorecard-totals.test.ts` (vitest node, estilo `course.test.ts`).
9. Playground: secciones `tokens` (swatches + contraste calculado), `tipografia` (especímenes de A/B/C + chequeo tabular), una sección por primitiva en todos sus estados, y las **3 variantes** de Partida e Inicio (`?variant=`) preparadas con `/impeccable shape`.
10. **Puerta 1**: capturas claro/oscuro → elegís → se escribe `DESIGN.md` (familia, cuánta pizarra, radios) y se borran las variantes perdedoras del branch.

Verificación: `pnpm typecheck && pnpm lint && pnpm lint:tokens && pnpm test && pnpm build && pnpm contrast`; `pnpm screenshots` claro/oscuro/reducido revisadas; chequeo tabular OK (o cambio de opción); preview de Vercel: todas las rutas con la misma estructura y la piel nueva, nada "sin estilo", modo oscuro sigue al sistema; `DESIGN.md` escrito y aprobado.

### Fase 2 — Shell y navegación

1. Route group `src/app/(app)/` con `layout.tsx` (BottomNav + `<main className="mx-auto w-full max-w-lg px-4 pt-3 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1rem)]">` + `<ViewTransition default="page">`); `git mv` de `page.tsx`, `partidas/`, `grupos/`, `canchas/`, `golfistas/`, `perfil/`, `unirse/` adentro, en un solo commit (URLs iguales). La barra deja de remontarse en cada navegación. `shell.tsx` queda como envoltorio de `PageHeader` hasta el final de la Fase 5.
2. `PageHeader` sticky con `pt-[env(safe-area-inset-top)]`, `bg-background/90 backdrop-blur`, `BackButton`, título 20/600 truncado, slot de acción (ícono o menú); el meta renderiza chips.
3. `BottomNav`: 5 pestañas (Inicio `/` exacto, Partidas, Grupos, Canchas, Perfil con `startsWith`), `aria-current="page"`, tinta + ícono relleno en la activa, ≥ 48 px de alto, safe area **solo acá**. Alternativa abierta: mover Canchas a una fila de Perfil después de un mes de uso.
4. `/grupos` nuevo: `src/lib/db/groups.ts` → `listMyGroups(playerId)` (la consulta de Inicio + `members:group_members(count)`), usada por Inicio, `/grupos` y `/partidas/nueva`; `ListRow`s + `EmptyState` "Creá un grupo o entrá con el link que te mandaron".
5. Skeletons: `(app)/loading.tsx` (cabecera + 3 filas) y específicos en `partidas/[id]` (switcher + numeral + stepper), `grupos/[id]` (pizarra + filas), `golfistas/[id]`, `partidas`, `canchas`; `<ViewTransition exit="fade">` en el skeleton y `enter="rise"` (8 px) en el contenido.
6. Errores: `(app)/error.tsx` (cliente, `retry`): `Notice error` + "Reintentar" + "Ir al inicio"; `not-found.tsx` global (sin shell) y `(app)/not-found.tsx` (con barra): "No encontramos esto. Puede haber sido dado de baja."
7. Títulos: `metadata.title` estático en cada página estática; `generateMetadata` en `partidas/[id]`, `grupos/[id]`, `golfistas/[id]`, `canchas/[id]`, envolviendo `getRound`, `getCourse`, `getPlayerStats` y la consulta del grupo en `cache()` para no duplicar lecturas.
8. View Transitions: CSS `::view-transition-old(.page)` 120 ms / `new` 200 ms; `name="hcp-index"` y `name="course-<id>"` con `share="morph"`, aceptando que casi siempre cae al reveal de Suspense.
9. `useLinkStatus` en pestañas y en `ListRow` con `href`: `data-pending` atenúa la fila 120 ms después de empezar (evita parpadeo en navegaciones rápidas).

Verificación: comandos; capturas de skeletons y barra; en el preview: pestaña activa en cada ruta, volver tras link profundo (fallback) y tras navegar (historial), skeletons visibles con "Slow 3G", `error.tsx` forzando un `throw` en dev, `/grupos` lista los grupos, títulos de pestaña en el historial.

### Fase 3 — Sistema de feedback

1. **Convención** `src/lib/action-result.ts`:
   ```ts
   export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };
   export const fail = (error: string, fields?: Record<string, string>) => ({ ok: false as const, error, fields });
   export function fromZod(err: z.ZodError): ActionResult<never>;   // fields[path.join(".")] = primer mensaje
   export function friendlyDbError(message: string): string;         // RLS / red / unicidad → español
   ```
   `src/lib/zod.ts`: `z.config(z.locales.es())` y re-export; `partidas/schema.ts` y `canchas/schema.ts` lo importan (solo esquema) y agregan mensajes por campo ("Poné un nombre", "El hándicap va de −10 a 54", "Slope entre 55 y 155").
2. **Formularios:**

   | Formulario | Hoy | Después |
   |---|---|---|
   | `grupos/nuevo` | FormData + `redirect(?error=)` | `new-group-form.tsx` con `useActionState(createGroup)`; `Field` + error inline; `SubmitButton` "Crear grupo / Creando…"; toast al llegar "Grupo creado. Compartí el link." |
   | `perfil` hándicap declarado | `?ok=1` / `?error=` | `declared-handicap-form.tsx`, `useActionState`; toast "Guardamos tu hándicap declarado: 18,4" |
   | `perfil` nombre | ídem | `display-name-form.tsx`; toast "Listo, ahora sos «Bauti»"; `?ok/?error` desaparecen de `perfil/page.tsx` |
   | `partidas/nueva` | `useTransition`, mensajes de zod unidos | `createRoundAndRedirect` devuelve `ActionResult` con `fields` (`guests.0.name` → fila); errores inline; `Button pending` |
   | `canchas` course-form | ídem | `holes.6.par`, `tees.1.slope` → `CellInput invalid` + `Notice` resumen |
   | `unirse/[code]` | escribe durante el render | `JoinGroupForm` con `useActionState(joinGroupAction)` (punto 7) |
   | login | texto rojo | `Notice tone="error"` |
3. **Errores que hoy se tragan:** `invite-panel` (regenerar/revocar → `toast.error` / "Link nuevo listo"), `member-actions` (sacar → toast), `round-menu` (toast, adiós `text-[10px]`), `claim-guest` (toast "Listo: las 8 tarjetas de Agus ahora son tuyas").
4. **`ConfirmSheet`** (`use-confirm.tsx` en `providers.tsx`; `Sheet side="bottom"`):
   ```ts
   const res = await confirm({ title: "¿Dar de baja la partida?", body: "Solo se puede si nadie firmó. Queda dada de baja, no se borra.",
     confirmLabel: "Dar de baja", tone?: "default" | "destructive",
     reason?: { label: "Motivo (opcional)", maxLength?: number, required?: boolean } });  // → { ok: true, reason? } | { ok: false }
   ```
   Foco vuelve al disparador (Base UI), Escape/fondo → `{ ok: false }`, `haptics.warn` en destructivo. Usos: dar de baja partida, salir del grupo, sacar miembro, "Soy yo", **desfirmar con motivo** (`unsignScorecard(roundId, cardId, reason)` → `rpc("unsign_scorecard", { p_scorecard_id, p_reason })`, ya tipado, hoy no se manda) y **firmar** (sheet de resumen, Fase 5.1).
5. **Autosave**: estado por hoyo (`idle | saving | saved | error`) y `lastSaved[position]`; en fallo se revierte ese hoyo a `lastSaved`, `SaveStatus error` con Reintentar y `toast.error`; el hoyo se marca sucio al instante (hoy "Firmar" queda habilitado 400 ms después del toque); en `visibilitychange === "hidden"` se vacían los timers pendientes.
6. **Momentos de éxito**: `signScorecard` devuelve `ActionResult<{ gross, adjustedGross, courseHandicap, differential, indexBefore, indexAfter, source, signedCount }>` (refactor de `snapshotIndex` para devolver el `PlayerHandicap` recalculado; el `hcp` previo ya se lee en la acción; sin tocar la base) → "Firmada" con `BoardNumber animate` rodando de antes a después y la frase "Con esta tarjeta tu Hándicap Index pasa de 21,3 a 20,8" (o "Te faltan 2 tarjetas firmadas para tener Hándicap Index"), `haptics.success`. `applyExtraction` pasa a devolver `{ applied, strokes }` → toast "Cargamos 36 golpes en 2 tarjetas". Desfirmar → toast + el índice vuelve rodando.
7. **`/unirse/[code]` → pantalla de confirmación** (cambio de comportamiento, va al roadmap): hoy el RPC corre en el render de un GET (también al prefetch). Nuevo: "Te invitaron a un grupo en Galf" + código + botón "Unirme" → `joinGroupAction` → `redirect("/grupos/<id>")` + toast "Ya estás en «Los del sábado»". El nombre del grupo **no** se puede mostrar antes (RLS): `peek_invite(code)` queda en "requiere DB".
8. **Haptics** `src/lib/haptics.ts`: `tap` (10 ms), `success` (`[12,30,12]`), `warn` (30 ms), solo si hay `navigator.vibrate` y no hay reduced motion; llamados sincrónicamente dentro del handler. Usos: Stepper, toggle Hoyo no terminado, firma, aplicar foto, confirmación destructiva. iOS: el truco del `<input type="checkbox" switch>` en `haptics-ios.tsx` detrás de un flag apagado hasta que lo verifiques en tu iPhone.

Verificación: cada formulario en su camino de error y de éxito; los 4 `confirm()` desaparecen (`rg "confirm\(" src` = 0 fuera de `use-confirm`); desfirmar con motivo queda en `scorecard_signatures.reason` (lo mirás por el conector de Supabase, solo lectura); modo avión en el teléfono: rollback y reintento del hoyo; `/unirse/<code>` ya no se une al abrir; tests de `fromZod`, `friendlyDbError`, `isPublicPath`; secciones del playground para Notice/Toast/ConfirmSheet/SaveStatus.

### Fase 4 — Arranque y marca

1. **Marca:** la "G" en la cara de numerales dentro de un círculo de lapicera (el gesto del birdie); wordmark "Galf" en Sofia Sans Extra Condensed 700. Un TTF OFL vendorizado en `src/app/icons/_fonts/` para `ImageResponse`.
2. **Íconos** (todos `ImageResponse`, estáticos en build, sin `sharp`): `icon.tsx` (512, `any`), `apple-icon.tsx` (180, opaco, cuadrado), `icons/[name]/route.tsx` con `generateStaticParams` → `192`, `512`, `maskable-192`, `maskable-512` (glifo dentro del 80 % central), `dynamicParams = false`. Fondo pasto profundo, glifo papel, círculo rojo.
3. **Manifest:** `id "/"`, `scope "/"`, `display standalone`, `orientation portrait`, `background_color` y `theme_color` = hex del papel (hoy el manifest tiene el verde y el viewport el papel), íconos 192/512/maskable, `categories ["sports"]`, `shortcuts [{ "Nueva partida", "/partidas/nueva" }]`. Viewport `themeColor` claro = papel, oscuro = pizarra (hex calculados por `contrast.mjs`). Sin service worker (fuera de alcance; Chrome ya no lo exige para instalar).
4. **Splash iOS:** `splash/[spec]/route.tsx` con `generateStaticParams` sobre `src/lib/pwa/devices.ts` (10 tamaños portrait: 750×1334, 828×1792, 1080×2340, 1125×2436, 1170×2532, 1179×2556, 1206×2622, 1284×2778, 1290×2796, 1320×2868) × claro/oscuro → 20 PNG estáticos (la marca centrada sobre papel/pizarra, nada más); `metadata.appleWebApp.startupImage` con `media` de `device-width`/`device-height`/`-webkit-device-pixel-ratio`/`orientation`/`prefers-color-scheme`; `statusBarStyle: "black-translucent"` con la cabecera pagando la safe area (verificar en tu iPhone; fallback `"default"`).
5. **Proxy:** `src/lib/public-paths.ts` con `isPublicPath` (`/login`, `/auth`, `/manifest.webmanifest`, `/icon`, `/apple-icon`, `/icons`, `/splash`, `/favicon.ico`, y `/dev` fuera de producción) + test; matcher `"/((?!_next/static|_next/image|favicon.ico|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"`.
6. **Login:** `login/brand-reveal.tsx` (cliente, `m.*` + `useReducedMotion`): la secuencia del wireframe, círculo con `pathLength` 0→1, ≤ 1,1 s; estático con reduced motion. `GoogleButton` sobre `Button variant="secondary" size="lg"` con `pending` "Redirigiendo…".
7. **Primer Inicio:** `(app)/reveal.tsx` (stagger 60 ms, 240 ms, 8 px) con `sessionStorage "galf:revealed"`; el `BoardNumber` rueda desde el punto anterior del historial al actual (muestra la tendencia), desde 0 si no hay.

Verificación: `pnpm build` emite 4 íconos + 20 splashes estáticos (tabla de rutas); DevTools → Application → Manifest instalable y maskable OK; iPhone: agregar a inicio muestra ícono, splash claro y oscuro, barra de estado; Android: ícono maskable y color de tema; reveal con y sin "Reducir movimiento"; el proxy sigue redirigiendo `/partidas` sin sesión a `/login` y sirve `/icons/192` sin sesión.

### Fase 5 — Pantallas (un commit y preview por pantalla)

**5.1 Partida `(app)/partidas/[id]/`** — `page.tsx` (server) → `round-scoring.tsx` (cliente, dueño del estado: `selectedCardId` desde `?j=` y espejado con `history.replaceState`, `scores` por tarjeta, `saveStatus`, `mode: "hoyo"|"tarjeta"`, `position`), `focus-mode.tsx`, `full-card.tsx` (`ScorecardGrid`), `player-switcher.tsx` (segmentado: `Initials` + nombre + gross/`—` + `Lock` si firmada, badge invitado), `sign-sheet.tsx`, `photo-flow.tsx`, `round-menu.tsx` (`DropdownMenu`: Fotos, Dar de baja), `scorecard-state.ts` puro (totales, toPar, ida/vuelta, regla de neto, siguiente hoyo sin jugar, `canSign(min)`, aplicar filas de foto) + test. Se borran `player-tabs.tsx`, `score-grid.tsx`, `photo-panel.tsx`.
- Cabecera: cancha; chips de fecha ("aprox."), `TeeChip`, "18 hoyos | Ida | Vuelta | 9 × 2", "CR 70,3 / Slope 125" o `Notice` "Sin rating: cargalo en la cancha para poder firmar" (→ editar cancha).
- Modo foco: `Stepper size="lg"` (56 px) con `ScoreMark lg animate` como valor; el primer toque pone el par (regla actual), máximo 20; swipe (`drag="x"`) y ‹ › con deslizamiento direccional 240 ms; tira de 18 hoyos (`aria-label` "Hoyo 7, 5 golpes"); "No terminé el hoyo" como toggle ghost (tinte warn, numeral → barra, `haptics.warn`); tarjetas bloqueadas (firmadas/históricas) muestran el estado en vez del stepper; barra fija con Gross, toPar, Neto ("Neto al terminar" mientras falten hoyos: regla actual) + `SaveStatus` + "Tarjeta completa" / "Firmar" cuando `canSign`.
- Tarjeta completa: `ScorecardGrid` con cada jugador como columna (≤ 4 entran; más → scroll horizontal con las 3 primeras columnas fijas), `ScoreMark sm` por celda, filas Ida/Vuelta/Total con gross y toPar, Neto cuando corresponde, `Lock` en columnas firmadas; tocar una celda desbloqueada abre el foco en ese hoyo y jugador.
- Firma: `SignSheet` con resumen (hoyos jugados, Gross (+n), Hándicap de cancha, Gross ajustado, Diferencial, calculados en el cliente con `src/lib/handicap/course.ts` y marcados "estimado"; `Notice warn` si hay Hoyos no terminados) → "Firmar" `pending` → panel de éxito (rueda antes → después, `haptics.success`) → "Listo"; estado local + `router.refresh()`. Desfirmar desde el menú de la tarjeta → `ConfirmSheet` con motivo.
- Foto: `Button secondary Camera` "Foto de la tarjeta" + miniaturas de 56 px (abren en `Dialog`); pasos en `Sheet`: 1 "Subiendo la foto" (Spinner + preview), 2 "Leyendo la tarjeta" (Spinner, "Suele tardar 10–20 segundos", contador), 3 "Revisá" (`Select` de golfista por fila, dos filas de `CellInput` 1–9 / 10–18, dudosos con anillo warn punteado y contador, "Suma 87, en la tarjeta dice 86" solo si difieren, opción "(ignorar)"), 4 "Cargar golpes" `pending` → cierra, toast, haptic, mezcla las filas en el estado de `RoundScoring` (arregla el `useState(card.scores)` que hoy no se actualiza) + `router.refresh()`. "Descartar" descarta la lectura (la foto ya quedó guardada: se dice).
- Estados: skeleton, not found, sin rating, error de guardado con rollback, `Notice` de tarjeta histórica.
- Verificación: secciones `focus`/`scorecard` del playground en ambos temas; en el teléfono: anotar 18 hoyos con una mano, swipe, firmar con 2 Hoyos no terminados, desfirmar con motivo, foto real de punta a punta, link `?j=` desde Golfista sigue eligiendo la tarjeta.

**5.2 Inicio `(app)/page.tsx`** — `Board` con `BoardNumber xl animate` (`name="hcp-index"`), etiqueta "Hándicap Index" / "Hándicap declarado" / "Sin hándicap todavía" + "12 tarjetas firmadas" o "Te faltan 2 tarjetas firmadas" con progreso de 3 puntos; tendencia contra el punto anterior de `history` (`TrendingDown` en primary = mejoró). `Button` "Nueva partida" bajo la pizarra (se va de la cabecera). `Notice warn` de tarjeta sin firmar con acción (los datos ya están en la consulta). `Section` Grupos (`ListRow` + cantidad de miembros de `listMyGroups`), `Section` Últimas partidas (`RoundRow` ×5, "Ver todas"). Vacíos con dirección. `reveal.tsx`. Verificación: preview y teléfono; reveal una vez por sesión.

**5.3 Grupo `(app)/grupos/[id]/`** — acción de cabecera `DropdownMenu` (Compartir link, Copiar; admin: Generar otro, Revocar; Salir del grupo): `invite-panel.tsx` y `member-actions.tsx` se reescriben en `group-menu.tsx` + `invite-section.tsx` (link en texto plano + Compartir/Copiar, toasts). `Board` → `Leaderboard` (puesto, `Initials`, nombre con link, `BoardNumber lg`, tendencia, badge "declarado", yo teñido). "Nueva partida" primario con `?grupo=`. `Section` Evolución → `IndexChart` arreglado: ancho por `ResizeObserver`, etiquetas de 12 px fijas, `touch-action: pan-y`, readout por tap/arrastre, colores desde `--chart-1..5` (se quita el `<style>` inline), mi serie a 2,5 px, vacío "Con 3 tarjetas firmadas aparece la evolución". "Comparación" → `DataGrid` con reglas (Hcp / Prom. / Últ. 5 / Mejor / Tarjetas, numerales condensados). "Últimas partidas" `RoundRow` filtradas a miembros. Skeleton. Verificación: pizarra de 5 entra en 360 px; el gráfico deja scrollear la página; acciones del menú con toasts.

**5.4 Golfista `(app)/golfistas/[id]/`** — hero `BoardNumber xl` + etiqueta + tendencia; tira de 3 stats (Promedio "91 (+20)", Mejor, Últimas 5) en vez de la grilla 3×2; gráfico; "Cara a cara" con `ToggleGroup` de rivales (`Initials` + nombre) → panel con dos `BoardNumber md`, "3 ganó, 1 empató, 2 perdió" como tres números etiquetados, partidas compartidas en `ListRow` con el gross menor en primary; "Tarjetas firmadas" en `ListRow` (cancha, fecha, badge "histórica", gross + toPar `Badge under|over`). Volver siempre (hoy solo si sos vos). Skeleton, vacíos. Verificación: `?vs=` por link; yo vs otros.

**5.5 Partidas `(app)/partidas/page.tsx`** — agrupadas por mes (`Section` "Septiembre 2026"), `RoundRow` (chips "Bauti 84 ✓", "Manu —"; mi tarjeta sin firmar → `Badge warn`); acción de cabecera ícono `Plus`; `EmptyState` con CTA; skeleton. Verificación: 100 partidas sin saltos de layout; meses correctos con `date_approximate`.

**5.6 Nueva partida `new-round-form.tsx`** — `Field` + `Select` Cancha (club como texto secundario); `TeeChip` en `ToggleGroup` con `Notice warn` si no hay CR/Slope; `Input type="date"`; `ToggleGroup` Hoyos (18 / Ida / Vuelta) o Vueltas (Ida y vuelta / Una vuelta) en canchas de 9; jugadores como `ListRow` con `Checkbox`, `Initials`, badge "Vos"; invitados en filas (`Input` nombre, `Input` hcp `inputMode="decimal"`, botón `X`) + ghost "Agregar invitado"; `Textarea` Notas opcional (la columna `notes` y `createRound` ya lo soportan: solo UI); `Button pending` "Crear partida" fijo abajo con el motivo si está deshabilitado; errores inline de `fields`; `?grupo=` preselecciona a los miembros del grupo (hoy solo reordena). Verificación: crear con invitados; mensajes en español; cancha de 9.

**5.7 Canchas** — lista en `ListRow` (nombre; club y ciudad en dos spans; puntos de `TeeChip` + "18 hoyos"), `EmptyState` "Cargar la primera cancha"; detalle con `Badge`s (18 hoyos, par 71, vigente desde…, N versiones), tees en `ListRow` (`TeeChip`, "CR 70,3 / Slope 125", metros), `ScorecardGrid mode="course"` (Hoyo/Par/Hcp + una columna de distancias por tee con el punto de color en la cabecera; Ida/Vuelta/Total); "Editar" → `Notice` sobre versiones. `course-form.tsx`: "Leer la tarjeta del club" `Button secondary Camera` con `pending` "Leyendo…" y las notas del modelo en `Notice info` (hoy van al banner rojo); campos con `Field/Input/Select`; grilla de hoyos con `CellInput` (par como `Select` compacto); tees como filas con reglas; `SubmitButton` "Crear cancha / Guardar nueva versión"; errores por celda. Verificación: prefill por foto; alta y nueva versión.

**5.8 Perfil `(app)/perfil/`** — `Section` "Tu hándicap": dos `BoardNumber md` (Calculado por Galf / Declarado (AAG)) con badge "en uso" y la línea de cantidad; `declared-handicap-form.tsx`; `ClaimGuest` como `ListRow` + `ConfirmSheet` + toast; `display-name-form.tsx`; `Section` "Apariencia" con `ToggleGroup` Sistema / Claro / Oscuro (`useTheme`, localStorage); "Cerrar sesión" como `Button secondary` al final (no es destructivo). Verificación: toasts, el tema persiste entre lanzamientos, el `theme-color` acompaña.

**5.9 Login** — `BrandReveal` + `GoogleButton` + `Notice error` + pie "Solo para el grupo". Verificación: `?next=` se conserva; reduced motion.

**Cierre de la Fase 5:** borrar `src/components/shell.tsx` y `src/components/ui/legacy.tsx`; `rg "ui/legacy|components/shell" src` vacío.

### Fase 6 — Accesibilidad, rendimiento, documentación

- **Foco y ARIA:** `focus-visible` en todas las primitivas; `ListRow` con `href` es un `Link` real; stepper y tira de hoyos por teclado (flechas, +/−); los sheets atrapan y devuelven el foco; nav `aria-current`; `ScoreMark` con `aria-label`; `SaveStatus` y totales `aria-live="polite"`; ranking como `<ol>`; el gráfico conserva `role="img"` + título y la alternativa "Ver tabla".
- **Auditorías:** `pnpm contrast` en el CI local de cada fase; opcional `@axe-core/playwright` sobre `/dev/playground` y `/login` (`pnpm a11y`); pasada de capturas con `reducedMotion: "reduce"`.
- **Bundle:** comparar la tabla de `next build` con el baseline de la Fase 0; presupuesto para `/partidas/[id]` ≤ 150 kB gz de first-load JS (LazyMotion ≈ +6, NumberFlow ≈ +8, sonner ≈ +8, lucide tree-shaken); quitar `tw-animate-css` si no queda ninguna clase de animación de shadcn en uso.
- **Documentación:** `DESIGN.md` (fuente de verdad), `docs/design.md` (puntero), `docs/adr/0004-lenguaje-visual-tarjeta-y-pizarra.md` (un párrafo: la gramática de la tarjeta y la pizarra en vez de "verde club" o kit SaaS; shadcn sobre Base UI como capa de primitivas re-estilada por tokens; movimiento reservado a un reveal y a cambios disparados por el usuario), `docs/roadmap.md` (nueva "Fase 4 — Rediseño UI/UX" con hecho / pendiente y la lista "requiere DB"), `docs/handoff.md` (dependencias, `pnpm screenshots | contrast | lint:tokens`, playground y `GALF_PLAYGROUND` en Preview, Impeccable, next-themes, regla de `isPublicPath`, assets PWA), `CLAUDE.md` (orden de lectura), README (playground), `.env.example`.
- **Crítica:** `/impeccable audit` y `/impeccable critique` sobre Inicio, Partida y Grupo; plugin "Design" si lo habilitás (`design-critique`, `accessibility-review` sobre el set de capturas); skill `code-review` del repo antes de proponer el merge. Lo barato se arregla; el resto va al roadmap.
- PR contra `claude/vigilant-bardeen-6iwzid` **solo si lo pedís**.

## Verificación global

```bash
pnpm typecheck && pnpm lint && pnpm lint:tokens && pnpm test && pnpm build   # lo de Vercel + puertas propias
pnpm contrast                                                                # tokens claro/oscuro (desde Fase 1)
pnpm screenshots                                                             # /login y /dev/playground, claro/oscuro/reducido
rg -n "confirm\(|uppercase tracking|rounded-2xl|ui/legacy|components/shell" src   # vacío al cerrar la Fase 5
```

Límites del sandbox: acá solo renderizan `/login` y `/dev/playground`; las pantallas con datos se verifican en el preview de Vercel (con `GALF_PLAYGROUND=1` en Preview para revisar componentes) y en tu teléfono. El proxy de estas sesiones bloquea `vercel.app`: los previews se miran desde el teléfono o por el conector de Vercel.

Checklist en el teléfono (iOS Safari y Android Chrome), por fase: agregar a inicio (ícono, splash claro/oscuro, barra de estado), login con Google, modo oscuro del sistema y el override de Perfil, haptics en Android (stepper, firma), legibilidad al sol del numeral y de la pizarra a un brazo de distancia, alcance con una mano del stepper y de Firmar, volver tras link profundo y tras navegar, guardado de hoyo en modo avión con rollback, foto de una tarjeta real, `/unirse/<code>` pide el toque.

## Riesgos y preguntas abiertas

- `shadcn init` reescribe `globals.css` y puede preguntar distinto a lo documentado (`--base base`, presets): commit antes, reconciliar a mano; `style`/`baseColor` de `components.json` son inmutables después.
- Base UI y la 1.x de lucide pueden diferir de lo recordado: verificar el código generado (polimorfismo con `render`, no `asChild`) y los nombres de íconos contra el `.d.ts`; pinear versiones y no actualizar a mitad de proyecto.
- Figuras tabulares de la familia elegida: verificadas en la Fase 1; opciones B/C listas. Google Fonts puede estar bloqueado en el build del sandbox → `next/font/local`.
- El morph de View Transitions rara vez se empareja en rutas dinámicas (documentado); la transición real es el reveal de Suspense.
- Haptics en iOS sin verificar (flag apagado); la vibración en Android depende de la configuración del sistema.
- `black-translucent` puede necesitar volver a `default`.
- `/unirse` cambia de comportamiento (toque explícito; también evita uniones accidentales por prefetch).
- El move al route group es un rename grande: un solo commit con `git mv`.
- Abiertas: 5 pestañas vs Canchas dentro de Perfil (revisar tras un mes de uso); si "Neto" debe estimarse con Hoyos no terminados (regla actual conservada); si la pizarra del grupo debe ignorar hándicaps declarados (conservado: valor efectivo).

## Excluido: requiere tocar la base (te aviso antes si alguna vez lo querés)

- `peek_invite(code)` (RPC security definer) para mostrar el nombre del grupo en `/unirse` antes de unirse.
- Notificaciones "te cargaron golpes, falta tu firma" (roadmap Fase 3).
- Preferencias de usuario en el servidor (el tema queda en localStorage).
- Manejo de conflictos entre dos teléfonos anotando la misma tarjeta (hoy gana la última escritura).
- Estadísticas del grupo agregadas en una consulta (una vista): innecesario con 5 usuarios.
- Ranking por cancha, Stableford / match play, edición de obstáculos, vincular invitado desde el grupo (roadmap Fase 3).
- Cambiar la firma de `unsign_scorecard`: no hace falta, `p_reason` ya existe.
