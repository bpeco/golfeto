-- Galf: esquema inicial. Vocabulario en CONTEXT.md.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Golfistas e invitados
-- ---------------------------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null,
  email text,
  declared_handicap numeric(4, 1) check (declared_handicap between -10 and 54),
  created_at timestamptz not null default now()
);
comment on table players is 'Golfista (user_id presente) o Invitado (user_id nulo).';

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function current_player_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from players where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Grupos
-- ---------------------------------------------------------------------------
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique,
  created_by uuid not null references players (id),
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);

create or replace function is_group_member(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members where group_id = g and player_id = current_player_id()
  )
$$;

create or replace function is_group_admin(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and player_id = current_player_id() and role = 'admin'
  )
$$;

-- Comparte al menos un grupo con el golfista dado (o es él mismo).
create or replace function shares_group_with(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p = current_player_id() or exists (
    select 1 from group_members a
    join group_members b on a.group_id = b.group_id
    where a.player_id = current_player_id() and b.player_id = p
  )
$$;

-- ---------------------------------------------------------------------------
-- Canchas (versionadas, ADR-0001)
-- ---------------------------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club text,
  city text,
  holes_count int not null check (holes_count in (9, 18)),
  created_by uuid references players (id),
  created_at timestamptz not null default now()
);

create table course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  valid_from date not null default current_date,
  valid_to date,
  notes text,
  created_by uuid references players (id),
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);
create index on course_versions (course_id, valid_from desc);

create table holes (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id) on delete cascade,
  number int not null check (number between 1 and 18),
  par int not null check (par between 3 and 6),
  stroke_index int check (stroke_index between 1 and 18),
  bunkers int check (bunkers >= 0),
  water boolean,
  dogleg text check (dogleg in ('izquierda', 'derecha')),
  notes text,
  unique (course_version_id, number)
);

create table tee_sets (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id) on delete cascade,
  name text not null,
  course_rating numeric(4, 1) check (course_rating between 40 and 90),
  slope int check (slope between 55 and 155),
  unique (course_version_id, name)
);

create table tee_hole_distances (
  tee_set_id uuid not null references tee_sets (id) on delete cascade,
  hole_id uuid not null references holes (id) on delete cascade,
  meters int check (meters > 0),
  primary key (tee_set_id, hole_id)
);

-- ---------------------------------------------------------------------------
-- Partidas y tarjetas
-- ---------------------------------------------------------------------------
create table rounds (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references course_versions (id),
  tee_set_id uuid not null references tee_sets (id),
  played_on date not null default current_date,
  holes_played text not null default '18' check (holes_played in ('18', 'ida', 'vuelta')),
  loops int not null default 1 check (loops in (1, 2)),
  format text not null default 'medal' check (format in ('medal')),
  notes text,
  created_by uuid not null references players (id),
  created_at timestamptz not null default now()
);
comment on column rounds.loops is '2 = cancha de 9 jugada ida y vuelta (Vuelta en CONTEXT.md).';

create table scorecards (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  player_id uuid not null references players (id),
  status text not null default 'borrador' check (status in ('borrador', 'firmada')),
  signed_at timestamptz,
  is_legacy boolean not null default false,
  legacy_total int check (legacy_total between 18 and 300),
  date_approximate boolean not null default false,
  -- Snapshot al firmar: lo que se usó para calcular, para que la historia no cambie.
  course_handicap int,
  adjusted_gross int,
  differential numeric(4, 1),
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);
create index on scorecards (player_id, status);

create table hole_scores (
  scorecard_id uuid not null references scorecards (id) on delete cascade,
  position int not null check (position between 1 and 18),
  strokes int check (strokes between 1 and 30),
  picked_up boolean not null default false,
  primary key (scorecard_id, position),
  check (not (picked_up and strokes is not null))
);
comment on column hole_scores.position is 'Orden dentro de la partida (1..18). En 2 vueltas, 10..18 son los hoyos 1..9 de nuevo.';

create table round_photos (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references players (id),
  extraction jsonb,
  created_at timestamptz not null default now()
);

create or replace function is_round_participant(r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from scorecards where round_id = r and player_id = current_player_id()
  ) or exists (
    select 1 from rounds where id = r and created_by = current_player_id()
  )
$$;

-- ADR-0002: un grupo ve toda partida en la que jugó alguno de sus miembros.
create or replace function can_view_round(r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_round_participant(r) or exists (
    select 1 from scorecards s where s.round_id = r and shares_group_with(s.player_id)
  )
$$;

-- Solo el propio golfista firma/desfirma; los golpes de una tarjeta firmada no se tocan.
create or replace function guard_scorecard_update()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if not exists (select 1 from players where id = old.player_id and user_id = auth.uid()) then
      raise exception 'Solo el golfista puede firmar o desfirmar su tarjeta';
    end if;
    new.signed_at := case when new.status = 'firmada' then now() else null end;
  end if;
  return new;
end $$;

create trigger scorecards_guard before update on scorecards
  for each row execute function guard_scorecard_update();

create or replace function guard_hole_score_write()
returns trigger language plpgsql as $$
declare sc_status text;
begin
  select status into sc_status from scorecards where id = coalesce(new.scorecard_id, old.scorecard_id);
  if sc_status = 'firmada' then
    raise exception 'La tarjeta está firmada; desfirmala para editar';
  end if;
  return coalesce(new, old);
end $$;

create trigger hole_scores_guard before insert or update or delete on hole_scores
  for each row execute function guard_hole_score_write();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table courses enable row level security;
alter table course_versions enable row level security;
alter table holes enable row level security;
alter table tee_sets enable row level security;
alter table tee_hole_distances enable row level security;
alter table rounds enable row level security;
alter table scorecards enable row level security;
alter table hole_scores enable row level security;
alter table round_photos enable row level security;

-- Golfistas: todos los autenticados se ven (hace falta para armar partidas e invitar).
create policy players_select on players for select to authenticated using (true);
create policy players_update_own on players for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy players_insert_guest on players for insert to authenticated
  with check (user_id is null);

-- Grupos
create policy groups_select on groups for select to authenticated using (is_group_member(id));
create policy groups_insert on groups for insert to authenticated
  with check (created_by = current_player_id());
create policy groups_update on groups for update to authenticated
  using (is_group_admin(id)) with check (is_group_admin(id));
create policy groups_delete on groups for delete to authenticated using (is_group_admin(id));

create policy members_select on group_members for select to authenticated
  using (is_group_member(group_id));
create policy members_insert_creator on group_members for insert to authenticated
  with check (
    player_id = current_player_id()
    and exists (select 1 from groups g where g.id = group_id and g.created_by = current_player_id())
  );
create policy members_delete on group_members for delete to authenticated
  using (player_id = current_player_id() or is_group_admin(group_id));

-- Unirse por código: security definer porque el que se une aún no ve el grupo.
create or replace function join_group(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select id into g from groups where invite_code = code;
  if g is null then raise exception 'Código de invitación inválido'; end if;
  insert into group_members (group_id, player_id) values (g, current_player_id())
  on conflict do nothing;
  return g;
end $$;

-- Canchas: lectura y edición abiertas a todo golfista.
create policy courses_all on courses for all to authenticated using (true) with check (true);
create policy course_versions_all on course_versions for all to authenticated using (true) with check (true);
create policy holes_all on holes for all to authenticated using (true) with check (true);
create policy tee_sets_all on tee_sets for all to authenticated using (true) with check (true);
create policy tee_distances_all on tee_hole_distances for all to authenticated using (true) with check (true);

-- Partidas
create policy rounds_select on rounds for select to authenticated using (can_view_round(id));
create policy rounds_insert on rounds for insert to authenticated
  with check (created_by = current_player_id());
create policy rounds_update on rounds for update to authenticated
  using (is_round_participant(id)) with check (is_round_participant(id));
create policy rounds_delete on rounds for delete to authenticated
  using (created_by = current_player_id());

create policy scorecards_select on scorecards for select to authenticated
  using (can_view_round(round_id));
create policy scorecards_insert on scorecards for insert to authenticated
  with check (is_round_participant(round_id));
create policy scorecards_update on scorecards for update to authenticated
  using (is_round_participant(round_id)) with check (is_round_participant(round_id));
create policy scorecards_delete on scorecards for delete to authenticated
  using (is_round_participant(round_id) and status = 'borrador');

create policy hole_scores_select on hole_scores for select to authenticated
  using (exists (select 1 from scorecards s where s.id = scorecard_id and can_view_round(s.round_id)));
create policy hole_scores_write on hole_scores for all to authenticated
  using (exists (select 1 from scorecards s where s.id = scorecard_id and is_round_participant(s.round_id)))
  with check (exists (select 1 from scorecards s where s.id = scorecard_id and is_round_participant(s.round_id)));

create policy photos_select on round_photos for select to authenticated using (can_view_round(round_id));
create policy photos_write on round_photos for all to authenticated
  using (is_round_participant(round_id)) with check (is_round_participant(round_id));

-- Fotos de tarjeta: bucket privado; ruta = <round_id>/<archivo>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scorecard-photos', 'scorecard-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy photos_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'scorecard-photos' and can_view_round((storage.foldername(name))[1]::uuid));
create policy photos_storage_write on storage.objects for insert to authenticated
  with check (bucket_id = 'scorecard-photos' and is_round_participant((storage.foldername(name))[1]::uuid));
