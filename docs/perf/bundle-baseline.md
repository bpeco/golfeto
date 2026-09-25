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
