-- Firmar las tarjetas de los demás. Decisión del dueño (2026-10-27): en una partida, cualquiera de los que juegan
-- puede firmar las tarjetas sin firmar de los otros golfistas de esa partida, como el marcador que certifica la
-- tarjeta del compañero. Cada firma queda a nombre de quien firmó (`created_by`) y el dueño de la tarjeta la puede
-- desfirmar (guard_signature_insert sigue dejando desfirmar solo al dueño).
--
-- Como change_round_course_resign (0007), los valores del WHS los calcula el servidor con el motor de la app y
-- solo service_role ejecuta la función: la acción de servidor verifica antes con la sesión quién firma. Así nadie
-- manda desde el cliente los valores de la tarjeta de otro. Firmar la propia sigue siendo sign_scorecard.
-- No firma invitados (no tienen cuenta ni historial propio) ni tarjetas históricas.

create or replace function sign_scorecards_as(
  p_actor uuid,
  p_round_id uuid,
  p_signs jsonb
)
returns int language plpgsql security invoker set search_path = public, private as $$
declare
  card record;
  v_count int := 0;
begin
  if not exists (
    select 1 from rounds r
    join scorecards s on s.round_id = r.id and s.deleted_at is null
    where r.id = p_round_id and r.deleted_at is null and s.player_id = p_actor
  ) then
    raise exception 'Solo los que juegan la partida pueden firmar las tarjetas de los demás';
  end if;

  for card in
    select * from jsonb_to_recordset(p_signs)
      r(scorecard_id uuid, handicap_source handicap_source, handicap_index numeric, course_handicap int, adjusted_gross int, differential numeric)
  loop
    if not exists (
      select 1 from scorecards s join players p on p.id = s.player_id
      where s.id = card.scorecard_id and s.round_id = p_round_id and s.deleted_at is null
        and s.signed_at is null and not s.is_legacy and p.user_id is not null
    ) then
      raise exception 'Una de las tarjetas no es de esta partida, ya está firmada o es de un invitado';
    end if;
    perform private.sign_as(card.scorecard_id, card.handicap_source, card.handicap_index, card.course_handicap, card.adjusted_gross, card.differential, p_actor);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke execute on function sign_scorecards_as(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function sign_scorecards_as(uuid, uuid, jsonb) to service_role;
