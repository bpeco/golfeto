-- Correcciones del linter de seguridad de Supabase tras 0001:
--  * search_path fijo en todas las funciones;
--  * btree_gist fuera del schema public;
--  * las funciones security definer internas (triggers, helpers de RLS) no se exponen como RPC.

alter extension btree_gist set schema extensions;

alter function set_audit_columns() set search_path = public;
alter function set_created_columns() set search_path = public;
alter function forbid_update_delete() set search_path = public;
alter function guard_scorecard_update() set search_path = public;
alter function attach_audit(regclass) set search_path = public;
alter function attach_append_only(regclass) set search_path = public;

-- Triggers y helpers: los ejecuta el motor, nunca la API.
revoke execute on function
  handle_new_user(), set_audit_columns(), set_created_columns(), forbid_update_delete(), soft_delete_instead(),
  soft_cascade_group(), soft_cascade_course(), soft_cascade_course_version(), soft_cascade_hole(),
  soft_cascade_tee_set(), soft_cascade_round(), soft_cascade_scorecard(),
  guard_round_update(), guard_scorecard_update(), guard_hole_score_write(), guard_signature_insert(), apply_signature(),
  current_player_id(), is_group_member(uuid), is_group_admin(uuid), shares_group_with(uuid),
  is_round_participant(uuid), can_view_round(uuid)
from public, anon, authenticated;

-- RPCs de la app: solo usuarios autenticados.
revoke execute on function
  create_group(text, text), join_group(text),
  sign_scorecard(uuid, handicap_source, numeric, int, int, numeric), unsign_scorecard(uuid, text)
from public, anon;
grant execute on function
  create_group(text, text), join_group(text),
  sign_scorecard(uuid, handicap_source, numeric, int, int, numeric), unsign_scorecard(uuid, text)
to authenticated;
