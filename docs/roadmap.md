# Roadmap y pendientes

Estado vivo del proyecto. Se actualiza al cerrar cada sesión. Las decisiones de diseño están en `docs/adr/`; el vocabulario en `CONTEXT.md`; el estado de infraestructura en `docs/handoff.md`.

## Fase 0 — Diseño (hecha, 2026-09-24)

Sesión de grilling: alcance, stack, modelo de dominio, WHS, canchas, fotos, firma, historial. Resultado: `CONTEXT.md`, ADR-0001..0003, `docs/db-design.md`.

## Fase 1 — MVP (hecha, 2026-09-25)

- [x] Login con Google, PWA, UI en español
- [x] Grupos, link de invitación, admin
- [x] Canchas versionadas (editor manual + lectura de la tarjeta del club por foto)
- [x] Partidas (18 / ida / vuelta / 9×2), miembros e invitados
- [x] Golpes hoyo por hoyo, hoyo no terminado, neto en vivo
- [x] Foto de la tarjeta de papel → filas → mapeo a jugadores → carga
- [x] Firma / desfirma con snapshot WHS
- [x] Motor WHS con tests (`src/lib/handicap/`)
- [x] Página de golfista (evolución, cara a cara), comparación del grupo
- [x] Historial importado; reclamo de invitado desde Perfil
- [x] Deploy en Vercel (producción en `golfeto.vercel.app`)

## Fase 2 — Validación con el grupo (en curso)

Objetivo: que los 5 usen la app en una partida real.

- [x] Login con Google en producción con la cuenta del dueño (2026-09-25)
- [x] Arreglado: crear/ver un grupo daba "Not found". 0002 había revocado `EXECUTE` de los helpers de RLS y toda lectura de grupos/partidas/tarjetas y toda escritura auditada daba 403. Migración 0004 (helpers a `private`); probado como usuario: grupos, alta de cancha, partida con invitado, golpes, firmar/desfirmar, reclamo
- [x] Arreglado: Perfil → "¿Sos alguno de estos?" nunca aparecía (RLS escondía las tarjetas del historial importado y el conteo daba 0). Migración 0005 (`claimable_guests`) + `src/app/perfil/page.tsx`
- [x] Arreglado: tras aplicar la foto de la tarjeta la grilla seguía vacía (los golpes sí se guardaban). `ScoreGrid` copia los golpes a estado local y el refresh no la remontaba; ahora la key incluye la huella de los golpes (el rediseño reemplazó esa pantalla; ahí lo resuelve `syncFromServer`). Primera foto real (tarjeta del dueño, 1 jugador) leída bien
- [x] Arreglado (WHS): sin Hándicap Index la firma calculaba con índice 0 y topeaba cada hoyo a net double bogey (par + 2 − 1). Regla 3.1b: hasta tener Index el tope es **par + 5**. `adjustedGrossScore` acepta `courseHcp = null`; lo usan la firma y el estimado de la hoja de firma (`sign-estimate.ts`). Tarjeta de prueba del dueño (gross 123): ajustado 98 → 119, diferencial 25.0 → 44.0
- [x] Firmar sin querer (la tarjeta de prueba se firmó con un toque en la UI vieja): el rediseño firma desde una hoja con el resumen estimado, que hace de confirmación
- [ ] Verificar el login con Google en producción con otra cuenta (no solo la del dueño). Google Cloud está en *Testing*: agregar los mails como *Test users* o apretar *Publish app*
- [x] Dados de baja los dos grupos "Golfeto" creados durante el bug (2026-09-25); el dueño vuelve a crear el grupo
- [ ] Cargar la **tarjeta real de Miraflores** (par por hoyo, hándicap de hoyo, distancias, CR/Slope por tee) → versión nueva. El layout actual es provisional (ver `docs/handoff.md`). La búsqueda web no alcanzó: el proxy de la sesión bloquea los sitios con la tarjeta (golfpass, hole19, mscorecard, aag.org.ar). Lo único encontrado (snippets): par 71, 6287 yd, CR 70.3 / Slope 125 según GolfPass, sin color de tee. Camino: foto de la tarjeta física del club → "leer tarjeta" en Editar cancha
- [ ] Ídem Los Cedros (CR/Slope no publicados: si no aparecen, dejar los de Miraflores como aproximación declarada). Búsqueda web cancelada; mismo camino: foto de la tarjeta
- [ ] Cada amigo entra por el link y reclama su historial (Agus, Manu, Javo; Fava no tiene)
- [ ] Probar la lectura de una foto real de tarjeta escrita a mano; ajustar el prompt si confunde columnas (OUT/IN/TOT) o nombres
- [ ] Pasar la rama de producción a `main` (crear `main`, default en GitHub, Production Branch en Vercel)

## Fase 3 — Pulido (después de la primera partida real)

Ideas surgidas del diseño, no comprometidas. Priorizar según lo que pida el grupo.

- [ ] Ranking por cancha
- [ ] Stableford y match play como formatos (el modelo ya tiene `round_formats`)
- [ ] Editar hándicap de hoyo/obstáculos desde la app (hoy: solo par, SI, distancias; `hole_hazards` existe sin UI)
- [ ] Proyección "qué tenés que hacer hoy para bajar el hándicap" (diferenciador; nadie lo hace bien)
- [ ] Notificación cuando te cargan golpes y falta tu firma
- [ ] Vincular invitado ↔ golfista desde el grupo (hoy solo desde el propio Perfil)
- [ ] Importar canchas en bulk (golfapi.io CSV) si se quiere "todas las de Argentina"
- [x] Ícono y splash propios → hecho en el rediseño (Fase 4 del plan, 2026-09-25)
- [ ] Tests de integración contra Supabase (RLS, firmas, cascadas) — hoy validado a mano por el subagente de DB

## Fase 4 — Rediseño UI/UX "tarjeta y pizarra" (Fases 0–6 hechas y **en producción** el 2026-09-25; falta la Puerta 2)

Plan completo: `docs/plans/2026-09-25-rediseno-ui-ux.md` (contexto, decisiones, brief de diseño, arquitectura, fases, verificación). Rama de trabajo `claude/sleepy-wozniak-v86mqg`; pasa a producción (`claude/vigilant-bardeen-6iwzid`) por fast-forward y solo a pedido del dueño. **Sin cambios en la base de datos**: lo que los necesite queda en "Requiere DB" más abajo. Si el dueño no está para las puertas de decisión, se toma la opción recomendada (variante A, tipografía A) y queda como provisional en `DESIGN.md`.

- [x] Fase 0 — preparación (2026-09-25): merge de producción (ya no era fast-forward: la rama tenía el commit del plan), `pnpm typecheck` corre `next typegen` antes de `tsc` (sin `.next` fallaba por `LayoutProps`), `.env.example`, `pnpm bundle` + baseline en `docs/perf/bundle-baseline.md`, `pnpm screenshots` (playwright-core 1.56.1), playground `/dev/playground` con fixtures, `isPublicPath` (adelantado de la Fase 4), `PRODUCT.md`. `shadcn init` quedó para la Fase 1 (es donde el plan lo usa). **Impeccable no se pudo instalar**: el proxy de la sesión devuelve 403 al bajar el bundle firmado de skills y `impeccable.style` está bloqueado; `PRODUCT.md` se escribió a mano y el detector (`npx impeccable detect`, del paquete npm) sí corre. **El conector de Vercel da 403** en el team del proyecto: no se pudo setear `GALF_PLAYGROUND` en Preview; en su lugar el playground se habilita solo con `VERCEL_ENV=preview`
- [x] Fase 1 — fundamentos (2026-09-25): tokens OKLCH en tres capas (claro y oscuro, `pnpm contrast` en verde), Sofia Sans + Sofia Sans Extra Condensed, primitivas de forma shadcn **escritas a mano sobre `@base-ui/react` 1.8** (el CLI de shadcn no puede bajar el registro: `ui.shadcn.com` da 403 en el proxy; `components.json` queda listo) y primitivas propias (ScoreMark, Stepper, ScorecardGrid, Board, Leaderboard, …), `src/lib/format.ts` / `score-notation` / `tee-color` / `scorecard-totals` con tests, `ui.tsx` retirado (queda `ui/legacy.tsx` temporal), clases migradas, `pnpm lint:tokens`, playground con todas las secciones y las 3 variantes. Desvíos del plan: tamaños `text-numeral*` en vez de `text-board*` (chocaban con el color `board`); `Select` nativo en vez del de Base UI (mejor en el teléfono); `bg-accent` permitido (es el tinte de hover); `/impeccable shape` no se pudo correr (skill no instalado)
- [x] **Puerta 1 — PROVISIONAL** (decidida por el agente con la opción recomendada, 2026-09-25): **variante A** "tarjeta y pizarra" + **tipografía A**. El chequeo tabular del playground descarta la C (Big Shoulders no tiene cifras tabulares). **Para revisar:** abrir `/dev/playground?variant=A|B|C` en el preview y confirmar o pedir cambios; al confirmar, borrar B y C de `src/app/dev/playground/variants.tsx`
- [x] Fase 2 — shell y navegación (2026-09-25): route group `(app)` (URLs iguales, `git mv` en un commit) con `BottomNav` de 5 pestañas que ya no se remonta, `PageHeader` fijo con safe area y `BackButton` (historial propio o ruta padre), `/grupos` nuevo con `listMyGroups` (también en Inicio), skeletons (`(app)`, partidas, partida, grupo, golfista, canchas), `error.tsx` con `retry` e "Ir al inicio", `not-found` global y dentro del marco, títulos en todas las pantallas (`generateMetadata` con lecturas en `cache()`), crossfade de ruta con `<ViewTransition default="page">` en el layout (barra anclada, anulado con reducir movimiento), velo de navegación pendiente en pestañas y filas (`useLinkStatus`, 120 ms). Desvíos: no se puso `enter="rise"` por página (el crossfade del layout ya cubre el reveal de Suspense); `/partidas/nueva` sigue con su consulta (necesita los miembros, no solo la cantidad). No verificable en esta sesión: pantallas con datos (sin Supabase acá) → preview
- [x] Fase 3 — feedback (2026-09-25): `ActionResult` + `fromZod` + `friendlyDbError` (las excepciones propias de la base pasan prolijas; RLS/red/sesión/unicidad traducidas), zod en español con mensajes por campo, `useActionState` en Nuevo grupo, Perfil (hándicap declarado y nombre, sin `?ok`/`?error`), `/unirse/<code>` ahora pide el toque "Unirme" (ya no se une al abrir el link ni en el prefetch), toasts en link de invitación, sacar/salir, "Soy yo", foto ("Cargamos N golpes en M tarjetas"), flash por cookie para los mensajes después de un redirect, `ConfirmSheet`/`useConfirm` (0 `confirm()` nativos), **desfirmar con motivo** (`p_reason`, ya existía), hoja de firma con el resumen estimado y el índice que rueda de antes a después, autosave por hoyo con rollback y "Reintentar" (Firmar deshabilitado mientras haya cambios sin guardar; se vacía al ocultar la app), haptics en Android y el truco de iOS detrás de `NEXT_PUBLIC_GALF_IOS_HAPTICS` (apagado). Perfil ya quedó con su diseño final. Para probar en el teléfono: modo avión → cambiar un hoyo → vuelve al valor anterior con toast "No se guardó el hoyo N" y Reintentar
- [x] Fase 4 — arranque y marca (2026-09-25): marca = G en Sofia Sans Extra Condensed 800 dentro del círculo de lapicera del birdie (`src/lib/brand.ts`, `BrandMark`, `BrandArt`; TTF OFL en `src/app/icons/_fonts/`), `icon` 512, `apple-icon` 180, `/icons/{192,512,maskable-192,maskable-512}` y 20 splashes de iOS (`/splash/<w>x<h>-light|dark`, `src/lib/pwa/devices.ts`) todos estáticos en el build; manifest con id/scope/orientation/categories/shortcut "Nueva partida" y colores del papel; Chromium lo da por instalable (CDP, 0 errores); `favicon.ico` viejo borrado; login con la secuencia de arranque (reglas → círculo que se dibuja → nombre → botón, ≤ 1,1 s) y reveal del primer Inicio por lanzamiento. Desvíos: animaciones de arranque en **CSS** y no con `motion` (corren desde el primer pintado, sin esperar el JS; `LaunchMarker` las apaga en navegaciones internas); `statusBarStyle` quedó en **`default`** (con `black-translucent` el reloj queda blanco sobre el papel) — provisional hasta probar en iPhone. Para probar: agregar a inicio en iPhone (ícono, splash claro/oscuro) y en Android (ícono maskable, color)
- [x] Fase 5 — pantallas (2026-09-25): **Partida** (hoyo a hoyo con stepper de 56 px, swipe, tira de hoyos; tarjeta completa; barra fija con gross/neto/guardado/Firmar; foto en dos pasos reales subir/leer con reintento y revisión por fila; firmadas en solo lectura con Desfirmar), **Inicio** (pizarra con el índice que rueda al arrancar, tarjeta sin firmar, grupos, partidas), **Grupo** (ranking en la pizarra, menú ⋯ con link/administrar miembros/salir, gráfico rehecho, comparación, partidas, invitar), **Golfista** (índice, stats, evolución, cara a cara por `?vs=`, tarjetas firmadas), **Partidas** (por mes), **Nueva partida** (tee con color, `?grupo=` preselecciona, invitados con error en su fila, notas, botón fijo), **Canchas** (lista, detalle con `ScorecardGrid` de cancha, formulario con celdas y errores por celda), **Perfil** y **Login** (Fases 3 y 4). `shell.tsx` y `ui/legacy.tsx` borrados. Fecha de hoy calculada en Buenos Aires (antes `toISOString`: "mañana" después de las 21). Inicio, Grupo, Partida y los formularios se ven con datos de mentira en `/dev/playground`. No verificable acá: todo lo que lee Supabase → preview y teléfono
- [x] Fase 6 — accesibilidad, bundle, docs, crítica, `code-review` (2026-09-25). **Bundle:** `/partidas/[id]` de 298 a 174,5 kB gz (menú ⋯ como hoja de acciones `ActionMenu`, hojas y visor con `next/dynamic`, `BoardNumber` estático, animaciones en CSS y `motion` quitado, sonner diferido detrás de `@/lib/toast`, cliente de Supabase del login bajado al tocar); **el presupuesto de ≤ 150 kB no se cumple**: el piso de Next + React ya es 128 kB y el layout suma ~30 (detalle y próximos pasos en `docs/perf/bundle-baseline.md`). **Accesibilidad:** `pnpm a11y` nuevo (axe, WCAG 2.2 AA; 0 violaciones en `/login` y `/dev/playground`, claro y oscuro, con hojas abiertas); stepper con `aria-disabled` (no pierde el foco en el tope), pestañas de jugador con flechas y una sola parada de Tab, foco visible en "Reintentar". **Crítica:** `npx impeccable detect src/` sin hallazgos; sobre la página renderizada, falsos positivos (transición de alto de sonner, contraste del botón deshabilitado y de texto debajo del header translúcido en la captura de página entera) o decisiones (escala tipográfica compacta: la jerarquía la dan los numerales). **`code-review`** (estándares + spec + bugs): arreglados fecha UTC al guardar el hándicap declarado (ahora Buenos Aires), errores tragados (hándicap de invitado, versiones de cancha, lectura cruda de la foto), vocabulario ("Golfistas del grupo", Hándicap Index/de cancha/de hoyo sin "Hcp" ambiguo), mínimo de hoyos WHS en un solo lugar (`minimumHolesToSign`), tercera pizarra en la hoja de firma, `Select` de 36 px en la foto, doble refresh al desfirmar; del spec: número que rueda recién cuando NumberFlow está listo (antes podía saltar) y sin parpadeo en el Inicio, deslizamiento solo al cambiar de hoyo, número del stepper que rueda, `Initials` y badge "Invitado" en el selector, vacíos con botón, "Compartir" secundario en Grupo, pie del login dentro de 1,1 s, morph compartido `hcp-index` (Inicio ↔ Perfil ↔ tu ficha) y `course-<id>` (lista ↔ detalle), fecha de partida sin tope (se puede armar la de mañana); de la caza de bugs: **el panel "Firmada" no aparecía nunca** (la hoja se desmontaba al quedar firmada la tarjeta), guardados superpuestos del mismo hoyo (ahora uno en vuelo por hoyo y el último valor gana), "Sin rating" era un callejón sin salida (editar la cancha crea otra versión y la partida sigue en el tee viejo: ahora una hoja carga CR y Slope en el tee de la partida, `setRoundTeeRating`), foto aplicada a medias sin refrescar, "Volver" después de crear volvía al formulario (`redirect(..., RedirectType.replace)` + `expectReplace()` en `nav-history`), hándicap plus "+2,5" se guardaba como 2,5 (`parseHandicap`), dos hándicaps declarados el mismo día (desempate por `created_at`), tees con el mismo nombre rompían la cancha (se valida antes), stepper con tope 20 cuando la base y la foto aceptan 30. Docs: `DESIGN.md` (desvíos y decisiones provisionales), handoff, README, perf
- [x] **En producción** (2026-09-25, a pedido del dueño): fast-forward de `claude/vigilant-bardeen-6iwzid` de `1924828` a `0b4b668` (rediseño), después `606dc76` y `864f6a7` (foto desde la galería). Hoy producción está en `864f6a7`. Sin cambios en la base. Para volver a la versión de antes del rediseño: Instant Rollback en Vercel al deploy `dpl_5JZsaVjb4EYJrHjmbnoWerZbax3b` (commit `1924828`)
- [x] Foto desde la galería (2026-09-25, pedido del dueño): un solo botón "Cargar tarjeta" (Partida) / "Cargar tarjeta del club" (Canchas) con un input **sin** `capture` (`usePhotoPicker`): iOS ofrece Fototeca / Tomar foto / Seleccionar archivo y Android algo equivalente. Se probó primero con dos botones (cámara y galería) y el dueño pidió uno solo. El selector ya lo vio el dueño en iPhone; falta Android y la lectura de punta a punta
- [ ] **Puerta 2** — partida real de prueba del dueño con la PWA instalada; ajustes. **PENDIENTE del dueño** (no se puede hacer sin él). Checklist en el teléfono (iOS y Android) en "Para probar en el teléfono" abajo

### Para probar en el teléfono (producción, https://golfeto.vercel.app; el catálogo `/dev/playground` solo está en el preview de la rama)

- [ ] Puerta 1: `/dev/playground?variant=A|B|C` en el preview de la rama (https://golfeto-git-claude-sle-0e6b3c-bautistapeco97-gmailcoms-projects.vercel.app), confirmar A (o elegir) y borrar B y C de `variants.tsx`
- [ ] Si la app ya estaba instalada: cerrarla del todo y abrirla de nuevo para tomar la versión nueva; para ver ícono y splash nuevos en iPhone, quitarla y volver a agregarla a la pantalla de inicio
- [ ] Instalar la PWA: ícono y splash claro/oscuro en iPhone; ícono maskable y color en Android; barra de estado de iOS (`statusBarStyle` `default`, provisional: probar `black-translucent`)
- [ ] Partida real: stepper de 56 px con una mano, swipe entre hoyos, tira de hoyos, tarjeta completa, modo avión → cambiar un hoyo → vuelve con toast "No se guardó" y Reintentar; firmar (el índice rueda de antes a después) y desfirmar con motivo
- [ ] Foto de la tarjeta: "Cargar tarjeta" (en iPhone ofrece Fototeca / Tomar foto / Seleccionar archivo: visto por el dueño), leer, revisar filas, cargar golpes; si falla, "Cargar otra"; ver la foto grande. Probar también en Android
- [ ] Menú ⋯ (partida y grupo) como hoja desde abajo; confirmaciones; toasts arriba sin tapar el notch
- [ ] Inicio: el índice rueda al abrir la app (solo la primera vez por lanzamiento); tocar el índice → Perfil (el número viaja); lista de canchas → detalle (el nombre viaja)
- [ ] Haptics: en Android vibran stepper, firma y confirmaciones; en iOS probar con `NEXT_PUBLIC_GALF_IOS_HAPTICS=1` en Preview y decidir
- [ ] Modo oscuro y "reducir movimiento" del sistema (sin animaciones)

### Pendiente del rediseño (sin DB)

- [ ] Presupuesto de bundle de `/partidas/[id]` (174,5 vs ≤ 150 kB): probar `cn()` sin tailwind-merge y partir el modo hoyo / tarjeta completa (ver `docs/perf/bundle-baseline.md`)
- [ ] "Desfirmar → el índice vuelve rodando": hoy es solo el toast con el índice nuevo (la Partida no muestra el índice)
- [ ] Deuda que marcó el `code-review` (juicio, no bugs): el ternario de tono bajo/sobre repetido en 6 lugares (llevarlo a `score-notation`), el delta de índice calculado en tres páginas (llevarlo a `PlayerHandicap`), `signScorecard` repite la cuenta de `estimateSignature`, `signedPhotoUrls` a `src/lib/db/`, clave `` `${cardId}|${position}` `` del autosave como tipo, `DropdownMenu` y `Separator` solo en el catálogo
- [ ] Guardar una cancha no es transaccional: si falla a mitad (p. ej. un error de red al insertar tees) puede quedar la versión vigente cerrada y la nueva sin tees. Lo ideal es un RPC que haga todo en una transacción → ver "Requiere DB"
- [ ] Instalar Impeccable desde una red libre y correr `/impeccable critique` con el skill completo
- [ ] Re-autorizar el conector de Vercel para el team: con `teamId`/`slug` da 403; sin pasar team sí lista deploys y alias (así se siguieron los deploys de producción) — ver handoff

### Requiere DB (excluido del rediseño; avisar al dueño antes de tocar la base)

- [ ] `peek_invite(code)` (RPC security definer): mostrar el nombre del grupo en `/unirse/<code>` antes de unirse. Hoy RLS no deja leer `groups` a un no-miembro
- [ ] Notificación "te cargaron golpes, falta tu firma" (también en Fase 3)
- [ ] Preferencias de usuario en el servidor (el tema queda en localStorage del teléfono)
- [ ] Conflicto entre dos teléfonos anotando la misma tarjeta (hoy gana la última escritura)
- [ ] Estadísticas del grupo en una sola consulta (una vista); innecesario con 5 golfistas
- [ ] Ranking por cancha, Stableford / match play, edición de obstáculos, vincular invitado desde el grupo (Fase 3)
- [ ] `save_course` como RPC transaccional (cerrar versión + versión nueva + hoyos + tees en una sola transacción)
- [ ] Defaults `current_date` de la base (p. ej. `player_declared_handicaps.valid_from`) toman la fecha del servidor (UTC): después de las 21 en Argentina es "mañana". La app ya manda la fecha de Buenos Aires en lo que escribe; revisar los defaults o la zona horaria de la base

## Deuda técnica conocida

- `sign_scorecard` recibe el cálculo WHS desde la app (`p_course_handicap`, etc.); la base no lo verifica. Decidido así (Fase 0, pregunta 3 del subagente de DB).
- `handicap_index_snapshots` se escribe pero no se lee: la evolución se recalcula desde las firmas en cada lectura. Si crece el volumen, leer de la tabla.
- Rondas de 9 en cancha de 18 (ida/vuelta) usan CR/2 como aproximación: no hay rating de 9 en el modelo de tee.
- El proxy de las sesiones de Claude bloquea `vercel.app`: verificar deploys por el conector de Vercel, no con `curl`.
