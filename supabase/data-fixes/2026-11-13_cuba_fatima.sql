-- Alta de cancha aplicada el 2026-11-13 con execute_sql (conector MCP). NO REAPLICAR.
-- CUBA Fátima (Club Universitario de Buenos Aires, sede Fátima; Ruta 8 km 61,9, Pilar; código AAG 108). Investigada por otra
-- sesión con navegador (2026-11-13). La cancha de 9 hoyos par 3 de la sede no se cargó.
--   * Tarjeta de Hole19 (en metros aunque diga "Yds"), ANTERIOR a la remodelación de Randy Thompson (primeros 9 reabiertos en
--     abril de 2023, segundos 9 después; el 18 quedó en 495 yd desde negras): distancias y ratings pueden no ser los vigentes.
--   * Pares 5-3-4-5-4-4-3-4-4 / 4-5-4-4-3-4-4-3-5 = 36 + 36 = 72. Hoyo 8: Hole19 par 4, golfhandicapp par 5 (total 73); el
--     dueño eligió par 4 (2026-11-13). Hándicap de hoyo de Hole19 (mismo para damas).
--   * CR/Slope de hombres (Hole19; Negras, Blancas coinciden con golfhandicapp): Negras 73.3/128, Azules 72.3/127, Blancas
--     70.8/123, Amarillas 66.9/114, Rojas 65.1/110. Damas (no cargadas, el tee tiene un solo rating): Amarillas 72.4/124,
--     Rojas 70.3/123. No verificados con la AAG (la única calificación documentada por el club es de junio de 2017).
-- Versión creada: 8193140a-7652-4daa-aae7-ed11693e4715.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('CUBA Fátima', 'CUBA', 'Fátima') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta de Hole19 (metros), anterior a la remodelación 2022-2024: par 36 + 36 = 72 (hoyo 8 par 4 según Hole19 y el dueño; golfhandicapp dice par 5). CR/Slope de hombres de Hole19, sin verificar con la AAG; damas en Amarillas 72.4/124 y Rojas 70.3/123 (no cargados). Reemplazar con la tarjeta actual del club.') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 5, 5),
  ((select id from v where k = 'ver'), 2, 3, 15),
  ((select id from v where k = 'ver'), 3, 4, 1),
  ((select id from v where k = 'ver'), 4, 5, 11),
  ((select id from v where k = 'ver'), 5, 4, 9),
  ((select id from v where k = 'ver'), 6, 4, 7),
  ((select id from v where k = 'ver'), 7, 3, 17),
  ((select id from v where k = 'ver'), 8, 4, 3),
  ((select id from v where k = 'ver'), 9, 4, 13),
  ((select id from v where k = 'ver'), 10, 4, 12),
  ((select id from v where k = 'ver'), 11, 5, 6),
  ((select id from v where k = 'ver'), 12, 4, 4),
  ((select id from v where k = 'ver'), 13, 4, 8),
  ((select id from v where k = 'ver'), 14, 3, 16),
  ((select id from v where k = 'ver'), 15, 4, 2),
  ((select id from v where k = 'ver'), 16, 4, 10),
  ((select id from v where k = 'ver'), 17, 3, 18),
  ((select id from v where k = 'ver'), 18, 5, 14);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Negras', 73.3, 128) returning id)
  insert into v select 'Negras', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Negras'), h.id, d.m
  from (values (1, 494), (2, 197), (3, 377), (4, 464), (5, 364), (6, 379), (7, 174), (8, 471), (9, 349), (10, 344), (11, 482), (12, 408), (13, 340), (14, 165), (15, 421), (16, 380), (17, 174), (18, 421)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 72.3, 127) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 485), (2, 165), (3, 368), (4, 459), (5, 357), (6, 369), (7, 165), (8, 471), (9, 349), (10, 336), (11, 482), (12, 399), (13, 334), (14, 154), (15, 398), (16, 375), (17, 166), (18, 415)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 70.8, 123) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 475), (2, 130), (3, 358), (4, 450), (5, 343), (6, 362), (7, 155), (8, 453), (9, 338), (10, 321), (11, 468), (12, 386), (13, 324), (14, 128), (15, 384), (16, 367), (17, 155), (18, 404)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Amarillas', 66.9, 114) returning id)
  insert into v select 'Amarillas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Amarillas'), h.id, d.m
  from (values (1, 381), (2, 130), (3, 315), (4, 402), (5, 293), (6, 335), (7, 124), (8, 400), (9, 262), (10, 290), (11, 379), (12, 360), (13, 281), (14, 119), (15, 357), (16, 358), (17, 145), (18, 311)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', 65.1, 110) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 379), (2, 125), (3, 309), (4, 351), (5, 276), (6, 311), (7, 122), (8, 393), (9, 259), (10, 287), (11, 375), (12, 324), (13, 276), (14, 111), (15, 322), (16, 283), (17, 144), (18, 293)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
