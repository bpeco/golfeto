-- Alta de cancha aplicada el 2026-11-24 con execute_sql (conector MCP). NO REAPLICAR.
-- Martindale Country Club (Pilar). Datos de las capturas de la tarjeta de GolfCore (golfcore.org/courses/martindale) que
-- mandó el dueño (2026-11-24); por pedido del dueño no se usaron otras fuentes.
--   * Pares 4-4-5-3-5-3-4-4-4 / 4-3-5-4-4-3-4-5-4 = 36 + 36 = 72 y hándicap de hoyo (iguales en Negro, Azul y Blanco). Desde
--     Rojo el 18 es par 5 (par 73) y la tarjeta no trae hándicap de hoyo: el par es por hoyo, así que queda el 18 par 4.
--   * Negro es el tee de campeonato (el de más atrás): 6960 yd, más largo que Azul en los hoyos 2, 3, 9, 12 y 18.
--   * Distancias convertidas de yardas. CR/Slope de GolfCore, no verificados con la AAG: Negras 73.6/130, Azules 72.9/128,
--     Blancas 70.6/126, Rojas 67.4/119 (caballeros, sobre par 73; damas 72.5/125, no cargado).
-- Versión creada: 3b26fe7a-d353-42f3-bfe1-5a63c55a16c1. La ciudad (Pilar) no sale de la tarjeta.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Martindale Country Club', 'Martindale Country Club', 'Pilar') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta de GolfCore (capturas del dueño, 2026-11-24): par 36 + 36 = 72 y hándicap de hoyo. Desde Rojo el 18 es par 5 (par 73; queda par 4, el par es por hoyo). Distancias convertidas de yardas. CR/Slope de GolfCore sin verificar con la AAG; Rojas con el de caballeros (damas 72.5/125).') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, 7),
  ((select id from v where k = 'ver'), 2, 4, 5),
  ((select id from v where k = 'ver'), 3, 5, 1),
  ((select id from v where k = 'ver'), 4, 3, 15),
  ((select id from v where k = 'ver'), 5, 5, 3),
  ((select id from v where k = 'ver'), 6, 3, 17),
  ((select id from v where k = 'ver'), 7, 4, 11),
  ((select id from v where k = 'ver'), 8, 4, 13),
  ((select id from v where k = 'ver'), 9, 4, 9),
  ((select id from v where k = 'ver'), 10, 4, 12),
  ((select id from v where k = 'ver'), 11, 3, 18),
  ((select id from v where k = 'ver'), 12, 5, 2),
  ((select id from v where k = 'ver'), 13, 4, 4),
  ((select id from v where k = 'ver'), 14, 4, 14),
  ((select id from v where k = 'ver'), 15, 3, 16),
  ((select id from v where k = 'ver'), 16, 4, 6),
  ((select id from v where k = 'ver'), 17, 5, 8),
  ((select id from v where k = 'ver'), 18, 4, 10);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Negras', 73.6, 130) returning id)
  insert into v select 'Negras', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Negras'), h.id, d.m
  from (values (1, 384), (2, 411), (3, 552), (4, 188), (5, 476), (6, 160), (7, 338), (8, 306), (9, 373), (10, 348), (11, 138), (12, 497), (13, 392), (14, 312), (15, 176), (16, 401), (17, 484), (18, 427)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 72.9, 128) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 384), (2, 374), (3, 515), (4, 188), (5, 476), (6, 160), (7, 338), (8, 306), (9, 341), (10, 348), (11, 138), (12, 485), (13, 392), (14, 312), (15, 176), (16, 401), (17, 484), (18, 403)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 70.6, 126) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 361), (2, 374), (3, 477), (4, 176), (5, 460), (6, 155), (7, 308), (8, 306), (9, 320), (10, 334), (11, 127), (12, 454), (13, 353), (14, 301), (15, 160), (16, 364), (17, 443), (18, 379)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', 67.4, 119) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 311), (2, 316), (3, 413), (4, 153), (5, 435), (6, 129), (7, 265), (8, 262), (9, 283), (10, 300), (11, 96), (12, 409), (13, 309), (14, 254), (15, 146), (16, 315), (17, 397), (18, 343)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
