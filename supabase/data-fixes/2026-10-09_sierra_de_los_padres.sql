-- Alta de cancha aplicada el 2026-10-09 con execute_sql (conector MCP). NO REAPLICAR.
-- Sierra de los Padres Golf Club (Mar del Plata), cargada desde fuentes web sin la tarjeta del club
-- (el proxy de la sesión bloquea todos los sitios; datos de los resúmenes del buscador):
--   * Pares 4-4-4-3-4-4-3-5-4 / 5-4-3-4-4-3-4-5-4 = 35 + 36 = 71 (Golfify; Golfingrecord coincide en 1-7 y en par 71).
--   * Hándicap de hoyo sin cargar: Golfify/All Square (hoyo 1 = 15, hoyo 2 = 3) y Hole19 (hoyo 1 = 17, hoyo 2 = 1) no coinciden.
--   * Un solo tee, "Caballeros" (color sin verificar), CR/Slope 70.7/118 de GolfPass, no confirmado con la AAG. Sin distancias.
-- Damas juegan par 73 (hoyos 6 y 18 par 5): el modelo tiene el par por hoyo, no por tee, así que no se cargó tee de damas.

begin;
create temp table v (k text primary key, id uuid) on commit drop;
with x as (insert into courses (name, club, city)
  values ('Sierra de los Padres', 'Sierra de los Padres Golf Club', 'Mar del Plata') returning id)
  insert into v select 'course', id from x;
with x as (insert into course_versions (course_id, holes_count, valid_from, notes)
  values ((select id from v where k = 'course'), 18, '2020-01-01', 'Layout provisional de fuentes web (2026-10-09): pares 35 + 36 = 71. Sin hándicap de hoyo (las fuentes no coinciden) ni distancias. Tee Caballeros con CR/Slope 70.7/118 de GolfPass, sin verificar con la AAG. Reemplazar con la tarjeta del club.') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 4, null),
  ((select id from v where k = 'ver'), 2, 4, null),
  ((select id from v where k = 'ver'), 3, 4, null),
  ((select id from v where k = 'ver'), 4, 3, null),
  ((select id from v where k = 'ver'), 5, 4, null),
  ((select id from v where k = 'ver'), 6, 4, null),
  ((select id from v where k = 'ver'), 7, 3, null),
  ((select id from v where k = 'ver'), 8, 5, null),
  ((select id from v where k = 'ver'), 9, 4, null),
  ((select id from v where k = 'ver'), 10, 5, null),
  ((select id from v where k = 'ver'), 11, 4, null),
  ((select id from v where k = 'ver'), 12, 3, null),
  ((select id from v where k = 'ver'), 13, 4, null),
  ((select id from v where k = 'ver'), 14, 4, null),
  ((select id from v where k = 'ver'), 15, 3, null),
  ((select id from v where k = 'ver'), 16, 4, null),
  ((select id from v where k = 'ver'), 17, 5, null),
  ((select id from v where k = 'ver'), 18, 4, null);
insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Caballeros', 70.7, 118);
commit;
