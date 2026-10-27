-- Corrección de datos aplicada el 2026-10-27 por el dueño en el SQL Editor de Supabase (el conector MCP pedía una
-- confirmación que no llegaba a la app). Antes se corrió un ensayo que terminaba en error a propósito: 24 + 2 firmadas,
-- diferencial promedio 34.28 (Miraflores Blancas) y 49.40 (Sierra Blancas). NO REAPLICAR.
-- Versión nueva de Miraflores: 1a801d33-fb43-45ac-bd30-dae69ba787d3 (la provisional 7344acd5-… quedó dada de baja).
-- Ratings verificados abriendo las páginas desde otra sesión con navegador (GolfPass, Hole19, drills.golf, Golfify);
-- ninguno oficial de la AAG (la AAG no los publica fuera de la app de matriculados).
--
-- 1) Miraflores: el layout era inventado (par 71 con pares y hándicap de hoyo en orden fijo) y el tee "Blancas"
--    tenía 70.3 / 125, que es el rating de las Azules. El dueño confirmó que juegan desde Blancas (68.8 / 124).
--    Se reemplaza la versión provisional por la tarjeta del club (Golfify; AllSquare coincide en metros): pares
--    5-3-4-4-4-4-4-3-4 / 3-5-4-3-5-4-4-4-4 = 35 + 36 = 71, hándicap de hoyo (igual para damas), Azules 70.3 / 125,
--    Blancas 68.8 / 124, Rojas sin rating (el publicado, 72.7 / 122, es de damas con par 72: hoyo 15 par 5 para
--    damas; el par es por hoyo, no por tee). Distancias convertidas de yardas. Como con CUBA (2026-09-25): el
--    layout provisional nunca existió, así que la versión vieja se da de baja y las 24 partidas (todas históricas,
--    sin golpes por hoyo) pasan a la versión real, tee Blancas.
-- 2) Sierra de los Padres: el tee "Caballeros" 70.7 / 118 (GolfPass "Mens", sin color) pasa a "Blancas" 69.1 / 113
--    (Hole19 "White (M)"; el dueño confirmó Blancas). Se agrega Azules 70.0 / 118 (Hole19 y drills.golf). Hándicap
--    de hoyo sigue sin cargar: hay dos tarjetas distintas publicadas (ver docs/handoff.md).
--
-- Las tarjetas firmadas se desfirman y se vuelven a firmar como en "Cambiar cancha" (0007): mismos golpes, mismo
-- índice del día, rating nuevo; valores del motor WHS de la app (resignature, src/lib/sign-estimate.ts). Las
-- históricas sin índice ("ninguno") conservan hándicap de cancha 0, como en la importación (no entra en el
-- diferencial). Autor de los eventos: el dueño.

-- 1) Miraflores
begin;
create temp table v (k text primary key, id uuid) on commit drop;
do $$ begin
  if (select count(*) from scorecards s join rounds r on r.id = s.round_id
      where r.course_version_id = '7344acd5-0875-46cb-b6c8-517e7df31b54' and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null) <> 24
  then raise exception 'Miraflores: se esperaban 24 tarjetas firmadas'; end if;
end $$;
insert into scorecard_signatures (scorecard_id, action, reason, created_by)
  select s.id, 'desfirmar', 'Corrección de cancha: Miraflores con la tarjeta del club, tee Blancas 68.8 / 124 (antes 70.3 / 125, que es el de Azules)', 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  from scorecards s join rounds r on r.id = s.round_id
  where r.course_version_id = '7344acd5-0875-46cb-b6c8-517e7df31b54' and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null;
update course_versions set valid_to = '2020-01-02', updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23' where id = '7344acd5-0875-46cb-b6c8-517e7df31b54';
with x as (insert into course_versions (course_id, holes_count, valid_from, notes, created_by)
  values ('f7bddb4d-b3a7-4596-beaf-3f110bbb25a1', 18, '2020-01-02', 'Tarjeta del club (Golfify / AllSquare, 2026-10-27): par 35 + 36 = 71, hándicap de hoyo igual para damas. Distancias convertidas de yardas. CR/Slope Azules 70.3/125 y Blancas 68.8/124 de GolfPass/Hole19, sin verificar con la AAG; Rojas sin rating (el publicado es de damas, par 72).', 'b2edfbd0-e6d4-4c61-83e5-83a770281b23') returning id)
  insert into v select 'ver', id from x;
insert into holes (course_version_id, number, par, stroke_index) values
  ((select id from v where k = 'ver'), 1, 5, 9),
  ((select id from v where k = 'ver'), 2, 3, 15),
  ((select id from v where k = 'ver'), 3, 4, 11),
  ((select id from v where k = 'ver'), 4, 4, 13),
  ((select id from v where k = 'ver'), 5, 4, 1),
  ((select id from v where k = 'ver'), 6, 4, 5),
  ((select id from v where k = 'ver'), 7, 4, 3),
  ((select id from v where k = 'ver'), 8, 3, 17),
  ((select id from v where k = 'ver'), 9, 4, 7),
  ((select id from v where k = 'ver'), 10, 3, 18),
  ((select id from v where k = 'ver'), 11, 5, 14),
  ((select id from v where k = 'ver'), 12, 4, 4),
  ((select id from v where k = 'ver'), 13, 3, 16),
  ((select id from v where k = 'ver'), 14, 5, 6),
  ((select id from v where k = 'ver'), 15, 4, 2),
  ((select id from v where k = 'ver'), 16, 4, 10),
  ((select id from v where k = 'ver'), 17, 4, 8),
  ((select id from v where k = 'ver'), 18, 4, 12);
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Azules', 70.3, 125) returning id)
  insert into v select 'Azules', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Azules'), h.id, d.m
  from (values (1, 443), (2, 123), (3, 300), (4, 292), (5, 347), (6, 347), (7, 366), (8, 133), (9, 338), (10, 119), (11, 439), (12, 364), (13, 174), (14, 468), (15, 407), (16, 345), (17, 384), (18, 360)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Blancas', 68.8, 124) returning id)
  insert into v select 'Blancas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Blancas'), h.id, d.m
  from (values (1, 433), (2, 115), (3, 291), (4, 292), (5, 339), (6, 327), (7, 366), (8, 123), (9, 329), (10, 108), (11, 407), (12, 346), (13, 163), (14, 451), (15, 393), (16, 326), (17, 366), (18, 345)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
with x as (insert into tee_sets (course_version_id, name, course_rating, slope)
  values ((select id from v where k = 'ver'), 'Rojas', null, null) returning id)
  insert into v select 'Rojas', id from x;
insert into tee_hole_distances (course_version_id, tee_set_id, hole_id, meters)
  select (select id from v where k = 'ver'), (select id from v where k = 'Rojas'), h.id, d.m
  from (values (1, 424), (2, 104), (3, 283), (4, 277), (5, 330), (6, 319), (7, 335), (8, 113), (9, 293), (10, 101), (11, 390), (12, 232), (13, 123), (14, 421), (15, 369), (16, 303), (17, 347), (18, 326)) d(n, m)
  join holes h on h.course_version_id = (select id from v where k = 'ver') and h.number = d.n and h.deleted_at is null;
update rounds set course_version_id = (select id from v where k = 'ver'), tee_set_id = (select id from v where k = 'Blancas'), updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where course_version_id = '7344acd5-0875-46cb-b6c8-517e7df31b54' and deleted_at is null;
update course_versions set deleted_at = now(), deleted_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23' where id = '7344acd5-0875-46cb-b6c8-517e7df31b54';
update course_versions set valid_from = '2020-01-01' where id = (select id from v where k = 'ver');
select private.sign_as(c.id::uuid, c.src::handicap_source, c.idx, c.ch, c.adj, c.dif, 'b2edfbd0-e6d4-4c61-83e5-83a770281b23')
from (values
  ('94d5b5b9-5ff4-4c2e-8a78-fb89c05f2140', 'ninguno', null, 0, 97, 25.7),
  ('2f76efd7-3d2f-477f-8fbc-6a52545f8cc2', 'index', 15.9, 15, 101, 29.3),
  ('f42ab293-4fc2-44f7-af34-2145dd0b934c', 'ninguno', null, 0, 100, 28.4),
  ('2b20d5b6-1a0a-40f3-9508-d53c21257e61', 'index', 16.9, 16, 109, 36.6),
  ('2896a4e7-cc0b-448d-a529-194b96990a9f', 'ninguno', null, 0, 107, 34.8),
  ('d8e8c566-2337-41b8-945c-3a505640ad9f', 'index', 18.2, 18, 108, 35.7),
  ('1f8fae6f-ad3b-4716-b9f8-1746a0b28523', 'ninguno', null, 0, 104, 32.1),
  ('992b65e7-a0fe-44bd-ae23-25a063b301f9', 'index', 19.2, 19, 99, 27.5),
  ('8ecbe61e-c46b-4e35-9b7b-921dc552f31b', 'index', 23, 23, 107, 34.8),
  ('957c8571-fb71-420c-957e-97c594c25794', 'ninguno', null, 0, 108, 35.7),
  ('5a23da8c-2174-49e7-a034-5efd75e544e4', 'index', 19.2, 19, 97, 25.7),
  ('de9f42cf-13bb-492d-9af0-0e2bb8920c1e', 'index', 24, 24, 107, 34.8),
  ('feca5484-60e9-4ac0-b877-0916859564dc', 'ninguno', null, 0, 120, 46.7),
  ('ac81fa1b-f55f-47ae-abbf-e0779f5aee68', 'index', 20.8, 21, 102, 30.3),
  ('2b8d0891-61c7-4f9d-8a32-2eb07e904987', 'index', 25, 25, 102, 30.3),
  ('710c4235-c49b-438c-b685-f7379603a261', 'index', 28.5, 29, 115, 42.1),
  ('4904213e-36b9-4208-ac03-e31d85be7c65', 'index', 20.8, 21, 100, 28.4),
  ('c62bea8e-4454-446c-be0a-b9c2bea94526', 'index', 24.9, 25, 100, 28.4),
  ('75cb9d9d-019e-40d8-8fea-8790043cba02', 'index', 29.5, 30, 105, 33),
  ('82ba6dde-96b8-4a6e-b299-a854cdd2b3c0', 'index', 20.8, 21, 111, 38.5),
  ('cda07e20-8bae-4153-bfcc-c66bb10d2f71', 'index', 25.9, 26, 104, 32.1),
  ('f1b11118-1973-4442-a784-08ffc708f6b7', 'ninguno', null, 0, 146, 70.4),
  ('503e9586-15fe-4994-b450-0c2fc595b4e5', 'index', 30.5, 31, 107, 34.8),
  ('186f972b-d626-4ac5-938d-8028abefd58f', 'index', 30, 31, 98, 26.6)
) c(id, src, idx, ch, adj, dif);
do $$ begin
  if (select count(*) from scorecards s join rounds r on r.id = s.round_id join course_versions cv on cv.id = r.course_version_id
      where cv.course_id = 'f7bddb4d-b3a7-4596-beaf-3f110bbb25a1' and cv.deleted_at is null and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null) <> 24
  then raise exception 'Miraflores: no quedaron las 24 tarjetas firmadas'; end if;
end $$;
commit;

-- 2) Sierra de los Padres
begin;
do $$ begin
  if (select count(*) from scorecards s where s.round_id = 'f368b868-9720-4f7f-bc7a-80b64446ee0a' and s.deleted_at is null and s.signed_at is not null) <> 2
  then raise exception 'Sierra: se esperaban 2 tarjetas firmadas'; end if;
end $$;
insert into scorecard_signatures (scorecard_id, action, reason, created_by)
  select s.id, 'desfirmar', 'Corrección de cancha: Sierra de los Padres desde Blancas 69.1 / 113 (antes "Caballeros" 70.7 / 118)', 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  from scorecards s where s.round_id = 'f368b868-9720-4f7f-bc7a-80b64446ee0a' and s.deleted_at is null and s.signed_at is not null;
update tee_sets set name = 'Blancas', course_rating = 69.1, slope = 113, updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where course_version_id = '604a2edd-61d3-4816-b71b-248715c82ab7' and name = 'Caballeros' and deleted_at is null;
insert into tee_sets (course_version_id, name, course_rating, slope, created_by) values ('604a2edd-61d3-4816-b71b-248715c82ab7', 'Azules', 70.0, 118, 'b2edfbd0-e6d4-4c61-83e5-83a770281b23');
update course_versions set notes = 'Layout de fuentes web (2026-10-09; ratings 2026-10-27): pares 35 + 36 = 71. Sin hándicap de hoyo (hay dos tarjetas publicadas distintas) ni distancias. Blancas 69.1/113 (Hole19) y Azules 70.0/118 (Hole19, drills.golf), sin verificar con la AAG. Reemplazar con la tarjeta del club.', updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where id = '604a2edd-61d3-4816-b71b-248715c82ab7';
select private.sign_as(c.id::uuid, c.src::handicap_source, c.idx, c.ch, c.adj, c.dif, 'b2edfbd0-e6d4-4c61-83e5-83a770281b23')
from (values
  ('f44d43c9-8d43-4cd6-8b26-cd8314505c24', 'index', 46, 44, 135, 65.9),
  ('e1f6eca9-2e2c-45af-9ee2-b2f2b8044828', 'index', 24, 22, 102, 32.9)
) c(id, src, idx, ch, adj, dif);
do $$ begin
  if (select count(*) from scorecards s where s.round_id = 'f368b868-9720-4f7f-bc7a-80b64446ee0a' and s.deleted_at is null and s.signed_at is not null) <> 2
  then raise exception 'Sierra: no quedaron las 2 tarjetas firmadas'; end if;
end $$;
commit;
