-- Corrección de datos aplicada el 2026-09-25 con execute_sql (conector MCP). NO REAPLICAR.
-- "Los Cedros" era CUBA Villa de Mayo, par 68: reemplaza el layout provisional por la tarjeta del club,
-- mueve sus partidas (y golpes) a la versión real, corrige el historial de Manu (+38/+25 sobre par 68) y
-- vuelve a firmar las históricas con CR/Slope 68/113 (aproximación declarada). El renombre (name/club) se hizo antes, aparte.
-- Generado por un script con el motor WHS de la app (courseHandicap, scoreDifferential, handicapHistory).

begin;
create temp table v (k text primary key, id uuid) on commit drop;
select unsign_scorecard(s.id, 'Corrección de cancha: CUBA Villa de Mayo es par 68 (tarjeta del club)')
  from scorecards s join rounds r on r.id = s.round_id
  where r.course_version_id = 'b1a8d8dc-12a4-49b9-bca9-b9ac9f7a0003' and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null;
update course_versions set valid_to = '2020-01-02' where id = 'b1a8d8dc-12a4-49b9-bca9-b9ac9f7a0003';
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ('040856af-f9dc-40c5-8919-f65778844542', 18, '2020-01-02', 'Tarjeta del club (foto del 2026-09-25): 9 hoyos jugados dos veces, par 34 + 34. Distancias convertidas de yardas. CR/Slope blancas 68/113: aproximación declarada (CR = par, Slope estándar) hasta tener el oficial de la AAG; azules y rojas sin rating.') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, 5),
  ((select id from v where k = 'ver'), 2, 5, 9),
  ((select id from v where k = 'ver'), 3, 3, 7),
  ((select id from v where k = 'ver'), 4, 4, 1),
  ((select id from v where k = 'ver'), 5, 3, 17),
  ((select id from v where k = 'ver'), 6, 4, 11),
  ((select id from v where k = 'ver'), 7, 4, 15),
  ((select id from v where k = 'ver'), 8, 4, 13),
  ((select id from v where k = 'ver'), 9, 3, 3),
  ((select id from v where k = 'ver'), 10, 4, 6),
  ((select id from v where k = 'ver'), 11, 5, 10),
  ((select id from v where k = 'ver'), 12, 3, 8),
  ((select id from v where k = 'ver'), 13, 4, 2),
  ((select id from v where k = 'ver'), 14, 3, 18),
  ((select id from v where k = 'ver'), 15, 4, 12),
  ((select id from v where k = 'ver'), 16, 4, 16),
  ((select id from v where k = 'ver'), 17, 4, 14),
  ((select id from v where k = 'ver'), 18, 3, 4);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', null, null) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 329), (2, 408), (3, 123), (4, 311), (5, 124), (6, 276), (7, 224), (8, 265), (9, 208), (10, 329), (11, 408), (12, 123), (13, 311), (14, 124), (15, 276), (16, 224), (17, 265), (18, 208)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 68, 113) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 316), (2, 382), (3, 112), (4, 302), (5, 119), (6, 272), (7, 215), (8, 252), (9, 162), (10, 316), (11, 382), (12, 112), (13, 302), (14, 119), (15, 272), (16, 215), (17, 252), (18, 162)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', null, null) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 302), (2, 362), (3, 85), (4, 254), (5, 114), (6, 270), (7, 198), (8, 206), (9, 137), (10, 302), (11, 362), (12, 85), (13, 254), (14, 114), (15, 270), (16, 198), (17, 206), (18, 137)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
update rounds set course_version_id = (select id from v where k = 'ver'), tee_set_id = (select id from v where k = 'Blancas')
  where course_version_id = 'b1a8d8dc-12a4-49b9-bca9-b9ac9f7a0003' and deleted_at is null;
update hole_scores hs set hole_id = nh.id
  from holes oh, holes nh
  where hs.hole_id = oh.id and oh.course_version_id = 'b1a8d8dc-12a4-49b9-bca9-b9ac9f7a0003' and hs.deleted_at is null
    and nh.course_version_id = (select id from v where k = 'ver') and nh.number = oh.number and nh.deleted_at is null;
update scorecards set legacy_gross = 106 where id = 'a96d5dbe-7399-49e3-aa5a-53934c4fe54e' and legacy_gross = 109;
update scorecards set legacy_gross = 93 where id = 'b40d3077-cf29-43a7-9a4d-1b2a8d6caa1a' and legacy_gross = 96;
delete from course_versions where id = 'b1a8d8dc-12a4-49b9-bca9-b9ac9f7a0003';
update course_versions set valid_from = '2020-01-01' where id = (select id from v where k = 'ver');
select sign_scorecard('a96d5dbe-7399-49e3-aa5a-53934c4fe54e', 'index', 21.6, 22, 106, 38); -- Manu 106
select sign_scorecard('b40d3077-cf29-43a7-9a4d-1b2a8d6caa1a', 'index', 21.6, 22, 93, 25); -- Manu 93
select sign_scorecard('e43fb94f-08aa-46b6-9be8-ce3bb8f37a02', 'index', 25.9, 26, 91, 23); -- Agus 91
commit;
