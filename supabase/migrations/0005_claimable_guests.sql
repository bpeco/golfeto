-- Perfil → "¿Sos alguno de estos?" lista los invitados con historial para reclamarlo (claim_guest, 0003).
-- Las tarjetas de un invitado que no comparte grupo con nadie (el historial importado) no son visibles por RLS,
-- así que contarlas desde la app daba 0 y la lista quedaba vacía. Esta RPC cuenta sin RLS y expone sólo lo que
-- ya es público entre golfistas (id y nombre del invitado) más su cantidad de tarjetas.
create or replace function claimable_guests()
returns table (id uuid, display_name text, cards int)
language sql stable security definer set search_path = public, private as $$
  select p.id, p.display_name, count(s.id)::int
  from players p
  join scorecards s on s.player_id = p.id and s.deleted_at is null
  where p.user_id is null and p.deleted_at is null and p.merged_into_player_id is null
    and current_player_id() is not null
  group by p.id, p.display_name
  order by p.display_name;
$$;

revoke execute on function claimable_guests() from public, anon;
grant execute on function claimable_guests() to authenticated;
