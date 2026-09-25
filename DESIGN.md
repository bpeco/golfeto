# Galf — lenguaje visual "tarjeta y pizarra"

Fuente de verdad del diseño. Contexto de producto en `PRODUCT.md`; decisión de fondo en `docs/adr/0004-lenguaje-visual-tarjeta-y-pizarra.md`; plan de implementación en `docs/plans/2026-09-25-rediseno-ui-ux.md`. Si algo de acá choca con el código, gana este archivo y se arregla el código (o se actualiza esto con el motivo).

## Estado de las decisiones

| Puerta | Decisión | Estado |
|---|---|---|
| **Puerta 1** (fin de la Fase 1) | **Variante A** "tarjeta y pizarra" (el brief tal cual: papel teñido + pizarra verde en exactamente dos lugares) y **tipografía A** (Sofia Sans + Sofia Sans Extra Condensed) | **PROVISIONAL** — la tomó el agente con la opción recomendada porque el dueño no estaba (2026-09-25). Revisar en el teléfono: `/dev/playground?variant=A`, `?variant=B`, `?variant=C` en el preview de Vercel (sección "Variante: Partida" y "Variante: Inicio"). Si se elige B o C, o una mezcla, se cambia acá y en el roadmap |
| **Puerta 2** (fin de la Fase 5) | Partida real de prueba con la PWA instalada | **PENDIENTE del dueño**; sin ajustes hasta que se juegue. Ver checklist en `docs/roadmap.md` |

Otras decisiones provisionales del agente (revisar en el teléfono; cada una tiene su motivo en la sección correspondiente): `statusBarStyle` `default` y no `black-translucent` en iOS; haptics de iOS apagados (`NEXT_PUBLIC_GALF_IOS_HAPTICS`); animaciones en CSS y sin `motion`; menú ⋯ como hoja desde abajo (`ActionMenu`); `Select` nativo; tamaños `text-numeral*`.

Por qué A: es la que sale del brief y de las reglas de los skills (un elemento memorable por pantalla, el resto callado); B (todo pizarra) pierde legibilidad al sol en modo claro y convierte la app en "negro con acento", uno de los clusters de IA genérica; C (todo papel) resuelve bien la tarjeta pero deja el índice sin peso y la Partida sin foco para una mano. Tipografía: A es la única de las tres con figuras tabulares verificadas en las dos caras (el playground mide `1111,1` contra `8888,8`); Big Shoulders (C) no tiene `tnum` y Archivo (B) funciona pero su ancho condensado depende del eje `wdth`.

Las variantes B y C quedan en el playground (`src/app/dev/playground/variants.tsx`) hasta que el dueño confirme; al confirmar, se borran (quedan en el historial de git).

## Principios

1. **Un objeto por pantalla.** Login: el círculo de lapicera dibujándose alrededor de la G. Inicio: el Hándicap Index en la pizarra. Partida: el numeral gigante con su marca sobre el stepper. Grupo: el ranking en la pizarra. Lo demás es tinta sobre papel con reglas, sin cajas.
2. **Significado sin depender del color.** Birdie y bogey se leen por la forma (círculo, cuadrado); el color solo refuerza. Toda badge lleva texto o ícono + texto.
3. **Pensado para la cancha.** Una mano, sol, guantes: números grandes, contraste alto (numerales de pizarra ≥ 7:1), targets ≥ 44 px, stepper de 56 px en la zona del pulgar.
4. **Feedback en cada acción.** Pendiente, éxito, error y vacío tienen forma propia; ningún error se traga.
5. **Movimiento con motivo.** Una secuencia orquestada (login); después, solo movimiento disparado por el usuario que muestra qué cambió.

## Color

Tres capas en `src/app/globals.css`:

1. **Marca** (crudas, nunca en componentes): `--papel`, `--pizarra`, `--tinta`, `--pasto` (el único verde, chroma ≤ 0.13), `--rojo` (lapicera: bajo par y destructivo), `--azul` (sobre par), `--ambar` (dudoso, Hoyo no terminado).
2. **Roles** con los nombres de shadcn (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`) + propios: `surface-raised` (solo sheet, diálogo, toast), `line-strong` (regla después del hoyo 9, marco de la grilla), `board` / `board-foreground` / `board-muted` / `board-under` / `board-over` (la pizarra), `score-under` / `score-over`, `warn` / `warn-foreground` / `warn-ink`, `tee-*`, `chart-1..8` + `chart-grid`, `scrim`.
3. **Componente:** clases de Tailwind sobre los roles.

Significados que cambiaron respecto del MVP: `muted` es un **fondo** (el texto atenuado es `muted-foreground`); `accent` es el **tinte de hover y de fila activa**, no la marca (la marca es `primary`); `surface` pasó a `card`.

Claro: papel teñido `oklch(0.972 0.008 120)` (hue 120, no crema), tinta verde-negra. Oscuro: pizarra `oklch(0.21 0.018 160)`. La pizarra (`--board`) es verde profundo en claro y `card` en oscuro; adentro de una `Board`, `score-under`/`score-over`/`muted-foreground` se redefinen a las variantes legibles sobre verde.

**Contraste** (`pnpm contrast`, falla si algo no llega): tinta/página ≥ 12:1; metadatos ≥ 4,5:1; numerales de pizarra ≥ 7:1; bajo/sobre par ≥ 4,5:1 sobre card y página; botón primario y aviso ≥ 4,5:1; foco ≥ 3:1. Si algo falla se ajusta L, nunca chroma por encima de 0.19. Nada de negro, blanco ni gris puros (`pnpm lint:tokens` los prohíbe en clases).

Tendencia del índice (`Trend`): bajar (mejorar) va en `score-under` y subir en `score-over`, como los números bajo y sobre par de un leaderboard de golf. **Desvío del plan**, que pedía `primary` para "mejoró": el verde de `primary` no se lee sobre la pizarra verde. Provisional, a revisar con el grupo.

Para lo que no lee CSS (theme-color, manifest, íconos, splash) los hex están en `src/lib/theme-colors.ts`, sacados de `pnpm contrast -- --json`.

## Tipografía

- **Texto:** Sofia Sans (variable), `--font-text` → `font-sans`.
- **Numerales, golpes, pizarra y wordmark:** Sofia Sans Extra Condensed 600–800, `--font-numerals` → `font-display`. Siempre `tabular-nums` (`.font-display` lo fuerza).
- Roles: cuerpo 16/1,5; pequeño 14; caption 12 (**nada por debajo de 12 px**); título de página 20/600; encabezado de sección 16/600 en sentence case; inputs ≥ 16 px (iOS no hace zoom).
- Numerales: `text-numeral` 28, `text-numeral-lg` 40, `text-numeral-xl` 72 (hero del Inicio), `text-numeral-2xl` 96 (golpes del modo foco). **Desvío del plan:** el plan los llamaba `text-board*`, pero `text-board` ya es el color de la pizarra y Tailwind generaría las dos cosas; `cn()` (tailwind-merge extendido) los conoce como tamaños.
- Mayúsculas sostenidas solo en IDA / VUELTA / TOTAL de la grilla.

## Espacio, radio, sombra

- Escala de 4 px. `tap` = 44 px (mínimo interactivo: `h-tap`, `size-tap`, `min-h-tap`), `thumb` = 56 px (stepper). Gutter 16, entre secciones 32, dentro 12.
- Radio base 0,5 rem: `rounded-sm` celdas e inputs, `rounded-md` chips y botones, `rounded-xl` solo sheet, toast, diálogo y pizarra, `rounded-full` solo stepper, iniciales y puntos. **Sin `rounded-2xl`.**
- Sombra: `shadow-raised` únicamente en sheet, toast, menú y las barras fijas de abajo (totales de la Partida, "Crear partida"). Las listas y grillas usan reglas (`border-b border-border`; `border-line-strong` después del hoyo 9). Sin gradientes; la textura es la grilla.

## Movimiento

- Duraciones: 120 ms estado (press, toggle), 200 ms enter/exit chico, 240 ms cambio de hoyo, 320 ms sheet, 600 ms rodar de número; reveal de login ≤ 1,1 s. `ease-out` = `cubic-bezier(0.2, 0, 0, 1)`. Sin rebote.
- Única secuencia orquestada: login. El Inicio tiene un stagger silencioso una vez por sesión.
- Disparado por el usuario: el numeral del stepper, `ScoreMark` dibuja su marca (250 ms), el hoyo desliza según la dirección, la firma rueda el índice de antes a después, toasts.
- Nunca: hover en touch, shimmer (los skeletons pulsan lento, 1,6 s), animar listas al navegar.
- Esperas largas (leer una foto, 10–30 s): los pasos reales con el actual marcado y un texto fijo de cuánto suele tardar. **Nunca un contador de segundos** ni nada que cambie cada segundo: alarga la espera y obliga a mirarla.
- Todo en **CSS** (`src/app/globals.css`): reveal del login y del primer Inicio, `.hole-in-next` / `.hole-in-prev` (cambio de hoyo), `.score-draw` (la marca de `ScoreMark`, `pathLength="1"` y `stroke-dashoffset`), crossfade de ruta con `<ViewTransition>`. El bloque `prefers-reduced-motion` al final de `globals.css` las anula todas; si se agrega una animación, se agrega ahí. **Desvío del plan (Fase 6):** el plan pedía `motion` con `LazyMotion`; se quitó porque sumaba ~11 kB al primer JS de cada ruta y lo único que animaba (la marca y el cambio de hoyo) sale igual en CSS. El único numeral que rueda es `AnimatedBoardNumber` (NumberFlow, que respeta la preferencia solo y se baja aparte).

## Notación de la tarjeta

`src/lib/score-notation.ts` + `ScoreMark`:

| Resultado | Forma | Tono |
|---|---|---|
| eagle o mejor (y hoyo en uno) | doble círculo | `score-under` |
| birdie | círculo | `score-under` |
| par | sin marca | tinta |
| bogey | cuadrado | `score-over` |
| doble bogey o peor | doble cuadrado | `score-over` |
| Hoyo no terminado | barra, sin número (nunca la palabra "X") | `warn-ink` |

Golpes recibidos: puntitos (`StrokeDots`), 1–3; desde 4, "×4"; huecos si el hándicap es plus y se dan golpes. Colores de tee: `src/lib/tee-color.ts` reconoce blancas, azules, amarillas (y doradas), rojas, negras, verdes; el blanco lleva borde de tinta.

## Componentes

Todo en `src/components/ui/`. Los de forma shadcn se escribieron a mano sobre `@base-ui/react` 1.8 (el CLI de shadcn no pudo bajar el registro: `ui.shadcn.com` está bloqueado en las sesiones de Claude); `components.json` queda listo para `shadcn add` desde una red libre, pero lo que haya se re-estila a mano: es nuestro.

- **Base:** `Button` (`default | secondary | ghost | destructive | destructive-outline | link`; `sm` 36, `default` 44, `lg` 52, `icon` 44; prop `pending` con spinner que conserva el ancho; `buttonVariants` para links), `Input`, `Textarea`, `Label`, `Field` (etiqueta + ayuda + error; el control toma `id`/`aria-describedby`/`aria-invalid` del contexto), `Select` (**nativo** a propósito: en el teléfono abre el selector del sistema; desvío del plan), `Checkbox`, `ToggleGroup` / `Segmented` (siempre uno elegido), `Sheet` (sobre el Drawer de Base UI: se cierra deslizando), `Dialog` (solo para ver fotos), `DropdownMenu` (queda en el kit y el catálogo; la cabecera usa `ActionMenu`), `Badge` (`neutral | outline | under | over | warn | signed | guest | destructive`), `Separator`, `Skeleton`, `Spinner`, `Toaster` (sonner arriba al centro, 3 s; se llama con `toast` de `@/lib/toast`, nunca de `"sonner"`: así sonner no entra en el primer JS).
- **Propios:** `PageHeader` + `BackButton` (vuelve con el historial si es de la app; si no, a la ruta padre), `BottomNav` (5 pestañas), `Section`, `List` / `ListRow`, `RoundRow`, `Board` / `BoardLabel` / `BoardNumber` (estático, sin JS) / `AnimatedBoardNumber` (rueda), `Leaderboard` + `Trend`, `ScoreMark`, `StrokeDots`, `Stepper`, `TeeChip` / `TeeDot`, `Initials`, `ScorecardGrid` (modo golpes y modo cancha), `CellInput`, `Notice` (`info | warn | error | success`; reemplaza al ErrorBanner), `EmptyState`, `SubmitButton`, `SaveStatus`, `LinkPending` (velo de navegación pendiente), `ActionMenu` + `ActionSheet` (el menú ⋯ de la cabecera: hoja de acciones desde abajo con filas de 56 px, en la zona del pulgar; **desvío del plan**, que pedía un `DropdownMenu` arriba a la derecha), `ConfirmSheet` (vía `useConfirm`).
- **Carga diferida:** lo que se abre por una acción (confirmación, hoja de acciones, firma, pasos de la foto, visor de fotos, miembros del grupo) se baja con `next/dynamic` al abrirlo o en un momento libre, no con la página. Se monta la primera vez que se abre y queda montado para que se vea la animación de salida.
- `ui/legacy.tsx` (puente temporal de la Fase 1) se borró en la Fase 5.

Catálogo vivo con todos los estados: `/dev/playground` (en desarrollo y en los Preview de Vercel).

## Copy

Rioplatense, sentence case, vocabulario de `CONTEXT.md`. Mismo verbo en todo el flujo: Firmar → Firmando… → Firmada; Cargar golpes → Cargando… → "Cargamos 36 golpes en 2 tarjetas"; Crear partida → Creando…. Sin "·" para encadenar metadatos: dos líneas, etiqueta/valor o chips; el único separador permitido es el de una frase fija de golf ("CR 70,3 / Slope 125"). Vacíos con dirección y el botón adentro. Errores con causa y salida. Coma decimal en pantalla ("21,3"); fechas "12 sep" / "aprox. 12 sep" (`src/lib/format.ts`). "Invitado" como badge.

## Prohibido (y cómo se controla)

`pnpm lint:tokens` falla con: `text-muted` sin `-foreground`, `bg-surface`, `text-accent`/`border-accent`, colores de la paleta de Tailwind (`red-600`…), blanco/negro puros, texto de menos de 12 px, Geist, `rounded-2xl`, sombras de kit (`shadow-sm`…), eyebrows `uppercase tracking-wide`. Además, por revisión: cards anidadas, gradientes, emoji como ícono (lucide), `confirm()` nativo, `?ok=`/`?error=` como feedback (única excepción: `/login?error=auth`, que pone el callback de OAuth), metadatos con "·".

## Abierto

- 5 pestañas vs. Canchas dentro de Perfil (revisar tras un mes de uso).
- Si "Neto" debe estimarse con Hoyos no terminados (hoy: solo con todos los hoyos con golpes).
- Si la pizarra del grupo debe ignorar los hándicaps declarados (hoy: usa el efectivo y lo marca "declarado").
- Haptics en iOS: la web no los expone; queda solo Android.
