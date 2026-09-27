-- Cambiar la cancha de una partida con tarjetas firmadas. Decisión del dueño (2026-09-27): en vez de pedir que
-- cada uno desfirme, el cambio desfirma y vuelve a firmar cada tarjeta firmada con la cancha nueva (mismos
-- golpes, mismo índice del día) y queda registrado quién lo hizo, con el motivo en el evento `desfirmar`.
--
-- Los valores del WHS los calcula el servidor con el motor de la app (`resignature`, src/lib/sign-estimate.ts).
-- Por eso change_round_course_resign solo la ejecuta service_role: la llama la acción de servidor después de
-- verificar con la sesión del usuario que juega la partida o la creó. Así nadie manda valores para la tarjeta
-- de otro desde el cliente. Sin firmas se sigue usando change_round_course (0006, invoker, con RLS).

-- Firma con autor explícito: el cuerpo de sign_scorecard (0001), más `created_by`. Con p_actor nulo queda el
-- golfista de la sesión (set_created_columns), como siempre.
create or replace function private.sign_as(
  p_scorecard_id uuid,
  p_handicap_source handicap_source,
  p_handicap_index numeric,
  p_course_handicap int,
  p_adjusted_gross int,
  p_differential numeric,
  p_actor uuid
) returns uuid language plpgsql security invoker set search_path = public, private as $$
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
    course_rating, slope, par, holes_played, gross, adjusted_gross, differential, created_by
  ) values (
    p_scorecard_id, 'firmar', p_handicap_source, p_handicap_index, p_course_handicap,
    sc.course_rating, sc.slope, v_par, sc.holes_played, v_gross, p_adjusted_gross, p_differential, p_actor
  ) returning id into v_id;
  return v_id;
end $$;

revoke execute on function private.sign_as(uuid, handicap_source, numeric, int, int, numeric, uuid) from public, anon;
grant execute on function private.sign_as(uuid, handicap_source, numeric, int, int, numeric, uuid) to authenticated, service_role;

-- Misma firma y mismo comportamiento que en 0001; el cuerpo vive en private.sign_as.
create or replace function sign_scorecard(
  p_scorecard_id uuid,
  p_handicap_source handicap_source,
  p_handicap_index numeric,
  p_course_handicap int,
  p_adjusted_gross int,
  p_differential numeric
) returns uuid language plpgsql security invoker set search_path = public, private as $$
begin
  return private.sign_as(p_scorecard_id, p_handicap_source, p_handicap_index, p_course_handicap, p_adjusted_gross, p_differential, null);
end $$;

create or replace function change_round_course_resign(
  p_actor uuid,
  p_round_id uuid,
  p_course_version_id uuid,
  p_tee_set_id uuid,
  p_holes_played round_holes,
  p_loops int,
  p_hole_map jsonb,
  p_resign jsonb,
  p_reason text
)
returns void language plpgsql security invoker set search_path = public, private as $$
declare card record;
begin
  if not exists (
    select 1 from rounds r
    where r.id = p_round_id and r.deleted_at is null
      and (r.created_by = p_actor
        or exists (select 1 from scorecards s where s.round_id = r.id and s.player_id = p_actor and s.deleted_at is null))
  ) then
    raise exception 'No encontramos la partida o no podés editarla';
  end if;

  -- Se vuelve a firmar exactamente lo que estaba firmado (si alguien firmó o desfirmó mientras tanto, no).
  if exists (
    select s.id from scorecards s where s.round_id = p_round_id and s.deleted_at is null and s.signed_at is not null
    except
    select r.scorecard_id from jsonb_to_recordset(p_resign) r(scorecard_id uuid)
  ) or exists (
    select r.scorecard_id from jsonb_to_recordset(p_resign) r(scorecard_id uuid)
    except
    select s.id from scorecards s where s.round_id = p_round_id and s.deleted_at is null and s.signed_at is not null
  ) then
    raise exception 'Las firmas de la partida cambiaron mientras tanto; volvé a intentar';
  end if;

  insert into scorecard_signatures (scorecard_id, action, reason, created_by)
  select s.id, 'desfirmar', p_reason, p_actor
  from scorecards s
  where s.round_id = p_round_id and s.deleted_at is null and s.signed_at is not null;

  -- Lo mismo que change_round_course (0006), con el autor explícito (service_role no tiene golfista).
  update rounds
  set course_version_id = p_course_version_id, tee_set_id = p_tee_set_id, holes_played = p_holes_played, loops = p_loops,
      updated_by = p_actor
  where id = p_round_id;

  if exists (
    select 1 from hole_scores hs join scorecards s on s.id = hs.scorecard_id
    where s.round_id = p_round_id and s.deleted_at is null and hs.deleted_at is null
      and not exists (select 1 from jsonb_to_recordset(p_hole_map) m(position int, hole_id uuid) where m.position = hs.position)
  ) then
    raise exception 'Hay golpes en hoyos que no existen en la cancha nueva';
  end if;

  update hole_scores hs
  set hole_id = m.hole_id, updated_by = p_actor
  from scorecards s, jsonb_to_recordset(p_hole_map) m(position int, hole_id uuid)
  where s.id = hs.scorecard_id and s.round_id = p_round_id and s.deleted_at is null
    and hs.deleted_at is null and m.position = hs.position and hs.hole_id is distinct from m.hole_id;

  for card in
    select * from jsonb_to_recordset(p_resign)
      r(scorecard_id uuid, handicap_source handicap_source, handicap_index numeric, course_handicap int, adjusted_gross int, differential numeric)
  loop
    perform private.sign_as(card.scorecard_id, card.handicap_source, card.handicap_index, card.course_handicap, card.adjusted_gross, card.differential, p_actor);
  end loop;
end $$;

revoke execute on function change_round_course_resign(uuid, uuid, uuid, uuid, round_holes, int, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function change_round_course_resign(uuid, uuid, uuid, uuid, round_holes, int, jsonb, jsonb, text) to service_role;
