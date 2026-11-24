-- Alta de cancha aplicada el 2026-11-24 con execute_sql (conector MCP). NO REAPLICAR.
-- Bragado Golf Club (Bragado, Buenos Aires). Datos de las capturas de la tarjeta de GolfCore que mandó el dueño (2026-11-24).
--   * Según GolfPass y FlyAway la cancha tiene 9 hoyos: Azul y Blanco tienen salidas distintas en la segunda vuelta (otras
--     yardas y otro par en los hoyos 12 y 17) y Rojo repite la ida. Se carga como 18 hoyos, como la tarjeta.
--   * Pares de Azul/Blanco: 4-4-5-3-4-5-3-4-4 / 4-4-4-3-4-5-3-5-4 = 36 + 36 = 72. Desde Rojo GolfCore da la vuelta igual a la
--     ida (hoyo 12 par 5 y 17 par 4; mismo total): el par es por hoyo, no por tee, así que quedan los de Azul/Blanco.
--   * Sin hándicap de hoyo: no está en las capturas; Hole19 tiene uno (hoyo 1 = 15) de otra tarjeta (hoyo 1 de 315 yd).
--   * Distancias convertidas de yardas. CR/Slope de GolfCore, no verificados con la AAG: Azules 70.2/124, Blancas 68.2/122,
--     Rojas 65.0/111 (caballeros; damas 70.0/120, no cargado: el tee tiene un solo rating).
-- Versión creada: d915098f-4393-4bd1-8d21-0e140e964172.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Bragado Golf Club', 'Bragado Golf Club', 'Bragado') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta de GolfCore (capturas del dueño, 2026-11-24): cancha de 9 hoyos con otras salidas en la segunda vuelta, cargada como 18. Par 36 + 36 = 72 (pares de Azul/Blanco; desde Rojo el 12 es par 5 y el 17 par 4). Sin hándicap de hoyo. Distancias convertidas de yardas. CR/Slope de GolfCore sin verificar con la AAG; Rojas con el de caballeros (damas 70.0/120).') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, null),
  ((select id from v where k = 'ver'), 2, 4, null),
  ((select id from v where k = 'ver'), 3, 5, null),
  ((select id from v where k = 'ver'), 4, 3, null),
  ((select id from v where k = 'ver'), 5, 4, null),
  ((select id from v where k = 'ver'), 6, 5, null),
  ((select id from v where k = 'ver'), 7, 3, null),
  ((select id from v where k = 'ver'), 8, 4, null),
  ((select id from v where k = 'ver'), 9, 4, null),
  ((select id from v where k = 'ver'), 10, 4, null),
  ((select id from v where k = 'ver'), 11, 4, null),
  ((select id from v where k = 'ver'), 12, 4, null),
  ((select id from v where k = 'ver'), 13, 3, null),
  ((select id from v where k = 'ver'), 14, 4, null),
  ((select id from v where k = 'ver'), 15, 5, null),
  ((select id from v where k = 'ver'), 16, 3, null),
  ((select id from v where k = 'ver'), 17, 5, null),
  ((select id from v where k = 'ver'), 18, 4, null);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 70.2, 124) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 315), (2, 311), (3, 475), (4, 127), (5, 327), (6, 522), (7, 188), (8, 337), (9, 345), (10, 308), (11, 314), (12, 383), (13, 154), (14, 329), (15, 506), (16, 169), (17, 426), (18, 352)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 68.2, 122) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 294), (2, 297), (3, 459), (4, 118), (5, 315), (6, 503), (7, 174), (8, 315), (9, 324), (10, 294), (11, 299), (12, 357), (13, 148), (14, 309), (15, 456), (16, 155), (17, 402), (18, 329)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', 65.0, 111) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 244), (2, 260), (3, 409), (4, 103), (5, 257), (6, 434), (7, 139), (8, 312), (9, 281), (10, 244), (11, 260), (12, 409), (13, 103), (14, 257), (15, 434), (16, 139), (17, 312), (18, 281)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
