#!/usr/bin/env node
/**
 * F0 — arranque reproducible y primera prueba.
 *
 * No prueba funciones de negocio. Prueba que el proyecto arranca desde cero, que las
 * migraciones se aplican solas, y que el aislamiento por entidad ya esta activo
 * ANTES de escribir la primera funcion.
 *
 * Empieza siempre borrando la base: "arranca desde un clon limpio" tiene que ser cierto.
 *
 * Uso:  node scripts/smoke.mjs
 * Sale con codigo 0 solo si todas las comprobaciones pasan.
 */
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openSync, readFileSync } from 'node:fs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPOSE = ['compose', '-f', join(RAIZ, 'infra', 'docker-compose.yml')];
const JAR = join(RAIZ, 'backend', 'target', 'aurumcore-backend-0.1.0.jar');
const LOG = join(RAIZ, 'backend', 'target', 'arranque.log');
const SALTO = String.fromCharCode(10);
const A = '11111111-1111-1111-1111-111111111111'; // Banco Meridiano
const B = '22222222-2222-2222-2222-222222222222'; // Caja Altamar

let fallos = 0;
const paso = (n, ok, det) => {
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${n}${det ? `  -> ${det}` : ''}`);
  if (!ok) fallos++;
};
const ejecutar = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
const docker = (args) => ejecutar('docker', args);

/** SQL como aurum_app: el rol de ejecucion, sin bypass de RLS. */
const comoApp = (sql) =>
  docker([...COMPOSE, 'exec', '-T', '-e', 'PGPASSWORD=app_local_dev', 'db',
          'psql', '-U', 'aurum_app', '-d', 'aurumcore', '-tAc', sql])
    .split(SALTO).map((l) => l.trim()).filter(Boolean).pop();

async function esperar(nombre, fn, intentos, esperaMs = 1000) {
  for (let i = 0; i < intentos; i++) {
    try { if (await fn()) return true; } catch { /* aun no */ }
    await dormir(esperaMs);
  }
  throw new Error(`tiempo agotado esperando: ${nombre}`);
}

console.log(`--- F0 aurumcore-bank ---${SALTO}`);
let backend = null;
try {
  // 0. Base de datos desde cero
  try { docker([...COMPOSE, 'down', '-v']); } catch { /* no existia */ }
  docker([...COMPOSE, 'up', '-d', 'db']);
  await esperar('base sana', () =>
    docker([...COMPOSE, 'ps', '--format', '{{.Health}}', 'db']).includes('healthy'), 60);
  paso('1. la base arranca desde cero y responde', true);

  // 1. Compilar. En Windows mvn es un .cmd, por eso necesita shell.
  ejecutar('mvn', ['-q', '-f', join(RAIZ, 'backend', 'pom.xml'), '-DskipTests', 'package'],
           { shell: process.platform === 'win32' });
  paso('2. el backend compila', true);

  // 2. Arrancar: Flyway aplica las migraciones al iniciar
  const fd = openSync(LOG, 'w');
  backend = spawn('java', ['-jar', JAR], { stdio: ['ignore', fd, fd] });
  let salud = null;
  await esperar('backend arriba y /api/salud responde 200', async () => {
    const r = await fetch('http://127.0.0.1:8081/api/salud').catch(() => null);
    if (!r || !r.ok) return false;
    salud = await r.json();
    return true;
  }, 90);

  paso('3. el backend arranca y responde /api/salud', salud?.estado === 'ok');
  paso('4. Flyway aplico las migraciones', salud?.migracionMaxima === '2',
       `version ${salud?.migracionMaxima}`);
  paso('5. la app usa el rol de ejecucion, no el dueno del esquema',
       salud?.rol === 'aurum_app', `rol ${salud?.rol}`);

  // 3. Aislamiento por fila (semilla de LITE-01)
  const sinEntidad = comoApp('select count(*) from cuenta');
  paso('6. sin entidad fijada no se ve ninguna fila (fallo cerrado)',
       sinEntidad === '0', `filas ${sinEntidad}`);

  const deA = comoApp(
    `select set_config('aurumcore.entidad_id','${A}',false); select count(*) from cuenta`);
  paso('7. la entidad A ve solo sus 3 cuentas', deA === '3', `filas ${deA}`);

  const fuga = comoApp(
    `select set_config('aurumcore.entidad_id','${A}',false);` +
    ` select count(*) from cuenta where entidad_id='${B}'`);
  paso('8. la entidad A no ve ni una fila de la entidad B', fuga === '0', `filas ${fuga}`);

  const intruso = comoApp(
    `select set_config('aurumcore.entidad_id','${A}',false);` +
    ` do $$ begin` +
    `   insert into cuenta (entidad_id,iban,titular,moneda)` +
    `   values ('${B}','ES76 0000 0000 0000 0000','Intruso','EUR');` +
    ` exception when others then null; end $$;` +
    ` select count(*) from cuenta where titular='Intruso'`);
  paso('9. la entidad A no puede escribir una fila de la entidad B',
       intruso === '0', `filas intrusas ${intruso}`);
} catch (e) {
  console.error(`${SALTO}FALLA  ${e.message}`);
  console.error(`--- ultimas lineas de ${LOG}:`);
  try { console.error(readFileSync(LOG, 'utf8').split(SALTO).slice(-20).join(SALTO)); }
  catch { console.error('(sin registro de arranque)'); }
  fallos++;
} finally {
  if (backend?.pid) {
    try { ejecutar('taskkill', ['/PID', String(backend.pid), '/T', '/F']); }
    catch { try { backend.kill('SIGKILL'); } catch {} }
  }
}

console.log(`${SALTO}${fallos === 0 ? 'TODO VERDE' : `${fallos} COMPROBACIONES FALLARON`}`);
process.exit(fallos === 0 ? 0 : 1);
