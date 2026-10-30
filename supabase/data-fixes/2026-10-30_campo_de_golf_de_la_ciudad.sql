-- Alta de cancha aplicada el 2026-10-30 con execute_sql (conector MCP). NO REAPLICAR.
-- Campo de Golf de la Ciudad (Lagos de Palermo, Av. Tornquist 6397, CABA; ex Campo Municipal de Golf Juan Bautista Segura).
-- Investigada por otra sesión con navegador (2026-10-30). No figura en el directorio de la AAG.
--   * Pares 4-4-4-4-3-5-3-4-4 / 3-5-4-3-5-4-5-4-4 = 35 + 37 = 72 y hándicap de hoyo: coinciden Hole19, GolfCore y Golfify.
--     Sin par ni hándicap de hoyo distinto para damas en ninguna fuente.
--   * Distancias en yardas de Golfify ("Golf Municipal de Buenos Aires"), convertidas a metros (× 0,9144); coinciden con
--     los metros de Hole19 (±1,5 yd). Hay otra versión de la tarjeta en Golfify con varios hoyos distintos (sin año);
--     esta la comparten tres fuentes y parece la vigente.
--   * CR/Slope NO oficiales (Hole19 y GolfCore, sin decir si son de hombres o mujeres): Azules 71.1, Blancas 69.5,
--     Amarillas 67.5, Rojas 67.0, todos con Slope 113 (el valor neutro: probablemente no es el real). Se cargan para
--     poder firmar; reemplazar con los de la AAG cuando se consigan.
-- Versión creada: 2dbd90a0-e385-4854-8661-ec8620c34de3.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Campo de Golf de la Ciudad', 'Campo de Golf de la Ciudad', 'Palermo') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Tarjeta de fuentes web (Golfify, Hole19, GolfCore; 2026-10-30): par 35 + 37 = 72. Distancias convertidas de yardas. CR/Slope no oficiales (Hole19/GolfCore, sin sexo; Slope 113 en todos, el valor neutro). No figura en el directorio de la AAG. Reemplazar con la tarjeta del club y los ratings de la AAG.') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, 9),
  ((select id from v where k = 'ver'), 2, 4, 7),
  ((select id from v where k = 'ver'), 3, 4, 13),
  ((select id from v where k = 'ver'), 4, 4, 3),
  ((select id from v where k = 'ver'), 5, 3, 11),
  ((select id from v where k = 'ver'), 6, 5, 1),
  ((select id from v where k = 'ver'), 7, 3, 17),
  ((select id from v where k = 'ver'), 8, 4, 15),
  ((select id from v where k = 'ver'), 9, 4, 5),
  ((select id from v where k = 'ver'), 10, 3, 16),
  ((select id from v where k = 'ver'), 11, 5, 14),
  ((select id from v where k = 'ver'), 12, 4, 6),
  ((select id from v where k = 'ver'), 13, 3, 18),
  ((select id from v where k = 'ver'), 14, 5, 2),
  ((select id from v where k = 'ver'), 15, 4, 8),
  ((select id from v where k = 'ver'), 16, 5, 12),
  ((select id from v where k = 'ver'), 17, 4, 4),
  ((select id from v where k = 'ver'), 18, 4, 10);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 71.1, 113) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 322), (2, 336), (3, 343), (4, 389), (5, 172), (6, 480), (7, 155), (8, 326), (9, 389), (10, 155), (11, 443), (12, 370), (13, 128), (14, 471), (15, 357), (16, 457), (17, 380), (18, 347)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 69.5, 113) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 307), (2, 315), (3, 334), (4, 355), (5, 155), (6, 469), (7, 142), (8, 316), (9, 375), (10, 146), (11, 433), (12, 294), (13, 116), (14, 457), (15, 343), (16, 444), (17, 368), (18, 340)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Amarillas', 67.5, 113) returning id)
  insert into v select 'Amarillas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Amarillas'), h.id, d.m
  from (values (1, 283), (2, 297), (3, 325), (4, 338), (5, 128), (6, 411), (7, 86), (8, 307), (9, 366), (10, 123), (11, 424), (12, 281), (13, 108), (14, 411), (15, 329), (16, 434), (17, 330), (18, 322)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', 67.0, 113) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 272), (2, 290), (3, 315), (4, 338), (5, 128), (6, 411), (7, 86), (8, 298), (9, 352), (10, 123), (11, 418), (12, 281), (13, 108), (14, 411), (15, 320), (16, 417), (17, 330), (18, 322)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
commit;
