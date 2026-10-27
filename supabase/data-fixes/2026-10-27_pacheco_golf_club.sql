-- Alta de cancha aplicada el 2026-10-27 con execute_sql (conector MCP). NO REAPLICAR.
-- Pacheco Golf Club (General Pacheco), de la foto de la tarjeta del club que mandó el dueño (2026-10-27);
-- coincide con Golfify/GolfCore/GolfPass en pares, hándicap de hoyo y yardas del tee azul.
--   * Pares 4-5-4-4-3-4-5-4-3 / 4-4-5-4-3-4-3-4-5 = 36 + 36 = 72. Hándicap de hoyo de caballeros.
--   * Damas (tee Rojas) tienen otro hándicap de hoyo (13-1-17-7-15-9-3-5-11 / 18-8-2-4-16-6-14-10-12): el modelo
--     guarda uno por hoyo, se cargó el de caballeros. Pares iguales para damas.
--   * Distancias convertidas de yardas (× 0,9144). Azules 6542, Blancas 6184, Rojas 5775 yd.
--   * CR/Slope: solo Azules 70.6/124 (GolfPass, no oficial de la AAG). Blancas y Rojas sin rating.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Pacheco Golf Club', 'Pacheco Golf Club', 'General Pacheco') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta del club (foto del 2026-10-27): par 36 + 36 = 72, hándicap de hoyo de caballeros. Distancias convertidas de yardas. CR/Slope Azules 70.6/124 de GolfPass, sin verificar con la AAG; Blancas y Rojas sin rating. Damas tienen otro hándicap de hoyo (no cargado).') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, 13),
  ((select id from v where k = 'ver'), 2, 5, 3),
  ((select id from v where k = 'ver'), 3, 4, 17),
  ((select id from v where k = 'ver'), 4, 4, 7),
  ((select id from v where k = 'ver'), 5, 3, 15),
  ((select id from v where k = 'ver'), 6, 4, 9),
  ((select id from v where k = 'ver'), 7, 5, 1),
  ((select id from v where k = 'ver'), 8, 4, 5),
  ((select id from v where k = 'ver'), 9, 3, 11),
  ((select id from v where k = 'ver'), 10, 4, 18),
  ((select id from v where k = 'ver'), 11, 4, 10),
  ((select id from v where k = 'ver'), 12, 5, 2),
  ((select id from v where k = 'ver'), 13, 4, 6),
  ((select id from v where k = 'ver'), 14, 3, 16),
  ((select id from v where k = 'ver'), 15, 4, 4),
  ((select id from v where k = 'ver'), 16, 3, 14),
  ((select id from v where k = 'ver'), 17, 4, 8),
  ((select id from v where k = 'ver'), 18, 5, 12);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 70.6, 124) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 327), (2, 457), (3, 335), (4, 332), (5, 160), (6, 357), (7, 475), (8, 342), (9, 137), (10, 329), (11, 338), (12, 477), (13, 366), (14, 161), (15, 378), (16, 165), (17, 370), (18, 475)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', null, null) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 309), (2, 439), (3, 307), (4, 314), (5, 146), (6, 343), (7, 451), (8, 328), (9, 122), (10, 304), (11, 320), (12, 461), (13, 347), (14, 147), (15, 366), (16, 146), (17, 352), (18, 453)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', null, null) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 294), (2, 424), (3, 284), (4, 300), (5, 105), (6, 299), (7, 401), (8, 316), (9, 106), (10, 279), (11, 302), (12, 445), (13, 334), (14, 135), (15, 354), (16, 131), (17, 336), (18, 435)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
