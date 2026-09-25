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

- [ ] Verificar el login con Google en producción con otra cuenta (no solo la del dueño)
- [ ] Cargar la **tarjeta real de Miraflores** (par por hoyo, hándicap de hoyo, distancias, CR/Slope por tee) → versión nueva. El layout actual es provisional (ver `docs/handoff.md`)
- [ ] Ídem Los Cedros (CR/Slope no publicados: si no aparecen, dejar los de Miraflores como aproximación declarada)
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
