-- Galf: esquema inicial. Vocabulario en CONTEXT.md; decisiones en docs/adr y docs/db-design.md.
--
-- Convenciones (ver docs/db-design.md):
--   * Identificadores en inglés snake_case; comentarios en español.
--   * Toda tabla de negocio lleva columnas de auditoría:
--       created_at / created_by, updated_at / updated_by (trigger), deleted_at / deleted_by (baja lógica).
--     No hay borrado físico: la app hace DELETE (autorizado por la política `for delete` de cada tabla) y el
--     trigger a02_soft_delete lo convierte en `set deleted_at`. Las políticas RLS ocultan lo dado de baja.
--   * Las tablas de eventos (firmas, snapshots de hándicap, extracciones) son append-only e inmutables:
--     solo created_at / created_by; no se actualizan ni se borran, se compensan con otro evento.
--   * Unicidad = índices únicos parciales `where deleted_at is null`, para que una baja no bloquee un alta nueva.
--   * Vigencia temporal (valid_from / valid_to) en versiones de cancha, sin solapamiento por cancha (btree_gist).
--   * Valores fijos: enums de Postgres para conjuntos cerrados que el código ramifica (rol, acción de firma...);
--     tablas de referencia para catálogos con etiqueta y orden que pueden crecer (formatos, obstáculos).

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tipos enumerados (conjuntos cerrados, semántica en el código)
-- ---------------------------------------------------------------------------
do $$ begin
  create type member_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;
comment on type member_role is 'Rol de un golfista dentro de un grupo.';

do $$ begin
  create type round_holes as enum ('completa', 'ida', 'vuelta');
exception when duplicate_object then null; end $$;
comment on type round_holes is 'Qué parte de la cancha se jugó: completa, ida (1-9) o vuelta (10-18).';

do $$ begin
  create type dogleg_direction as enum ('izquierda', 'derecha');
exception when duplicate_object then null; end $$;

do $$ begin
  create type signature_action as enum ('firmar', 'desfirmar');
exception when duplicate_object then null; end $$;
comment on type signature_action is 'Evento sobre una tarjeta: firmar la da por definitiva; desfirmar la reabre.';

do $$ begin
  create type handicap_source as enum ('index', 'declarado', 'ninguno');
exception when duplicate_object then null; end $$;
comment on type handicap_source is 'De dónde salió el hándicap usado al firmar: Hándicap Index calculado, declarado o ninguno.';

-- ---------------------------------------------------------------------------
-- Golfistas e invitados
-- ---------------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+$'),
  merged_into_player_id uuid references players (id),
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  check (merged_into_player_id is null or merged_into_player_id <> id)
);
comment on table players is 'Golfista (user_id presente) o Invitado (user_id nulo); un invitado que se registra se da de baja y apunta a su golfista con merged_into_player_id.';
create unique index if not exists players_user_id_active_uidx on players (user_id) where deleted_at is null and user_id is not null;
create index if not exists players_merged_into_idx on players (merged_into_player_id);
create index if not exists players_active_idx on players (id) where deleted_at is null;

create table if not exists player_declared_handicaps (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id),
  value numeric(4, 1) not null check (value between -10 and 54),
  valid_from date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table player_declared_handicaps is 'Hándicap declarado (DeclaredHandicap): historial de valores cargados a mano por el golfista; vale el de valid_from más reciente no dado de baja.';
create index if not exists player_declared_handicaps_player_idx on player_declared_handicaps (player_id, valid_from desc) where deleted_at is null;

-- Alta automática del golfista al crear el usuario de Auth.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into players (user_id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Golfista activo asociado al usuario autenticado (null para service_role / anon).
create or replace function current_player_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from players where user_id = (select auth.uid()) and deleted_at is null limit 1
$$;

-- ---------------------------------------------------------------------------
-- Auditoría genérica y baja lógica
-- ---------------------------------------------------------------------------
-- created_* inmutables; updated_* siempre desde el trigger; deleted_by se completa al dar de baja.
create or replace function set_audit_columns()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, current_player_id());
    new.updated_at := new.created_at;
    new.updated_by := new.created_by;
    if new.deleted_at is not null then
      new.deleted_by := coalesce(new.deleted_by, current_player_id());
    end if;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(current_player_id(), new.updated_by);
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_by := coalesce(new.deleted_by, current_player_id());
    elsif new.deleted_at is null then
      new.deleted_by := null;
    end if;
  end if;
  return new;
end $$;

-- Variante para tablas de eventos (solo created_*).
create or replace function set_created_columns()
returns trigger language plpgsql as $$
begin
  new.created_at := coalesce(new.created_at, now());
  new.created_by := coalesce(new.created_by, current_player_id());
  return new;
end $$;

-- Tablas de eventos: nunca se actualizan ni se borran.
create or replace function forbid_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'La tabla % es append-only: no se modifica ni se borra, se agrega un evento compensatorio', tg_table_name;
end $$;

-- Baja lógica en lugar de borrado físico: la app hace DELETE (autorizado por la política `for delete` de
-- cada tabla) y este trigger lo convierte en `set deleted_at`. Es security definer porque Postgres exige que
-- la fila resultante de un UPDATE siga pasando la política SELECT, y una fila dada de baja ya no la pasa.
create or replace function soft_delete_instead()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  execute format('update %I.%I set deleted_at = now() where id = $1 and deleted_at is null', tg_table_schema, tg_table_name)
  using old.id;
  return null; -- se suprime el DELETE físico
end $$;

-- Instala en una tabla de negocio: trigger de auditoría, trigger de baja lógica, índices sobre las FKs de
-- auditoría y privilegios de columna (authenticated no escribe columnas de auditoría ni deleted_*).
create or replace function attach_audit(tbl regclass)
returns void language plpgsql as $$
declare t text := tbl::text; cols text;
begin
  execute format('drop trigger if exists a00_audit on %s', tbl);
  execute format('create trigger a00_audit before insert or update on %s for each row execute function set_audit_columns()', tbl);
  execute format('drop trigger if exists a02_soft_delete on %s', tbl);
  execute format('create trigger a02_soft_delete before delete on %s for each row execute function soft_delete_instead()', tbl);
  execute format('create index if not exists %I on %s (created_by)', t || '_created_by_idx', tbl);
  execute format('create index if not exists %I on %s (updated_by)', t || '_updated_by_idx', tbl);
  execute format('create index if not exists %I on %s (deleted_by)', t || '_deleted_by_idx', tbl);
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols
  from pg_attribute
  where attrelid = tbl and attnum > 0 and not attisdropped
    and attname not in ('created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by');
  execute format('revoke update on %s from authenticated', tbl);
  execute format('grant update (%s) on %s to authenticated', cols, tbl);
end $$;

-- Instala trigger de auditoría de alta + prohibición de update/delete en una tabla de eventos.
create or replace function attach_append_only(tbl regclass)
returns void language plpgsql as $$
declare t text := tbl::text;
begin
  execute format('drop trigger if exists a00_audit on %s', tbl);
  execute format('create trigger a00_audit before insert on %s for each row execute function set_created_columns()', tbl);
  execute format('drop trigger if exists a01_append_only on %s', tbl);
  execute format('create trigger a01_append_only before update or delete on %s for each row execute function forbid_update_delete()', tbl);
  execute format('create index if not exists %I on %s (created_by)', t || '_created_by_idx', tbl);
end $$;

select attach_audit('players');
select attach_audit('player_declared_handicaps');

-- ---------------------------------------------------------------------------
-- Grupos
-- ---------------------------------------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  invite_code text,
  created_at timestamptz not null default now(),
  created_by uuid not null references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table groups is 'Grupo: comunidad de golfistas que se ven mutuamente partidas, tarjetas y hándicaps.';
create unique index if not exists groups_invite_code_active_uidx on groups (invite_code) where deleted_at is null and invite_code is not null;
select attach_audit('groups');

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id),
  player_id uuid not null references players (id),
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table group_members is 'Pertenencia de un golfista a un grupo; salir del grupo es dar de baja la fila, volver a entrar crea otra.';
create unique index if not exists group_members_active_uidx on group_members (group_id, player_id) where deleted_at is null;
create index if not exists group_members_player_active_idx on group_members (player_id, group_id) where deleted_at is null;
create index if not exists group_members_group_idx on group_members (group_id);
select attach_audit('group_members');

create or replace function is_group_member(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and player_id = (select current_player_id()) and deleted_at is null
  )
$$;

create or replace function is_group_admin(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and player_id = (select current_player_id()) and role = 'admin' and deleted_at is null
  )
$$;

-- Comparte al menos un grupo activo con el golfista dado (o es él mismo).
create or replace function shares_group_with(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p = (select current_player_id()) or exists (
    select 1 from group_members a
    join group_members b on a.group_id = b.group_id and b.deleted_at is null
    join groups g on g.id = a.group_id and g.deleted_at is null
    where a.player_id = (select current_player_id()) and a.deleted_at is null and b.player_id = p
  )
$$;

-- Al dar de baja un grupo se dan de baja sus pertenencias (cascada lógica).
create or replace function soft_cascade_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update group_members set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where group_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists z_soft_cascade on groups;
create trigger z_soft_cascade after update of deleted_at on groups
  for each row execute function soft_cascade_group();

-- ---------------------------------------------------------------------------
-- Canchas (versionadas, ADR-0001)
-- ---------------------------------------------------------------------------
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  club text,
  city text,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table courses is 'Cancha: recorrido identificado por club y nombre; lo que cambia con el tiempo vive en course_versions.';
create unique index if not exists courses_club_name_active_uidx on courses (lower(coalesce(club, '')), lower(name)) where deleted_at is null;
select attach_audit('courses');

create table if not exists course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id),
  holes_count int not null check (holes_count in (9, 18)),
  valid_from date not null default current_date,
  valid_to date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  check (valid_to is null or valid_to > valid_from),
  -- Dos versiones activas de la misma cancha no pueden solaparse en el tiempo.
  exclude using gist (course_id with =, daterange(valid_from, valid_to, '[)') with &&) where (deleted_at is null)
);
comment on table course_versions is 'Versión de cancha: estado (hoyos, tees, distancias) vigente en [valid_from, valid_to); editar una cancha cierra la versión vigente y abre otra.';
create index if not exists course_versions_course_idx on course_versions (course_id, valid_from desc) where deleted_at is null;
select attach_audit('course_versions');

create table if not exists holes (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id),
  number int not null check (number between 1 and 18),
  par int not null check (par between 3 and 6),
  stroke_index int check (stroke_index between 1 and 18),
  dogleg dogleg_direction,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  unique (id, course_version_id)
);
comment on table holes is 'Hoyo de una versión de cancha: número, par y hándicap de hoyo (stroke_index); la distancia depende del tee.';
create unique index if not exists holes_number_active_uidx on holes (course_version_id, number) where deleted_at is null;
create unique index if not exists holes_stroke_index_active_uidx on holes (course_version_id, stroke_index) where deleted_at is null and stroke_index is not null;
create index if not exists holes_course_version_idx on holes (course_version_id);
select attach_audit('holes');

create table if not exists hazard_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table hazard_types is 'Catálogo de tipos de obstáculo (bunker, agua, fuera de límites...).';
create unique index if not exists hazard_types_code_active_uidx on hazard_types (code) where deleted_at is null;
select attach_audit('hazard_types');

create table if not exists hole_hazards (
  id uuid primary key default gen_random_uuid(),
  hole_id uuid not null references holes (id),
  hazard_type_id uuid not null references hazard_types (id),
  quantity int not null default 1 check (quantity >= 1),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table hole_hazards is 'Obstáculos de un hoyo: cuántos de cada tipo y dónde (en notes).';
create unique index if not exists hole_hazards_active_uidx on hole_hazards (hole_id, hazard_type_id) where deleted_at is null;
create index if not exists hole_hazards_hazard_type_idx on hole_hazards (hazard_type_id);
select attach_audit('hole_hazards');

create table if not exists tee_sets (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id),
  name text not null check (length(btrim(name)) between 1 and 40),
  color text,
  course_rating numeric(4, 1) check (course_rating between 40 and 90),
  slope int check (slope between 55 and 155),
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  unique (id, course_version_id)
);
comment on table tee_sets is 'Tee de una versión de cancha (blancas, azules...) con su Course Rating y Slope; en canchas de 9 el rating es de 9 hoyos.';
create unique index if not exists tee_sets_name_active_uidx on tee_sets (course_version_id, lower(name)) where deleted_at is null;
create index if not exists tee_sets_course_version_idx on tee_sets (course_version_id);
select attach_audit('tee_sets');

create table if not exists tee_hole_distances (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id),
  tee_set_id uuid not null,
  hole_id uuid not null,
  meters int not null check (meters between 50 and 800),
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  -- Las FKs compuestas garantizan que tee y hoyo pertenezcan a la misma versión.
  foreign key (tee_set_id, course_version_id) references tee_sets (id, course_version_id),
  foreign key (hole_id, course_version_id) references holes (id, course_version_id)
);
comment on table tee_hole_distances is 'Distancia en metros de un hoyo desde un tee.';
create unique index if not exists tee_hole_distances_active_uidx on tee_hole_distances (tee_set_id, hole_id) where deleted_at is null;
create index if not exists tee_hole_distances_hole_idx on tee_hole_distances (hole_id);
create index if not exists tee_hole_distances_course_version_idx on tee_hole_distances (course_version_id);
select attach_audit('tee_hole_distances');

-- Cascadas lógicas dentro de la cancha.
create or replace function soft_cascade_course()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update course_versions set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where course_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists z_soft_cascade on courses;
create trigger z_soft_cascade after update of deleted_at on courses
  for each row execute function soft_cascade_course();

create or replace function soft_cascade_course_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    if exists (select 1 from rounds where course_version_id = new.id and deleted_at is null) then
      raise exception 'La versión de cancha tiene partidas; no se puede dar de baja (cerrala con valid_to)';
    end if;
    update tee_hole_distances set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where course_version_id = new.id and deleted_at is null;
    update tee_sets set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where course_version_id = new.id and deleted_at is null;
    update holes set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where course_version_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;

create or replace function soft_cascade_hole()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update hole_hazards set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where hole_id = new.id and deleted_at is null;
    update tee_hole_distances set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where hole_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists z_soft_cascade on holes;
create trigger z_soft_cascade after update of deleted_at on holes
  for each row execute function soft_cascade_hole();

create or replace function soft_cascade_tee_set()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    if exists (select 1 from rounds where tee_set_id = new.id and deleted_at is null) then
      raise exception 'El tee tiene partidas; no se puede dar de baja';
    end if;
    update tee_hole_distances set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where tee_set_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists z_soft_cascade on tee_sets;
create trigger z_soft_cascade after update of deleted_at on tee_sets
  for each row execute function soft_cascade_tee_set();

-- ---------------------------------------------------------------------------
-- Partidas y tarjetas
-- ---------------------------------------------------------------------------
create table if not exists round_formats (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table round_formats is 'Catálogo de formatos de partida (medal, stableford...).';
create unique index if not exists round_formats_code_active_uidx on round_formats (code) where deleted_at is null;
select attach_audit('round_formats');

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id),
  tee_set_id uuid not null,
  format_id uuid not null references round_formats (id),
  played_on date not null default current_date,
  date_approximate boolean not null default false,
  holes_played round_holes not null default 'completa',
  loops int not null default 1 check (loops in (1, 2)),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid not null references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  foreign key (tee_set_id, course_version_id) references tee_sets (id, course_version_id),
  check (loops = 1 or holes_played = 'completa')
);
comment on table rounds is 'Partida: una versión de cancha, un tee, una fecha y uno o más golfistas (una tarjeta cada uno); no pertenece a ningún grupo (ADR-0002).';
comment on column rounds.loops is '2 = cancha de 9 jugada ida y vuelta (dos Vueltas desde el mismo tee).';
comment on column rounds.date_approximate is 'true en partidas históricas cuya fecha se asignó de forma aproximada (ADR-0003).';
create index if not exists rounds_course_version_idx on rounds (course_version_id);
create index if not exists rounds_tee_set_idx on rounds (tee_set_id);
create index if not exists rounds_format_idx on rounds (format_id);
create index if not exists rounds_played_on_idx on rounds (played_on desc) where deleted_at is null;
select attach_audit('rounds');

create table if not exists scorecards (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id),
  player_id uuid not null references players (id),
  is_legacy boolean not null default false,
  legacy_gross int check (legacy_gross between 18 and 300),
  -- Estado actual derivado de scorecard_signatures (lo mantiene el trigger; authenticated no puede escribirlo).
  signed_at timestamptz,
  current_signature_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  check (is_legacy = (legacy_gross is not null))
);
comment on table scorecards is 'Tarjeta de un golfista en una partida; firmada cuando signed_at no es nulo. Las históricas (is_legacy) solo tienen total (ADR-0003).';
create unique index if not exists scorecards_round_player_active_uidx on scorecards (round_id, player_id) where deleted_at is null;
create index if not exists scorecards_player_signed_idx on scorecards (player_id, signed_at desc) where deleted_at is null;
create index if not exists scorecards_round_idx on scorecards (round_id);
create index if not exists scorecards_current_signature_idx on scorecards (current_signature_id);
select attach_audit('scorecards');

create table if not exists hole_scores (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references scorecards (id),
  hole_id uuid not null references holes (id),
  position int not null check (position between 1 and 18),
  strokes int check (strokes between 1 and 30),
  picked_up boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id),
  check (picked_up = (strokes is null))
);
comment on table hole_scores is 'Golpes reales de un hoyo en una tarjeta; picked_up = Hoyo no terminado (sin golpes, vale net double bogey para el hándicap).';
comment on column hole_scores.position is 'Orden dentro de la partida (1..18). En 2 vueltas, 10..18 repiten los hoyos 1..9.';
create unique index if not exists hole_scores_position_active_uidx on hole_scores (scorecard_id, position) where deleted_at is null;
create index if not exists hole_scores_hole_idx on hole_scores (hole_id);
select attach_audit('hole_scores');

create table if not exists scorecard_signatures (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references scorecards (id),
  action signature_action not null,
  reason text,
  -- Snapshot de todo lo usado para el hándicap (solo en 'firmar'); la historia no cambia aunque cambie la cancha o el índice.
  handicap_source handicap_source,
  handicap_index numeric(4, 1),
  course_handicap int,
  course_rating numeric(4, 1),
  slope int,
  par int,
  holes_played round_holes,
  gross int,
  adjusted_gross int,
  differential numeric(4, 1),
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  check (
    (action = 'firmar' and handicap_source is not null and course_handicap is not null and gross is not null
      and adjusted_gross is not null and differential is not null and par is not null and holes_played is not null)
    or
    (action = 'desfirmar' and handicap_source is null and handicap_index is null and course_handicap is null
      and course_rating is null and slope is null and par is null and holes_played is null and gross is null
      and adjusted_gross is null and differential is null)
  )
);
comment on table scorecard_signatures is 'Historial append-only de firmas y desfirmas de una tarjeta; la fila de firma congela el hándicap de cancha, gross ajustado y diferencial usados.';
create index if not exists scorecard_signatures_scorecard_idx on scorecard_signatures (scorecard_id, created_at desc);
select attach_append_only('scorecard_signatures');

alter table scorecards drop constraint if exists scorecards_current_signature_fk;
alter table scorecards add constraint scorecards_current_signature_fk
  foreign key (current_signature_id) references scorecard_signatures (id);

create table if not exists handicap_index_snapshots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id),
  signature_id uuid references scorecard_signatures (id),
  value numeric(4, 1) not null check (value between -10 and 54),
  counted_scorecards int not null check (counted_scorecards between 0 and 20),
  includes_legacy boolean not null default true,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references players (id)
);
comment on table handicap_index_snapshots is 'Hándicap Index del golfista recalculado tras cada firma/desfirma; serie temporal para el gráfico.';
create index if not exists handicap_index_snapshots_player_idx on handicap_index_snapshots (player_id, computed_at desc);
create index if not exists handicap_index_snapshots_signature_idx on handicap_index_snapshots (signature_id);
select attach_append_only('handicap_index_snapshots');

create table if not exists round_photos (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id),
  storage_path text not null,
  created_at timestamptz not null default now(),
  created_by uuid references players (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references players (id),
  deleted_at timestamptz,
  deleted_by uuid references players (id)
);
comment on table round_photos is 'Foto de tarjeta: imagen de la tarjeta de papel de una partida (una hoja suele tener a todos los jugadores).';
create unique index if not exists round_photos_path_active_uidx on round_photos (storage_path) where deleted_at is null;
create index if not exists round_photos_round_idx on round_photos (round_id);
select attach_audit('round_photos');

create table if not exists round_photo_extractions (
  id uuid primary key default gen_random_uuid(),
  round_photo_id uuid not null references round_photos (id),
  model text,
  raw_output jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references players (id)
);
comment on table round_photo_extractions is 'Salida cruda de la IA al leer una foto (log opaco, append-only); los golpes reales viven en hole_scores.';
create index if not exists round_photo_extractions_photo_idx on round_photo_extractions (round_photo_id, created_at desc);
select attach_append_only('round_photo_extractions');

-- Cascadas lógicas de partida y tarjeta.
create or replace function soft_cascade_round()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    if exists (select 1 from scorecards where round_id = new.id and deleted_at is null and signed_at is not null) then
      raise exception 'La partida tiene tarjetas firmadas; hay que desfirmarlas antes de darla de baja';
    end if;
    update scorecards set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where round_id = new.id and deleted_at is null;
    update round_photos set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where round_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists z_soft_cascade on rounds;
create trigger z_soft_cascade after update of deleted_at on rounds
  for each row execute function soft_cascade_round();

create or replace function soft_cascade_scorecard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update hole_scores set deleted_at = new.deleted_at, deleted_by = new.deleted_by
    where scorecard_id = new.id and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists z_soft_cascade on scorecards;
create trigger z_soft_cascade after update of deleted_at on scorecards
  for each row execute function soft_cascade_scorecard();

drop trigger if exists z_soft_cascade on course_versions;
create trigger z_soft_cascade after update of deleted_at on course_versions
  for each row execute function soft_cascade_course_version();

-- ---------------------------------------------------------------------------
-- Helpers de visibilidad de partidas
-- ---------------------------------------------------------------------------
create or replace function is_round_participant(r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from scorecards
    where round_id = r and player_id = (select current_player_id()) and deleted_at is null
  ) or exists (
    select 1 from rounds where id = r and created_by = (select current_player_id()) and deleted_at is null
  )
$$;

-- ADR-0002: un grupo ve toda partida en la que jugó alguno de sus miembros.
create or replace function can_view_round(r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_round_participant(r) or exists (
    select 1 from scorecards s
    where s.round_id = r and s.deleted_at is null and shares_group_with(s.player_id)
  )
$$;

-- ---------------------------------------------------------------------------
-- Guardas: partida, tarjeta, golpes, firmas
-- ---------------------------------------------------------------------------
-- Solo el creador da de baja la partida; con tarjetas firmadas no se cambia cancha/tee/fecha.
create or replace function guard_round_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null
     and auth.uid() is not null and old.created_by is distinct from current_player_id() then
    raise exception 'Solo quien creó la partida puede darla de baja';
  end if;
  if (new.course_version_id, new.tee_set_id, new.played_on, new.holes_played, new.loops, new.format_id)
     is distinct from (old.course_version_id, old.tee_set_id, old.played_on, old.holes_played, old.loops, old.format_id)
     and exists (select 1 from scorecards where round_id = old.id and deleted_at is null and signed_at is not null) then
    raise exception 'La partida tiene tarjetas firmadas; no se puede cambiar cancha, tee, fecha ni formato';
  end if;
  return new;
end $$;
drop trigger if exists b_guard on rounds;
create trigger b_guard before update on rounds
  for each row execute function guard_round_update();

-- Una tarjeta firmada no se toca (salvo el cambio de estado que hace el trigger de firmas) ni se da de baja.
create or replace function guard_scorecard_update()
returns trigger language plpgsql as $$
begin
  if old.signed_at is not null and new.signed_at is not null
     and (new.round_id, new.player_id, new.is_legacy, new.legacy_gross, new.deleted_at)
         is distinct from (old.round_id, old.player_id, old.is_legacy, old.legacy_gross, old.deleted_at) then
    raise exception 'La tarjeta está firmada; desfirmala para editarla o darla de baja';
  end if;
  return new;
end $$;
drop trigger if exists b_guard on scorecards;
create trigger b_guard before update on scorecards
  for each row execute function guard_scorecard_update();

-- Golpes: no se escriben sobre tarjetas firmadas, históricas o dadas de baja; el hoyo debe ser de la cancha de la partida.
create or replace function guard_hole_score_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare sc record;
begin
  select s.signed_at, s.is_legacy, s.deleted_at, r.course_version_id, r.holes_played, r.loops, cv.holes_count
  into sc
  from scorecards s join rounds r on r.id = s.round_id join course_versions cv on cv.id = r.course_version_id
  where s.id = coalesce(new.scorecard_id, old.scorecard_id);
  if sc.signed_at is not null then
    raise exception 'La tarjeta está firmada; desfirmala para editar los golpes';
  end if;
  if tg_op = 'UPDATE' and new.deleted_at is not null and old.deleted_at is null then
    return new; -- baja lógica (directa o en cascada desde la tarjeta): solo importa que no esté firmada
  end if;
  if tg_op <> 'DELETE' then
    if sc.is_legacy then
      raise exception 'Una tarjeta histórica no lleva golpes por hoyo';
    end if;
    if sc.deleted_at is not null then
      raise exception 'La tarjeta está dada de baja';
    end if;
    if not exists (select 1 from holes h where h.id = new.hole_id and h.course_version_id = sc.course_version_id and h.deleted_at is null) then
      raise exception 'El hoyo no pertenece a la versión de cancha de la partida';
    end if;
    if new.position > sc.holes_count * sc.loops or (sc.holes_played <> 'completa' and new.position > 9) then
      raise exception 'La posición % excede los hoyos jugados en la partida', new.position;
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists b_guard on hole_scores;
create trigger b_guard before insert or update or delete on hole_scores
  for each row execute function guard_hole_score_write();

-- Firmas: solo el propio golfista (o service_role, p.ej. importación); estados coherentes; snapshot obligatorio al firmar.
create or replace function guard_signature_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare sc scorecards%rowtype;
begin
  select * into sc from scorecards where id = new.scorecard_id;
  if sc.id is null or sc.deleted_at is not null then
    raise exception 'La tarjeta no existe o está dada de baja';
  end if;
  if auth.uid() is not null
     and not exists (select 1 from players where id = sc.player_id and user_id = auth.uid() and deleted_at is null) then
    raise exception 'Solo el golfista puede firmar o desfirmar su tarjeta';
  end if;
  if new.action = 'firmar' and sc.signed_at is not null then
    raise exception 'La tarjeta ya está firmada';
  end if;
  if new.action = 'desfirmar' and sc.signed_at is null then
    raise exception 'La tarjeta no está firmada';
  end if;
  return new;
end $$;
drop trigger if exists b_guard on scorecard_signatures;
create trigger b_guard before insert on scorecard_signatures
  for each row execute function guard_signature_insert();

-- Proyecta el último evento sobre la tarjeta (estado denormalizado para RLS e índices).
create or replace function apply_signature()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update scorecards
  set signed_at = case when new.action = 'firmar' then new.created_at end,
      current_signature_id = new.id
  where id = new.scorecard_id;
  return new;
end $$;
drop trigger if exists z_apply on scorecard_signatures;
create trigger z_apply after insert on scorecard_signatures
  for each row execute function apply_signature();

-- RPC de firma: arma el snapshot con datos de la cancha y del tee; el cálculo WHS (hándicap de cancha,
-- gross ajustado, diferencial) lo hace la app y se guarda tal cual se usó.
create or replace function sign_scorecard(
  p_scorecard_id uuid,
  p_handicap_source handicap_source,
  p_handicap_index numeric,
  p_course_handicap int,
  p_adjusted_gross int,
  p_differential numeric
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  sc record;
  v_gross int;
  v_par int;
  v_id uuid;
begin
  select s.id, s.is_legacy, s.legacy_gross, r.tee_set_id, r.course_version_id, r.holes_played, r.loops, t.course_rating, t.slope
  into sc
  from scorecards s
  join rounds r on r.id = s.round_id
  join tee_sets t on t.id = r.tee_set_id
  where s.id = p_scorecard_id and s.deleted_at is null;
  if sc.id is null then
    raise exception 'Tarjeta inexistente o sin permiso';
  end if;

  if sc.is_legacy then
    v_gross := sc.legacy_gross;
    select sum(h.par) * sc.loops into v_par from holes h where h.course_version_id = sc.course_version_id and h.deleted_at is null;
  else
    select sum(hs.strokes), sum(h.par)
    into v_gross, v_par
    from hole_scores hs join holes h on h.id = hs.hole_id
    where hs.scorecard_id = sc.id and hs.deleted_at is null;
    if v_gross is null then
      raise exception 'La tarjeta no tiene golpes cargados';
    end if;
  end if;

  insert into scorecard_signatures (
    scorecard_id, action, handicap_source, handicap_index, course_handicap,
    course_rating, slope, par, holes_played, gross, adjusted_gross, differential
  ) values (
    p_scorecard_id, 'firmar', p_handicap_source, p_handicap_index, p_course_handicap,
    sc.course_rating, sc.slope, v_par, sc.holes_played, v_gross, p_adjusted_gross, p_differential
  ) returning id into v_id;
  return v_id;
end $$;

create or replace function unsign_scorecard(p_scorecard_id uuid, p_reason text default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  insert into scorecard_signatures (scorecard_id, action, reason)
  values (p_scorecard_id, 'desfirmar', p_reason)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Privilegios de columna: el estado de firma solo lo escriben los triggers.
-- ---------------------------------------------------------------------------
revoke update on scorecards from authenticated;
grant update (round_id, player_id, is_legacy, legacy_gross) on scorecards to authenticated;
-- Borrado físico: nunca desde la app (el trigger a02_soft_delete convierte todo DELETE en baja lógica).

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table player_declared_handicaps enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table courses enable row level security;
alter table course_versions enable row level security;
alter table holes enable row level security;
alter table hazard_types enable row level security;
alter table hole_hazards enable row level security;
alter table tee_sets enable row level security;
alter table tee_hole_distances enable row level security;
alter table round_formats enable row level security;
alter table rounds enable row level security;
alter table scorecards enable row level security;
alter table hole_scores enable row level security;
alter table scorecard_signatures enable row level security;
alter table handicap_index_snapshots enable row level security;
alter table round_photos enable row level security;
alter table round_photo_extractions enable row level security;

-- Golfistas: todos los autenticados ven a los activos (hace falta para armar partidas e invitar).
drop policy if exists players_select on players;
create policy players_select on players for select to authenticated
  using (deleted_at is null);
drop policy if exists players_update_own on players;
create policy players_update_own on players for update to authenticated
  using (deleted_at is null and user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- Invitados: cualquiera los crea; los edita/da de baja quien los creó.
drop policy if exists players_insert_guest on players;
create policy players_insert_guest on players for insert to authenticated
  with check (user_id is null);
drop policy if exists players_update_guest on players;
create policy players_update_guest on players for update to authenticated
  using (deleted_at is null and user_id is null and created_by = (select current_player_id()))
  with check (user_id is null);
drop policy if exists players_delete_guest on players;
create policy players_delete_guest on players for delete to authenticated
  using (deleted_at is null and user_id is null and created_by = (select current_player_id()));

drop policy if exists declared_handicaps_select on player_declared_handicaps;
create policy declared_handicaps_select on player_declared_handicaps for select to authenticated
  using (deleted_at is null and shares_group_with(player_id));
drop policy if exists declared_handicaps_insert on player_declared_handicaps;
create policy declared_handicaps_insert on player_declared_handicaps for insert to authenticated
  with check (
    player_id = (select current_player_id())
    or exists (select 1 from players p where p.id = player_id and p.user_id is null and p.created_by = (select current_player_id()))
  );
drop policy if exists declared_handicaps_update on player_declared_handicaps;
create policy declared_handicaps_update on player_declared_handicaps for update to authenticated
  using (deleted_at is null and player_id = (select current_player_id()))
  with check (player_id = (select current_player_id()));
drop policy if exists declared_handicaps_delete on player_declared_handicaps;
create policy declared_handicaps_delete on player_declared_handicaps for delete to authenticated
  using (deleted_at is null and player_id = (select current_player_id()));

-- Grupos
drop policy if exists groups_select on groups;
create policy groups_select on groups for select to authenticated
  using (deleted_at is null and is_group_member(id));
drop policy if exists groups_insert on groups;
create policy groups_insert on groups for insert to authenticated
  with check (created_by = (select current_player_id()));
drop policy if exists groups_update on groups;
create policy groups_update on groups for update to authenticated
  using (deleted_at is null and is_group_admin(id))
  with check (is_group_admin(id));
drop policy if exists groups_delete on groups;
create policy groups_delete on groups for delete to authenticated
  using (deleted_at is null and is_group_admin(id));

drop policy if exists members_select on group_members;
create policy members_select on group_members for select to authenticated
  using (deleted_at is null and is_group_member(group_id));
-- El creador se agrega a sí mismo como admin; el resto entra por join_group.
drop policy if exists members_insert_creator on group_members;
create policy members_insert_creator on group_members for insert to authenticated
  with check (
    player_id = (select current_player_id())
    and exists (select 1 from groups g where g.id = group_id and g.created_by = (select current_player_id()) and g.deleted_at is null)
  );
-- Solo un admin cambia roles; salir del grupo es un DELETE propio (baja lógica) o del admin.
drop policy if exists members_update on group_members;
create policy members_update on group_members for update to authenticated
  using (deleted_at is null and is_group_admin(group_id))
  with check (is_group_admin(group_id));
drop policy if exists members_delete on group_members;
create policy members_delete on group_members for delete to authenticated
  using (deleted_at is null and (player_id = (select current_player_id()) or is_group_admin(group_id)));

-- Crear grupo: security definer para crear grupo + pertenencia admin en un paso (el creador aún no es miembro
-- y por eso no vería la fila recién insertada con RETURNING).
create or replace function create_group(p_name text, p_invite_code text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid; me uuid := current_player_id();
begin
  if me is null then raise exception 'Sin golfista autenticado'; end if;
  insert into groups (name, invite_code, created_by)
  values (p_name, coalesce(p_invite_code, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))), me)
  returning id into g;
  insert into group_members (group_id, player_id, role, created_by) values (g, me, 'admin', me);
  return g;
end $$;

-- Unirse por código: security definer porque el que se une aún no ve el grupo.
create or replace function join_group(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid; me uuid := current_player_id();
begin
  if me is null then raise exception 'Sin golfista autenticado'; end if;
  select id into g from groups where invite_code = code and deleted_at is null;
  if g is null then raise exception 'Código de invitación inválido'; end if;
  if not exists (select 1 from group_members where group_id = g and player_id = me and deleted_at is null) then
    insert into group_members (group_id, player_id, created_by) values (g, me, me);
  end if;
  return g;
end $$;

-- Canchas y catálogos: lectura de lo activo y edición abiertas a todo golfista (comunidad chica).
drop policy if exists courses_select on courses;
create policy courses_select on courses for select to authenticated using (deleted_at is null);
drop policy if exists courses_write on courses;
create policy courses_write on courses for insert to authenticated with check (true);
drop policy if exists courses_update on courses;
create policy courses_update on courses for update to authenticated using (deleted_at is null) with check (true);
drop policy if exists courses_delete on courses;
create policy courses_delete on courses for delete to authenticated using (deleted_at is null);

drop policy if exists course_versions_select on course_versions;
create policy course_versions_select on course_versions for select to authenticated using (deleted_at is null);
drop policy if exists course_versions_insert on course_versions;
create policy course_versions_insert on course_versions for insert to authenticated with check (true);
drop policy if exists course_versions_update on course_versions;
create policy course_versions_update on course_versions for update to authenticated using (deleted_at is null) with check (true);
drop policy if exists course_versions_delete on course_versions;
create policy course_versions_delete on course_versions for delete to authenticated using (deleted_at is null);

drop policy if exists holes_select on holes;
create policy holes_select on holes for select to authenticated using (deleted_at is null);
drop policy if exists holes_insert on holes;
create policy holes_insert on holes for insert to authenticated with check (true);
drop policy if exists holes_update on holes;
create policy holes_update on holes for update to authenticated using (deleted_at is null) with check (true);
drop policy if exists holes_delete on holes;
create policy holes_delete on holes for delete to authenticated using (deleted_at is null);

drop policy if exists hazard_types_select on hazard_types;
create policy hazard_types_select on hazard_types for select to authenticated using (deleted_at is null);

drop policy if exists hole_hazards_select on hole_hazards;
create policy hole_hazards_select on hole_hazards for select to authenticated using (deleted_at is null);
drop policy if exists hole_hazards_insert on hole_hazards;
create policy hole_hazards_insert on hole_hazards for insert to authenticated with check (true);
drop policy if exists hole_hazards_update on hole_hazards;
create policy hole_hazards_update on hole_hazards for update to authenticated using (deleted_at is null) with check (true);
drop policy if exists hole_hazards_delete on hole_hazards;
create policy hole_hazards_delete on hole_hazards for delete to authenticated using (deleted_at is null);

drop policy if exists tee_sets_select on tee_sets;
create policy tee_sets_select on tee_sets for select to authenticated using (deleted_at is null);
drop policy if exists tee_sets_insert on tee_sets;
create policy tee_sets_insert on tee_sets for insert to authenticated with check (true);
drop policy if exists tee_sets_update on tee_sets;
create policy tee_sets_update on tee_sets for update to authenticated using (deleted_at is null) with check (true);
drop policy if exists tee_sets_delete on tee_sets;
create policy tee_sets_delete on tee_sets for delete to authenticated using (deleted_at is null);

drop policy if exists tee_distances_select on tee_hole_distances;
create policy tee_distances_select on tee_hole_distances for select to authenticated using (deleted_at is null);
drop policy if exists tee_distances_insert on tee_hole_distances;
create policy tee_distances_insert on tee_hole_distances for insert to authenticated with check (true);
drop policy if exists tee_distances_update on tee_hole_distances;
create policy tee_distances_update on tee_hole_distances for update to authenticated using (deleted_at is null) with check (true);
drop policy if exists tee_distances_delete on tee_hole_distances;
create policy tee_distances_delete on tee_hole_distances for delete to authenticated using (deleted_at is null);

drop policy if exists round_formats_select on round_formats;
create policy round_formats_select on round_formats for select to authenticated using (deleted_at is null);

-- Partidas
drop policy if exists rounds_select on rounds;
-- created_by primero: evita la subconsulta y permite INSERT ... RETURNING (la fila nueva aún no es visible
-- para la función dentro del mismo comando).
create policy rounds_select on rounds for select to authenticated
  using (deleted_at is null and (created_by = (select current_player_id()) or can_view_round(id)));
drop policy if exists rounds_insert on rounds;
create policy rounds_insert on rounds for insert to authenticated
  with check (created_by = (select current_player_id()));
drop policy if exists rounds_update on rounds;
create policy rounds_update on rounds for update to authenticated
  using (deleted_at is null and is_round_participant(id))
  with check (is_round_participant(id));
drop policy if exists rounds_delete on rounds;
create policy rounds_delete on rounds for delete to authenticated
  using (deleted_at is null and created_by = (select current_player_id()));

drop policy if exists scorecards_select on scorecards;
create policy scorecards_select on scorecards for select to authenticated
  using (deleted_at is null and can_view_round(round_id));
drop policy if exists scorecards_insert on scorecards;
create policy scorecards_insert on scorecards for insert to authenticated
  with check (is_round_participant(round_id));
drop policy if exists scorecards_update on scorecards;
create policy scorecards_update on scorecards for update to authenticated
  using (deleted_at is null and is_round_participant(round_id))
  with check (is_round_participant(round_id));
drop policy if exists scorecards_delete on scorecards;
create policy scorecards_delete on scorecards for delete to authenticated
  using (deleted_at is null and signed_at is null and is_round_participant(round_id));

drop policy if exists hole_scores_select on hole_scores;
create policy hole_scores_select on hole_scores for select to authenticated
  using (deleted_at is null and exists (
    select 1 from scorecards s where s.id = scorecard_id and s.deleted_at is null and can_view_round(s.round_id)));
drop policy if exists hole_scores_insert on hole_scores;
create policy hole_scores_insert on hole_scores for insert to authenticated
  with check (exists (
    select 1 from scorecards s where s.id = scorecard_id and s.deleted_at is null and is_round_participant(s.round_id)));
drop policy if exists hole_scores_update on hole_scores;
create policy hole_scores_update on hole_scores for update to authenticated
  using (deleted_at is null and exists (
    select 1 from scorecards s where s.id = scorecard_id and s.deleted_at is null and is_round_participant(s.round_id)))
  with check (exists (
    select 1 from scorecards s where s.id = scorecard_id and s.deleted_at is null and is_round_participant(s.round_id)));
drop policy if exists hole_scores_delete on hole_scores;
create policy hole_scores_delete on hole_scores for delete to authenticated
  using (deleted_at is null and exists (
    select 1 from scorecards s where s.id = scorecard_id and s.deleted_at is null and is_round_participant(s.round_id)));

-- Firmas: las ve quien ve la partida; las inserta solo el dueño de la tarjeta; nunca se editan.
drop policy if exists signatures_select on scorecard_signatures;
create policy signatures_select on scorecard_signatures for select to authenticated
  using (exists (select 1 from scorecards s where s.id = scorecard_id and can_view_round(s.round_id)));
drop policy if exists signatures_insert on scorecard_signatures;
create policy signatures_insert on scorecard_signatures for insert to authenticated
  with check (exists (
    select 1 from scorecards s where s.id = scorecard_id and s.deleted_at is null and s.player_id = (select current_player_id())));

drop policy if exists hi_snapshots_select on handicap_index_snapshots;
create policy hi_snapshots_select on handicap_index_snapshots for select to authenticated
  using (shares_group_with(player_id));
drop policy if exists hi_snapshots_insert on handicap_index_snapshots;
create policy hi_snapshots_insert on handicap_index_snapshots for insert to authenticated
  with check (player_id = (select current_player_id()));

drop policy if exists photos_select on round_photos;
create policy photos_select on round_photos for select to authenticated
  using (deleted_at is null and can_view_round(round_id));
drop policy if exists photos_insert on round_photos;
create policy photos_insert on round_photos for insert to authenticated
  with check (is_round_participant(round_id));
drop policy if exists photos_update on round_photos;
create policy photos_update on round_photos for update to authenticated
  using (deleted_at is null and is_round_participant(round_id))
  with check (is_round_participant(round_id));
drop policy if exists photos_delete on round_photos;
create policy photos_delete on round_photos for delete to authenticated
  using (deleted_at is null and is_round_participant(round_id));

drop policy if exists extractions_select on round_photo_extractions;
create policy extractions_select on round_photo_extractions for select to authenticated
  using (exists (select 1 from round_photos p where p.id = round_photo_id and can_view_round(p.round_id)));
drop policy if exists extractions_insert on round_photo_extractions;
create policy extractions_insert on round_photo_extractions for insert to authenticated
  with check (exists (select 1 from round_photos p where p.id = round_photo_id and p.deleted_at is null and is_round_participant(p.round_id)));

-- Funciones internas: no se exponen como RPC.
revoke execute on function attach_audit(regclass), attach_append_only(regclass) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: fotos de tarjeta en bucket privado; ruta = <round_id>/<archivo>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scorecard-photos', 'scorecard-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists photos_storage_read on storage.objects;
create policy photos_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'scorecard-photos' and can_view_round((storage.foldername(name))[1]::uuid));
drop policy if exists photos_storage_write on storage.objects;
create policy photos_storage_write on storage.objects for insert to authenticated
  with check (bucket_id = 'scorecard-photos' and is_round_participant((storage.foldername(name))[1]::uuid));

-- ---------------------------------------------------------------------------
-- Catálogos iniciales
-- ---------------------------------------------------------------------------
insert into round_formats (code, label, sort_order)
select v.code, v.label, v.sort_order
from (values ('medal', 'Medal (golpes)', 10)) as v (code, label, sort_order)
where not exists (select 1 from round_formats r where r.code = v.code and r.deleted_at is null);

insert into hazard_types (code, label, sort_order)
select v.code, v.label, v.sort_order
from (values
  ('bunker', 'Bunker', 10),
  ('agua', 'Agua', 20),
  ('fuera_de_limites', 'Fuera de límites', 30),
  ('arboles', 'Árboles', 40),
  ('barranca', 'Barranca', 50)
) as v (code, label, sort_order)
where not exists (select 1 from hazard_types h where h.code = v.code and h.deleted_at is null);
