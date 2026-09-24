# Diseño de base de datos

Esquema en `supabase/migrations/0001_init.sql`. Vocabulario en `CONTEXT.md`; decisiones en `docs/adr/`.
Identificadores en inglés `snake_case`; comentarios y mensajes en español.

## Entidades

| Tabla | Propósito |
|---|---|
| `players` | Golfista (con `user_id`) o Invitado (sin `user_id`). Un invitado que se registra se da de baja y apunta a su golfista con `merged_into_player_id`. |
| `player_declared_handicaps` | Historial del Hándicap declarado; vale el de `valid_from` más reciente no dado de baja. |
| `groups` | Grupo de golfistas; `invite_code` para unirse. |
| `group_members` | Pertenencia a un grupo con rol (`member_role`). Salir = baja lógica; volver = fila nueva. |
| `courses` | Cancha identificada por club y nombre. Lo mutable vive en la versión. |
| `course_versions` | Versión de cancha vigente en `[valid_from, valid_to)`, con `holes_count`. Sin solapamiento por cancha. |
| `holes` | Hoyo de una versión: número, par, hándicap de hoyo (`stroke_index`), dogleg. |
| `hazard_types` | Catálogo de obstáculos (bunker, agua, fuera de límites...). |
| `hole_hazards` | Obstáculos de un hoyo (tipo + cantidad + notas). |
| `tee_sets` | Tee de una versión (blancas, azules...) con Course Rating y Slope. |
| `tee_hole_distances` | Metros de cada hoyo desde cada tee (FKs compuestas: tee y hoyo de la misma versión). |
| `round_formats` | Catálogo de formatos de partida (`medal` por ahora). |
| `rounds` | Partida: versión de cancha, tee, fecha (`date_approximate` para históricas), `holes_played`, `loops`. Sin grupo dueño (ADR-0002). |
| `scorecards` | Tarjeta de un golfista en una partida. `is_legacy` + `legacy_gross` para históricas (ADR-0003). `signed_at` / `current_signature_id` son estado derivado que sólo escriben los triggers. |
| `hole_scores` | Golpes reales por hoyo (`hole_id` + `position`); `picked_up` = Hoyo no terminado. |
| `scorecard_signatures` | Eventos `firmar` / `desfirmar` (append-only) con el snapshot del cálculo. |
| `handicap_index_snapshots` | Hándicap Index recalculado tras cada evento de firma; serie para el gráfico. |
| `round_photos` | Foto de tarjeta de la partida (`storage_path` en el bucket `scorecard-photos`). |
| `round_photo_extractions` | Salida cruda de la IA por foto (`raw_output jsonb`, log opaco, append-only). |

Enums: `member_role`, `round_holes` (`completa`/`ida`/`vuelta`), `dogleg_direction`, `signature_action`, `handicap_source`.

**Enum vs tabla de referencia.** Enum de Postgres para conjuntos cerrados cuyo valor ramifica código (rol, acción de
firma, parte de la cancha jugada): tipados, sin join, y agregar un valor es `alter type ... add value`. Tabla de
referencia (`round_formats`, `hazard_types`) para catálogos con etiqueta, orden y posibilidad de crecer o editarse desde
la app sin migración; llevan auditoría como cualquier tabla de negocio. Es la misma regla que el resto del esquema:
si tiene atributos propios, es una tabla.

## Auditoría y baja lógica

Toda tabla de negocio tiene `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`
(FK a `players`, indexadas). El trigger `a00_audit` (`set_audit_columns`) las mantiene: `created_*` inmutables,
`updated_*` en cada UPDATE, `deleted_by` al dar de baja. `created_by` toma `current_player_id()`; en inserciones
sin sesión (service role, seed) queda nulo salvo que se pase explícito.

Las tablas de eventos (`scorecard_signatures`, `handicap_index_snapshots`, `round_photo_extractions`) sólo tienen
`created_at` / `created_by` y el trigger `a01_append_only` rechaza UPDATE y DELETE incluso para service role.
Corregir un evento es agregar otro (desfirmar y volver a firmar, recalcular el índice).

**No hay borrado físico.** `attach_audit(tabla)` instala en cada tabla:

- `a02_soft_delete` (`soft_delete_instead`): un `DELETE` se convierte en `update ... set deleted_at = now()` y
  el borrado físico se suprime. Es `security definer` porque Postgres exige que la fila resultante de un UPDATE
  siga pasando la política SELECT, y una fila con `deleted_at` ya no la pasa; con un UPDATE directo la app
  recibiría "new row violates row-level security policy".
- Privilegios de columna: `authenticated` no puede escribir `created_*`, `updated_*`, `deleted_*`
  (ni `signed_at` / `current_signature_id` en `scorecards`).

Reglas para el código de la app:

1. Para dar de baja: `supabase.from('rounds').delete().eq('id', id)`. Nunca `update({ deleted_at })`.
2. Quién puede dar de baja lo dice la política `for delete` de cada tabla (creador de la partida, admin del grupo,
   el propio miembro para irse, participante para tarjetas sin firmar y golpes, etc.).
3. Lectura como `authenticated`: las políticas SELECT ya filtran `deleted_at is null`; no hace falta repetirlo,
   pero es inocuo. Lectura con service role (scripts, importación, Edge Functions): **siempre** `where deleted_at is null`.
   No se crean vistas `*_active`: PostgREST no compone bien vistas con RLS y duplicarían las 19 tablas.
4. Unicidad: índices únicos parciales `... where deleted_at is null` (miembro por grupo, tarjeta por partida y
   golfista, hoyo por número, código de invitación, ruta de foto...). Una baja no bloquea un alta nueva.
5. Cascadas lógicas (`z_soft_cascade`, `security definer`): grupo → miembros; cancha → versiones → hoyos, tees,
   distancias; hoyo → obstáculos y distancias; partida → tarjetas y fotos; tarjeta → golpes. Se bloquea la baja de
   una partida con tarjetas firmadas, de una tarjeta firmada, y de una versión de cancha o tee con partidas
   (se cierra con `valid_to` en su lugar).
6. Las FKs son `restrict` (por defecto): una fila dada de baja sigue referenciable; la historia no se rompe.

## Reglas temporales

**Versiones de cancha (ADR-0001).** `course_versions` lleva `[valid_from, valid_to)`; `valid_to` nulo = vigente.
La constraint `exclude using gist (course_id with =, daterange(...) with &&) where (deleted_at is null)` impide dos
versiones activas solapadas. Editar una cancha = cerrar la vigente (`valid_to = hoy`) y crear una nueva con sus
hoyos, tees y distancias copiados; la partida referencia `course_version_id` + `tee_set_id` (FK compuesta que
garantiza que el tee pertenece a esa versión) y nunca cambia aunque la cancha cambie. Al crear una partida la app
elige la versión con `valid_from <= played_on and (valid_to is null or valid_to > played_on)`.

**Firmas.** El estado de una tarjeta no es un flag: es el último evento de `scorecard_signatures`.

- `sign_scorecard(id, handicap_source, handicap_index, course_handicap, adjusted_gross, differential)` inserta un
  evento `firmar` con el snapshot completo: lo que pasa la app (hándicap usado y su origen, hándicap de cancha, gross
  ajustado, diferencial) más lo que toma la base en ese instante (gross real o `legacy_gross`, par, CR, Slope,
  `holes_played`). Ese snapshot es lo que consume el cálculo del Hándicap Index; no se recalcula nunca.
- `unsign_scorecard(id, reason)` inserta `desfirmar`. Ambos quedan en el historial con quién y cuándo.
- `guard_signature_insert`: sólo el dueño de la tarjeta (o service role, para importar históricas); no se firma lo
  firmado ni se desfirma lo abierto. `apply_signature` proyecta el evento sobre `scorecards.signed_at` /
  `current_signature_id` (para RLS, índices y listados).
- Con `signed_at` presente: los golpes (`hole_scores`) no se escriben, la tarjeta no se edita ni se da de baja, y la
  partida no cambia cancha, tee, fecha ni formato.
- Tras cada evento la app recalcula el Hándicap Index y lo agrega a `handicap_index_snapshots`.

## RLS

Helpers `security definer` con `search_path = public`: `current_player_id`, `is_group_member`, `is_group_admin`,
`shares_group_with`, `is_round_participant`, `can_view_round` (todos filtran bajas). RPCs: `create_group`,
`join_group` (definer: el que entra aún no ve el grupo), `sign_scorecard`, `unsign_scorecard` (invoker).
`auth.uid()` y `current_player_id()` van envueltos en `(select ...)` para que se evalúen una vez por consulta.
Golfistas y canchas son visibles y editables por todo `authenticated`; grupos sólo por miembros; partidas, tarjetas,
golpes, firmas y fotos por participantes y por quien comparte grupo con algún participante (ADR-0002).
Hay índices en todas las FKs y en las columnas de los predicados (`player_id`, `group_id`, `round_id`, `deleted_at`).

## Referencias

- Supabase, RLS performance and best practices: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- Supabase, Row Level Security (wrap `auth.uid()` in `select`, security definer helpers): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase discussion #14576, benchmarks de políticas e índices: https://github.com/orgs/supabase/discussions/14576
- PostgreSQL docs, CREATE POLICY (el UPDATE debe seguir pasando la política SELECT): https://www.postgresql.org/docs/current/sql-createpolicy.html
- Soft deletes en PostgreSQL con índices parciales: https://oneuptime.com/blog/post/2026-01-21-postgresql-soft-deletes/view
- Patrones de índice único con soft delete: https://www.phparch.com/2026/02/advanced-unique-index-patterns-for-soft-deletes-mysql-and-postgresql/
- Columnas created/updated automáticas con triggers: https://jonmeyers.io/blog/automatically-generate-values-for-created-and-updated-columns-in-postgres/
- PostgreSQL wiki, audit trigger: https://wiki.postgresql.org/wiki/Audit_trigger_91plus
- Temporal constraints / exclusion con rangos: https://betterstack.com/community/guides/databases/postgres-temporal-constraints/
