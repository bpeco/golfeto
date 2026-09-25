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
- [x] Arreglado: tras aplicar la foto de la tarjeta la grilla seguía vacía (los golpes sí se guardaban). `ScoreGrid` copia los golpes a estado local y el refresh no la remontaba; ahora la key incluye la huella de los golpes. Primera foto real (tarjeta del dueño, 1 jugador) leída bien
- [x] Arreglado (WHS): sin Hándicap Index la firma calculaba con índice 0 y topeaba cada hoyo a net double bogey (par + 2 − 1). Regla 3.1b: hasta tener Index el tope es **par + 5**. `adjustedGrossScore` acepta `courseHcp = null`. Tarjeta de prueba del dueño (gross 123): ajustado 98 → 119, diferencial 25.0 → 44.0
- [ ] Firmar pide confirmación (hoy firma con un toque; la tarjeta de prueba se firmó sin querer). Pendiente, no pedido todavía
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
- [ ] Ícono y splash propios (hoy: una "G" generada)
- [ ] Tests de integración contra Supabase (RLS, firmas, cascadas) — hoy validado a mano por el subagente de DB

## Deuda técnica conocida

- `sign_scorecard` recibe el cálculo WHS desde la app (`p_course_handicap`, etc.); la base no lo verifica. Decidido así (Fase 0, pregunta 3 del subagente de DB).
- `handicap_index_snapshots` se escribe pero no se lee: la evolución se recalcula desde las firmas en cada lectura. Si crece el volumen, leer de la tabla.
- Rondas de 9 en cancha de 18 (ida/vuelta) usan CR/2 como aproximación: no hay rating de 9 en el modelo de tee.
- El proxy de las sesiones de Claude bloquea `vercel.app`: verificar deploys por el conector de Vercel, no con `curl`.
