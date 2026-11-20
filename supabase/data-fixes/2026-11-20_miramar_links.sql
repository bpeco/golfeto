-- Alta de cancha aplicada el 2026-11-20 con execute_sql (conector MCP). NO REAPLICAR.
-- Miramar Links (Miramar, Buenos Aires; en GolfPass "Cardon Miramar Links"), desde capturas de GolfCore que mandó el dueño.
-- Las capturas llegaron sin nombre: se identificó por el rating (Azul 70.3/119, 6341 yd; GolfPass da 70.3/119, 6335 yd).
--   * Pares 4-3-4-4-5-5-3-4-4 / 5-4-3-4-4-5-3-4-4 = 36 + 36 = 72. Hándicap de hoyo de caballeros (damas: 13 = 6, 14 = 12).
--   * Distancias de Azules y Rojas convertidas de yardas (Azules 3140 + 3201, Rojas 2761 + 2670).
--   * CR/Slope de hombres de GolfCore, no verificados con la AAG: Azules 70.3/119, Rojas 65.4/100. Damas Rojas 71.4/119, no
--     cargado (el tee tiene un solo rating).
-- Versión creada: 1f40bf17-ec01-464d-87d5-0938982eaf13.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Miramar Links', 'Miramar Links', 'Miramar') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta de GolfCore (capturas del dueño, 2026-11-20): par 36 + 36 = 72, hándicap de hoyo de caballeros (damas cambian 13 y 14). Distancias convertidas de yardas. CR/Slope de hombres de GolfCore, sin verificar con la AAG: Azules 70.3/119 (GolfPass da lo mismo para 6335 yd), Rojas 65.4/100; damas Rojas 71.4/119 (no cargado).') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, 1),
  ((select id from v where k = 'ver'), 2, 3, 13),
  ((select id from v where k = 'ver'), 3, 4, 17),
  ((select id from v where k = 'ver'), 4, 4, 11),
  ((select id from v where k = 'ver'), 5, 5, 7),
  ((select id from v where k = 'ver'), 6, 5, 9),
  ((select id from v where k = 'ver'), 7, 3, 15),
  ((select id from v where k = 'ver'), 8, 4, 3),
  ((select id from v where k = 'ver'), 9, 4, 5),
  ((select id from v where k = 'ver'), 10, 5, 18),
  ((select id from v where k = 'ver'), 11, 4, 10),
  ((select id from v where k = 'ver'), 12, 3, 14),
  ((select id from v where k = 'ver'), 13, 4, 12),
  ((select id from v where k = 'ver'), 14, 4, 6),
  ((select id from v where k = 'ver'), 15, 5, 2),
  ((select id from v where k = 'ver'), 16, 3, 16),
  ((select id from v where k = 'ver'), 17, 4, 8),
  ((select id from v where k = 'ver'), 18, 4, 4);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 70.3, 119) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 373), (2, 160), (3, 330), (4, 318), (5, 439), (6, 435), (7, 150), (8, 337), (9, 328), (10, 408), (11, 347), (12, 144), (13, 343), (14, 356), (15, 453), (16, 142), (17, 365), (18, 370)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', 65.4, 100) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 352), (2, 140), (3, 261), (4, 275), (5, 380), (6, 381), (7, 124), (8, 315), (9, 296), (10, 354), (11, 251), (12, 134), (13, 310), (14, 242), (15, 377), (16, 123), (17, 337), (18, 314)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
