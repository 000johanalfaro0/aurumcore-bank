-- V1: entidades, usuarios y cuentas, con aislamiento por fila desde el primer dia.
-- Propiedad del backend. El rol aurum_app NUNCA puede saltarse estas politicas.

create table entidad (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  creado_en timestamptz not null default now()
);

create table usuario (
  id         uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidad(id),
  email      text not null,
  clave_hash text not null,
  rol        text not null check (rol in ('OPERADOR','APROBADOR','AUDITOR')),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  unique (entidad_id, email)
);

create table cuenta (
  id         uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidad(id),
  iban       text not null,
  titular    text not null,
  moneda     char(3) not null check (moneda in ('EUR','USD')),
  creado_en  timestamptz not null default now(),
  unique (entidad_id, iban)
);
create index cuenta_entidad_idx on cuenta (entidad_id, titular);

-- ---------------------------------------------------------------------------
-- Aislamiento por fila. La entidad activa viaja en una variable de sesion que
-- el backend fija dentro de cada transaccion (SET LOCAL). Si no esta fijada,
-- no se ve ninguna fila: fallo cerrado, nunca abierto.
-- ---------------------------------------------------------------------------
create or replace function entidad_activa() returns uuid
language sql stable as $$
  select nullif(current_setting('aurumcore.entidad_id', true), '')::uuid
$$;

alter table entidad enable row level security;
alter table entidad force  row level security;
create policy entidad_propia on entidad
  using (id = entidad_activa());

alter table usuario enable row level security;
alter table usuario force  row level security;
create policy usuario_propio on usuario
  using (entidad_id = entidad_activa())
  with check (entidad_id = entidad_activa());

alter table cuenta enable row level security;
alter table cuenta force  row level security;
create policy cuenta_propia on cuenta
  using (entidad_id = entidad_activa())
  with check (entidad_id = entidad_activa());

grant select, insert, update on entidad, usuario, cuenta to aurum_app;
alter default privileges in schema aurumcore
  grant select, insert, update on tables to aurum_app;

-- La comprobacion de arranque informa que migracion esta aplicada. Flyway crea su
-- tabla de historial antes de esta migracion y solo la ve su dueno, asi que el rol de
-- ejecucion necesita permiso explicito de LECTURA. Solo lectura: quien migra es Flyway.
grant select on flyway_schema_history to aurum_app;
