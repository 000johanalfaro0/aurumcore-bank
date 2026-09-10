-- Roles de la aplicacion. Se ejecuta UNA vez, al crear el volumen de la base.
-- Espeja la receta del portafolio: un rol que migra y un rol de ejecucion sin bypass de RLS.
-- Contrasenas solo de desarrollo local. En Supabase se generan aparte.

create role aurum_migrator login password 'migrator_local_dev'
  nosuperuser nocreatedb nocreaterole nobypassrls;
create role aurum_app login password 'app_local_dev'
  nosuperuser nocreatedb nocreaterole nobypassrls;

grant aurum_migrator to postgres;
create schema aurumcore authorization aurum_migrator;
grant usage on schema aurumcore to aurum_app;

alter role aurum_migrator set search_path = aurumcore;
alter role aurum_app       set search_path = aurumcore;
grant create on database aurumcore to aurum_migrator;

-- gen_random_uuid()
create extension if not exists pgcrypto;
