-- V2: dos entidades para la demo y para probar el aislamiento.
--
-- Ojo: las tablas usan FORCE ROW LEVEL SECURITY, asi que ni siquiera el dueno del
-- esquema puede saltarse las politicas. Por eso la semilla fija la entidad activa
-- antes de insertar. Es deliberado: si la semilla pudiera escribir sin pasar por
-- las politicas, el aislamiento tendria una puerta trasera.

-- ---- Banco Meridiano ----
select set_config('aurumcore.entidad_id', '11111111-1111-1111-1111-111111111111', false);
insert into entidad (id, nombre)
  values ('11111111-1111-1111-1111-111111111111', 'Banco Meridiano');
insert into cuenta (entidad_id, iban, titular, moneda) values
  ('11111111-1111-1111-1111-111111111111','ES76 2100 4471 8802 3391','Martina Alcazar Ferrer','EUR'),
  ('11111111-1111-1111-1111-111111111111','ES76 2100 9032 1140 5528','Comercial Vega Andrade SL','EUR'),
  ('11111111-1111-1111-1111-111111111111','US64 SVBK 1180 2299 0417','Northbay Freight LLC','USD');

-- ---- Caja Altamar ----
select set_config('aurumcore.entidad_id', '22222222-2222-2222-2222-222222222222', false);
insert into entidad (id, nombre)
  values ('22222222-2222-2222-2222-222222222222', 'Caja Altamar');
insert into cuenta (entidad_id, iban, titular, moneda) values
  ('22222222-2222-2222-2222-222222222222','ES76 0049 7781 2204 6650','Astilleros Rivamar SL','EUR'),
  ('22222222-2222-2222-2222-222222222222','ES76 0049 3312 8890 1147','Hugo Belmonte Iriarte','EUR');

select set_config('aurumcore.entidad_id', '', false);
