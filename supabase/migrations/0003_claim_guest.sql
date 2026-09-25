-- Un invitado que se registra reclama su historial: sus tarjetas, partidas, pertenencias y hándicaps
-- declarados pasan al golfista real; el invitado queda dado de baja apuntando a él (merged_into_player_id).
-- Decisión de diseño: se reasigna player_id (queda auditado), no se sigue el puntero en el cálculo.

-- La guarda de tarjeta firmada no permite cambiar player_id; el merge lo habilita con una variable de sesión.
create or replace function guard_scorecard_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('galf.merging', true) = 'on' then
    return new;
  end if;
  if old.signed_at is not null and new.signed_at is not null
     and (new.round_id, new.player_id, new.is_legacy, new.legacy_gross, new.deleted_at)
         is distinct from (old.round_id, old.player_id, old.is_legacy, old.legacy_gross, old.deleted_at) then
    raise exception 'La tarjeta está firmada; desfirmala para editarla o darla de baja';
  end if;
  return new;
end $$;

create or replace function claim_guest(p_guest_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := current_player_id();
begin
  if me is null then raise exception 'Sin golfista autenticado'; end if;
  if not exists (
    select 1 from players where id = p_guest_id and user_id is null and deleted_at is null and merged_into_player_id is null
  ) then
    raise exception 'El invitado no existe o ya fue reclamado';
  end if;

  perform set_config('galf.merging', 'on', true);

  update scorecards set player_id = me where player_id = p_guest_id and deleted_at is null
    and not exists (select 1 from scorecards s2 where s2.round_id = scorecards.round_id and s2.player_id = me and s2.deleted_at is null);
  update rounds set created_by = me where created_by = p_guest_id;
  update player_declared_handicaps set player_id = me where player_id = p_guest_id and deleted_at is null;
  update handicap_index_snapshots set player_id = me where player_id = p_guest_id;
  update group_members set player_id = me where player_id = p_guest_id and deleted_at is null
    and not exists (select 1 from group_members g2 where g2.group_id = group_members.group_id and g2.player_id = me and g2.deleted_at is null);
  update players set merged_into_player_id = me, deleted_at = now(), deleted_by = me where id = p_guest_id;

  perform set_config('galf.merging', 'off', true);
end $$;

revoke execute on function claim_guest(uuid) from public, anon;
grant execute on function claim_guest(uuid) to authenticated;
