-- Cambiar la cancha (y el tee) de una partida cargada en la equivocada. En una transacción: la partida pasa
-- a la versión y el tee nuevos, y cada golpe pasa al hoyo que ocupa su misma posición en la cancha nueva.
-- El mapa posición → hoyo lo arma la app con `positionsFor` (src/lib/round-model.ts), así el orden de juego
-- (ida, vuelta, dos vueltas) vive en un solo lugar.
-- Invoker: valen las políticas de siempre (participantes o quien creó la partida) y los guards:
-- guard_round_update rechaza el cambio si hay tarjetas firmadas y guard_hole_score_write exige que el hoyo
-- sea de la versión de la partida.
create or replace function change_round_course(
  p_round_id uuid,
  p_course_version_id uuid,
  p_tee_set_id uuid,
  p_holes_played round_holes,
  p_loops int,
  p_hole_map jsonb
)
returns void language plpgsql security invoker set search_path = public, private as $$
declare n int;
begin
  update rounds
  set course_version_id = p_course_version_id, tee_set_id = p_tee_set_id, holes_played = p_holes_played, loops = p_loops
  where id = p_round_id and deleted_at is null;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'No encontramos la partida o no podés editarla';
  end if;

  if exists (
    select 1 from hole_scores hs join scorecards s on s.id = hs.scorecard_id
    where s.round_id = p_round_id and s.deleted_at is null and hs.deleted_at is null
      and not exists (select 1 from jsonb_to_recordset(p_hole_map) m(position int, hole_id uuid) where m.position = hs.position)
  ) then
    raise exception 'Hay golpes en hoyos que no existen en la cancha nueva';
  end if;

  update hole_scores hs
  set hole_id = m.hole_id
  from scorecards s, jsonb_to_recordset(p_hole_map) m(position int, hole_id uuid)
  where s.id = hs.scorecard_id and s.round_id = p_round_id and s.deleted_at is null
    and hs.deleted_at is null and m.position = hs.position and hs.hole_id is distinct from m.hole_id;
end $$;

revoke execute on function change_round_course(uuid, uuid, uuid, round_holes, int, jsonb) from public, anon;
grant execute on function change_round_course(uuid, uuid, uuid, round_holes, int, jsonb) to authenticated;
