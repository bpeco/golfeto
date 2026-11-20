-- Alta de cancha aplicada el 2026-11-20 con execute_sql (conector MCP). NO REAPLICAR.
-- Tulsa (Mar del Plata; el dueño la llamó "Tulsa - Mar del Plata (nueva cancha)"), desde capturas de GolfCore que mandó el dueño.
-- Las capturas llegaron sin nombre: es la de par 71 (la otra, par 72, es Miramar Links).
--   * Pares de Azules y Blancas 5-4-3-4-4-5-4-3-4 / 4-4-4-4-3-4-4-5-3 = 36 + 35 = 71. Hándicap de hoyo de Blancas.
--   * Rojas: GolfCore la da par 72 (hoyo 10 par 5) y sin hándicap de hoyo; el modelo guarda un par por hoyo, así que queda
--     con el par 4 del hoyo 10 (el hándicap de cancha desde Rojas sale con un golpe de diferencia).
--   * Distancias de Blancas y Rojas convertidas de yardas (Blancas 3214 + 3131, Rojas 2870 + 2808). Azules sin distancias por
--     hoyo (GolfCore solo da el total, 6524 yd).
--   * CR/Slope de GolfCore, no verificados con la AAG: Azules 70.4/116, Blancas 69.8/113, Rojas 66.3/109 (hombres). Damas
--     Rojas 71.6/119, no cargado.
-- Versión creada: f79dc005-9480-4da1-9e72-82fb3596c275.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Tulsa', 'Tulsa', 'Mar del Plata') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta de GolfCore (capturas del dueño, 2026-11-20): par 36 + 35 = 71 (Azules y Blancas), hándicap de hoyo de Blancas. Distancias convertidas de yardas; Azules sin distancias por hoyo (6524 yd en total). CR/Slope de GolfCore, sin verificar con la AAG: Azules 70.4/116, Blancas 69.8/113, Rojas 66.3/109 (hombres; GolfCore las da par 72 con el hoyo 10 par 5, el modelo guarda un par por hoyo); damas Rojas 71.6/119 (no cargado).') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 5, 3),
  ((select id from v where k = 'ver'), 2, 4, 9),
  ((select id from v where k = 'ver'), 3, 3, 17),
  ((select id from v where k = 'ver'), 4, 4, 5),
  ((select id from v where k = 'ver'), 5, 4, 13),
  ((select id from v where k = 'ver'), 6, 5, 1),
  ((select id from v where k = 'ver'), 7, 4, 7),
  ((select id from v where k = 'ver'), 8, 3, 15),
  ((select id from v where k = 'ver'), 9, 4, 11),
  ((select id from v where k = 'ver'), 10, 4, 4),
  ((select id from v where k = 'ver'), 11, 4, 10),
  ((select id from v where k = 'ver'), 12, 4, 8),
  ((select id from v where k = 'ver'), 13, 4, 12),
  ((select id from v where k = 'ver'), 14, 3, 18),
  ((select id from v where k = 'ver'), 15, 4, 2),
  ((select id from v where k = 'ver'), 16, 4, 14),
  ((select id from v where k = 'ver'), 17, 5, 6),
  ((select id from v where k = 'ver'), 18, 3, 16);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 70.4, 116) returning id)
  insert into v select 'Azules', id from x;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 69.8, 113) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 443), (2, 347), (3, 146), (4, 357), (5, 320), (6, 485), (7, 358), (8, 176), (9, 307), (10, 384), (11, 364), (12, 364), (13, 360), (14, 126), (15, 363), (16, 341), (17, 417), (18, 144)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', 66.3, 109) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 436), (2, 299), (3, 110), (4, 331), (5, 288), (6, 434), (7, 335), (8, 134), (9, 257), (10, 350), (11, 307), (12, 333), (13, 320), (14, 119), (15, 310), (16, 308), (17, 393), (18, 127)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
