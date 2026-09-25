# Baseline de bundle (Fase 0 del rediseño, 2026-09-25)

JS de primera carga por ruta, gzip, medido con `pnpm build && pnpm bundle` (`scripts/bundle-size.mjs`) sobre `aada6af` (antes de cualquier cambio visual). Next 16 ya no imprime tamaños en la tabla de rutas. Los polyfills `nomodule` no cuentan.

```
Compartido por todas las rutas: 127.6 kB gz
/                                  134.7 kB gz
/_global-error                     131.2 kB gz
/_not-found                        131.2 kB gz
/canchas                           134.7 kB gz
/canchas/[id]                      134.7 kB gz
/canchas/[id]/editar               137.8 kB gz
/canchas/nueva                     137.8 kB gz
/golfistas/[id]                    136.6 kB gz
/grupos/[id]                       137.8 kB gz
/grupos/nuevo                      134.7 kB gz
/login                             197.8 kB gz
/partidas                          134.7 kB gz
/partidas/[id]                     138.8 kB gz
/partidas/nueva                    136.8 kB gz
/perfil                            135.7 kB gz
/unirse/[code]                     134.7 kB gz
```

Presupuesto del plan para `/partidas/[id]`: ≤ 150 kB gz.

## Fin de la Fase 6 (2026-09-25)

Mismo método. Al cerrar la Fase 5 `/partidas/[id]` pesaba **298,3 kB gz** (el kit entero en el primer JS: Base UI Menu + floating-ui, Drawer, motion, sonner, NumberFlow, cliente de Supabase en el login). En la Fase 6:

- Menú ⋯ de la cabecera → `ActionMenu` (hoja desde abajo, cargada al abrir): sale Base UI Menu + floating-ui.
- Confirmación, firma, pasos de la foto, visor de fotos y miembros del grupo con `next/dynamic`, montados la primera vez que se abren.
- `BoardNumber` estático (sin JS); `AnimatedBoardNumber` / `RollingNumber` bajan NumberFlow aparte.
- Animaciones de `ScoreMark` y del cambio de hoyo en CSS; se quitó `motion` (~11 kB en cada ruta).
- `toast` de `@/lib/toast`: sonner y el Toaster se montan en un momento libre o con el primer toast (~11 kB en cada ruta).
- Login: el cliente de Supabase se baja al apoyar el dedo en "Entrar con Google".

```
Compartido por todas las rutas: 128.1 kB gz
/                                  159.2 kB gz
/_global-error                     131.7 kB gz
/_not-found                          150 kB gz
/canchas                           157.8 kB gz
/canchas/[id]                      163.1 kB gz
/canchas/[id]/editar               176.2 kB gz
/canchas/nueva                     176.2 kB gz
/dev/playground                    280.4 kB gz
/golfistas/[id]                    160.2 kB gz
/grupos                            157.8 kB gz
/grupos/[id]                         164 kB gz
/grupos/nuevo                      160.7 kB gz
/login                             152.3 kB gz
/partidas                          157.8 kB gz
/partidas/[id]                     174.5 kB gz
/partidas/nueva                    179.6 kB gz
/perfil                            173.6 kB gz
/unirse/[code]                     160.1 kB gz
```

**Presupuesto de `/partidas/[id]` (≤ 150 kB): no se cumple, 174,5 kB.** Composición: 128,1 kB son de Next + React (el mismo piso que el baseline); ~30 kB los pone el layout en todas las rutas (tailwind-merge + clsx 8,7, proveedores —tema, confirmación, haptics, flash— 6,1, `BottomNav` + `ViewTransition` + velo de navegación 5, `error.tsx` 2,4, `next/link` y el cliente de metadata de Next ~7); ~15 kB son de la pantalla (modo hoyo, tarjeta completa, grilla, stepper, barra, autosave, foto). El presupuesto del plan contaba LazyMotion, NumberFlow y sonner en el primer JS pero no el layout nuevo. Lo que queda por probar, en orden de ganancia: `cn()` sin tailwind-merge (−8,7 kB en todas las rutas, pero hay que revisar cada `className` que pisa a otro), y partir `focus-mode` / `full-card` por modo. `/login` bajó de 197,8 (baseline) a 152,3.
