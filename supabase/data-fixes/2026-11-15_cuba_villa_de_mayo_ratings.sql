-- Corrección de datos aplicada el 2026-11-15. NO REAPLICAR.
-- CUBA Villa de Mayo (versión 06128add-a431-492b-a237-85857890ab36): CR/Slope de GolfCore
-- (golfcore.org/courses/108-c-u-b-a-villa-de-mayo, capturas del dueño del 2026-11-15), en lugar de la aproximación
-- 68 / 113 de Blancas (CR = par, Slope estándar) y del 70.3 / 125 de Azules (copiado de Miraflores).
-- GolfCore publica ratings de 9 hoyos; la cancha está cargada como 9 hoyos jugados dos veces (versión de 18),
-- así que el CR se duplica y el Slope queda igual:
--   Azules  (M) 31.9 / 101 -> 63.8 / 101
--   Blancas (M) 31.1 / 102 -> 62.2 / 102
--   Rojas   (F) 31.8 / 106 -> 63.6 / 106  (rating de damas; cargado por decisión del dueño)
-- No oficiales de la AAG. GolfCore numera el recorrido desde nuestro hoyo 7 (pares iguales hoyo por hoyo) y le da
-- unas 30 yd más a nuestro hoyo 6 en los tres tees; las distancias de la tarjeta del club no se tocan.
--
-- Las 17 tarjetas firmadas (15 desde Blancas, 2 desde Azules) se desfirman y se vuelven a firmar como en
-- "Cambiar cancha" (0007): mismos golpes, mismo índice del día, rating nuevo; valores del motor WHS de la app
-- (resignature, src/lib/sign-estimate.ts), que con el rating viejo reproduce las 17 firmas actuales. Las históricas
-- sin índice ("ninguno") conservan hándicap de cancha 0, como en la importación. Autor de los eventos: el dueño.

begin;
do $$ begin
  if (select count(*) from scorecards s join rounds r on r.id = s.round_id
      where r.course_version_id = '06128add-a431-492b-a237-85857890ab36' and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null) <> 17
  then raise exception 'CUBA Villa de Mayo: se esperaban 17 tarjetas firmadas'; end if;
end $$;
insert into scorecard_signatures (scorecard_id, action, reason, created_by)
  select s.id, 'desfirmar', 'Corrección de rating: CUBA Villa de Mayo con CR/Slope de GolfCore (Blancas 62.2 / 102, Azules 63.8 / 101; antes 68 / 113 y 70.3 / 125)', 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  from scorecards s join rounds r on r.id = s.round_id
  where r.course_version_id = '06128add-a431-492b-a237-85857890ab36' and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null;
update tee_sets set course_rating = 63.8, slope = 101, updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where id = 'be7f8a24-9f57-48b2-9949-0e22b753f3b4' and name = 'Azules';
update tee_sets set course_rating = 62.2, slope = 102, updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where id = '61af48f0-d58b-4ff9-ba77-adc6e4b78502' and name = 'Blancas';
update tee_sets set course_rating = 63.6, slope = 106, updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where id = 'f1168083-2858-4abc-969c-9cbac81ca78a' and name = 'Rojas';
update course_versions set notes = 'Tarjeta del club (foto del 2026-09-25): 9 hoyos jugados dos veces, par 34 + 34. Distancias convertidas de yardas. CR/Slope de GolfCore (2026-11-15), de 9 hoyos duplicados: Azules 63.8/101 y Blancas 62.2/102 (hombres), Rojas 63.6/106 (damas). Sin verificar con la AAG. GolfCore numera desde nuestro hoyo 7 y da ~30 yd más a nuestro hoyo 6.', updated_by = 'b2edfbd0-e6d4-4c61-83e5-83a770281b23'
  where id = '06128add-a431-492b-a237-85857890ab36';
select private.sign_as(c.id::uuid, c.src::handicap_source, c.idx, c.ch, c.adj, c.dif, 'b2edfbd0-e6d4-4c61-83e5-83a770281b23')
from (values
  ('3b39b0a3-0dd9-4d78-bb6c-5788f491f779', 'ninguno', null, 0, 94, 35.2),
  ('5a463969-5801-43e1-9666-28f5f1c14e1c', 'ninguno', null, 0, 97, 38.6),
  ('4ff1b9d4-22a6-435e-99cb-95e8afa6b80f', 'index', 19.4, 12, 89, 29.7),
  ('dc334396-5cc5-4e3d-923e-953274000d2f', 'ninguno', null, 0, 98, 39.7),
  ('a96d5dbe-7399-49e3-aa5a-53934c4fe54e', 'index', 21.6, 14, 106, 48.5),
  ('e43fb94f-08aa-46b6-9be8-ce3bb8f37a02', 'index', 25.9, 18, 91, 31.9),
  ('e0c63e19-47e2-4f87-9039-2c4402cbbc1a', 'ninguno', null, 0, 126, 70.7),
  ('b40d3077-cf29-43a7-9a4d-1b2a8d6caa1a', 'index', 21.6, 14, 93, 34.1),
  ('5f8fa720-c640-4e72-98ce-56082c228c50', 'ninguno', null, -6, 115, 58.5),
  ('1a9d9259-466c-41ba-a53d-f46896590f46', 'index', 45, 35, 114, 57.4),
  ('275ba793-8a25-4b11-8a8a-c41d6a5d055b', 'index', 23.6, 16, 97, 38.6),
  ('a9c2cf10-e486-4893-8263-a906e2e3ef1a', 'index', 26.6, 18, 89, 29.7),
  ('8dc12a04-6e47-4f9c-ac19-368df609e14e', 'index', 46, 36, 111, 54.1),
  ('624ba022-5803-4c5a-a76f-c2eae3cab53d', 'index', 25.2, 17, 80, 19.7),
  ('27a39f8d-b87d-4f7b-8010-60aeec1bfffb', 'index', 24.1, 16, 91, 31.9),
  ('0d901072-e112-4a2d-abc9-95c920e40031', 'index', 24.1, 17, 88, 27.1),
  ('525c2d85-4afc-435d-a199-86d9c666f27a', 'index', 21.3, 15, 89, 28.2)
) c(id, src, idx, ch, adj, dif);
do $$ begin
  if (select count(*) from scorecards s join rounds r on r.id = s.round_id join scorecard_signatures ss on ss.id = s.current_signature_id
      where r.course_version_id = '06128add-a431-492b-a237-85857890ab36' and r.deleted_at is null and s.deleted_at is null and s.signed_at is not null
        and ss.action = 'firmar' and ((r.tee_set_id = '61af48f0-d58b-4ff9-ba77-adc6e4b78502' and ss.course_rating = 62.2 and ss.slope = 102)
          or (r.tee_set_id = 'be7f8a24-9f57-48b2-9949-0e22b753f3b4' and ss.course_rating = 63.8 and ss.slope = 101))) <> 17
  then raise exception 'CUBA Villa de Mayo: no quedaron las 17 tarjetas firmadas con el rating nuevo'; end if;
end $$;
commit;
