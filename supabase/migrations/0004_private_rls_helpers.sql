-- 0002 revocó EXECUTE de los helpers de RLS a `authenticated` para callar el lint "security definer ejecutable
-- por la API". Pero las políticas y los triggers de auditoría (invoker) los ejecutan con el rol del que consulta:
-- toda lectura de grupos, partidas y tarjetas y toda escritura auditada fallaba con
-- "permission denied for function ..." (PostgREST responde 403 y la app muestra "Not found").
--
-- Arreglo: los helpers viven en el schema `private`, que PostgREST no expone (no son RPC), y ahí sí tienen EXECUTE
-- para `authenticated`. Las políticas y defaults guardan el OID de la función, así que siguen apuntando bien; las
-- funciones que los llaman por nombre suman `private` a su search_path.

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

alter function current_player_id() set schema private;
alter function is_group_member(uuid) set schema private;
alter function is_group_admin(uuid) set schema private;
alter function shares_group_with(uuid) set schema private;
alter function is_round_participant(uuid) set schema private;
alter function can_view_round(uuid) set schema private;

grant execute on function
  private.current_player_id(), private.is_group_member(uuid), private.is_group_admin(uuid),
  private.shares_group_with(uuid), private.is_round_participant(uuid), private.can_view_round(uuid)
to authenticated, service_role;

-- Quienes llaman a los helpers por nombre.
alter function private.is_group_member(uuid) set search_path = public, private;
alter function private.is_group_admin(uuid) set search_path = public, private;
alter function private.shares_group_with(uuid) set search_path = public, private;
alter function private.is_round_participant(uuid) set search_path = public, private;
alter function private.can_view_round(uuid) set search_path = public, private;
alter function set_audit_columns() set search_path = public, private;
alter function set_created_columns() set search_path = public, private;
alter function guard_round_update() set search_path = public, private;
alter function create_group(text, text) set search_path = public, private;
alter function join_group(text) set search_path = public, private;
alter function claim_guest(uuid) set search_path = public, private;
