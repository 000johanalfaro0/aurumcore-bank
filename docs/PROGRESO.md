# aurumcore-bank — progreso real

## LEE ESTO PRIMERO

Este archivo dice lo que existe DE VERDAD y esta comprobado. No repitas trabajo hecho.
Antes de confiar en cualquier casilla, vuelve a correr la prueba.

- Alcance de lo que se construye ahora: `SPEC-LITE.md` (Fase 1).
- Hoja de ruta completa: `SPEC.md` y `docs/01..10` (Fases 2 y 3). No se toca.
- Reglas comunes del portafolio: `../LITE-CONTRATO.md`.

## Estado a 2026-09-10

### F0 — arranque reproducible y primera prueba: **HECHO Y VERDE**

Comando: `node scripts/smoke.mjs` · Codigo de salida: **0** · 9 de 9 comprobaciones.

Lo que quedo montado y probado:

| Pieza | Detalle |
|---|---|
| Base local | PostgreSQL 16 en Docker, puerto `127.0.0.1:5433`, base `aurumcore` |
| Roles | `aurum_migrator` (dueno del esquema) y `aurum_app` (ejecucion, `nobypassrls`) |
| Backend | Java 21 + Spring Boot 3.3.5 + Flyway, puerto `8081` |
| Migraciones | `V1__base_y_rls.sql` (entidad, usuario, cuenta + RLS) y `V2__semilla_demo.sql` |
| Aislamiento | RLS con `force`, entidad activa en `aurumcore.entidad_id` via `SET LOCAL` |
| Comprobacion | `GET /api/salud` informa rol, esquema y version de migracion aplicada |
| ADN visual | Confirmado por el usuario. Maqueta en `design/` |

Las 9 comprobaciones de F0:
1. la base arranca desde cero y responde
2. el backend compila
3. el backend arranca y responde `/api/salud`
4. Flyway aplico las migraciones (version 2)
5. la app usa el rol de ejecucion, no el dueno del esquema
6. sin entidad fijada no se ve ninguna fila (fallo cerrado)
7. la entidad A ve solo sus 3 cuentas
8. la entidad A no ve ni una fila de la entidad B
9. la entidad A no puede escribir una fila de la entidad B

### Dos fallos reales que la prueba encontro (y estan corregidos)

1. **La semilla no podia escribir.** Las tablas usan `FORCE ROW LEVEL SECURITY`, asi que
   ni el dueno del esquema se salta las politicas. `V2` ahora fija la entidad activa antes
   de insertar. Es lo correcto: si la semilla pudiera saltarselas, habria puerta trasera.
2. **`/api/salud` devolvia 500.** El rol de ejecucion no tenia permiso de lectura sobre la
   tabla de historial de Flyway. Se anadio un `grant select` explicito, solo lectura.

### Infraestructura externa: **HECHA Y VERIFICADA** (2026-09-10)

| Pieza | Estado | Comprobado con |
|---|---|---|
| Repositorio | https://github.com/000johanalfaro0/aurumcore-bank (publico) | `gh repo view` |
| Schema en Supabase | `aurumcore` en `portafolio-shared` (fnfptbjelhayysbuccjh) | consulta a pg_roles y pg_namespace |
| Roles | `aurum_migrator` y `aurum_app`, ninguno superusuario, ninguno con bypass de RLS | consulta a pg_roles |
| Migraciones en Supabase | V1 y V2 aplicadas por Flyway al arrancar | `/api/salud` devolvio migracionMaxima 2 |
| RLS en Supabase | activado Y forzado en entidad, usuario y cuenta; 1 politica cada una | consulta a pg_class |
| Credenciales | en `.env.local`, ignorado por git. No se pueden releer desde Supabase | `git check-ignore` |

Prueba real del contenedor contra Supabase:

```
docker run --env-file .env.local aurumcore-backend:0.1.0
curl http://127.0.0.1:8083/api/salud
{"estado":"ok","rol":"aurum_app","esquema":"aurumcore","migracionMaxima":"2"}
```

PENDIENTE: la cuenta de Koyeb. La crea el usuario. Ver `docs/DESPLIEGUE.md`.

### Lo siguiente (F1)

Todavia NO existe: frontend, autenticacion, transferencias, retenciones ni libro mayor.
Orden previsto: autenticacion real con Spring Security -> modulo Cuentas y saldos ->
Transferencias con idempotencia -> Retenciones -> Libro mayor con el asiento por partida doble.

## Destino en Supabase

Regla del portafolio: **cada proyecto vive en su propio schema** dentro del proyecto
compartido `portafolio-shared` (id `fnfptbjelhayysbuccjh`). Ver `../ESTADO-PORTAFOLIO.md`.

| Concepto | Valor para este proyecto |
|---|---|
| Schema | `aurumcore` |
| Rol que migra | `aurum_migrator` |
| Rol de ejecucion | `aurum_app` |

Las pruebas corren **siempre contra la base local en Docker**, nunca contra Supabase.

## Comandos

```bash
node scripts/smoke.mjs                                   # F0 completo, desde cero
docker compose -f infra/docker-compose.yml up -d db      # solo la base
mvn -f backend/pom.xml -DskipTests package               # compilar
java -jar backend/target/aurumcore-backend-0.1.0.jar     # arrancar backend
docker compose -f infra/docker-compose.yml down -v       # borrar todo
```
