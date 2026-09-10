# Construcción, operación y comandos — aurumcore-bank

## Aviso sobre el estado actual

Este paquete contiene especificaciones. **scripts/project.mjs, compose, manifests y tests de la aplicación deben implementarse en F0 y completarse por fase.** Los comandos siguientes son el contrato de interfaz de ese runner futuro, no evidencia de que hoy exista software ejecutable. Si falta un archivo, el agente debe implementarlo antes; no sustituirlo por un comando que imprima PASS ni afirmar que se ejecutó.

## Herramientas y entorno

Host de referencia: Windows PowerShell 7 o terminal compatible, Git, Node.js LTS y Docker Engine/Compose v2. El runner es Node multiplataforma, sin bash obligatorio; dependencias Java/Python/browser se ejecutan en contenedores fijados para evitar instalación manual. Versiones exactas, recursos mínimos medidos y lockfiles registrados en F0; no usar latest en CI ni imágenes flotantes. Java 21 LTS + Spring Boot + Spring Security + JPA + Flyway y React + TypeScript + Vite + React Router mantienen sus propios manifests.

infra/compose.yaml define gateway(frontend/API), frontend, backend, worker, db(PostgreSQL), identity(Keycloak con DB propia), object-storage(S3 compatible), scanner(antivirus) y smtp(Mailpit). servicios de test separados: frontend-tests, backend-tests, e2e, contract-provider, load-tests. Publicar solo gateway e interfaces locales de desarrollo explícitas, enlazadas a127.0.0.1. DB/IdP/SMTP de pruebas nunca accesibles públicamente.

Entornos dev/test/sandbox/prod separados por nombres compose, volúmenes, cuentas y credenciales. Por defecto levantar UN proyecto a la vez en localhost:3000 para no agotar recursos; PORT configurable para varios. Tests aislados con nombre aurumcore-bank-test y datos sintéticos; nunca reset de prod.

## Variables (nombres, no secretos)

| Variable | Uso |
| --- | --- |
| APP_ENV | development/test/sandbox/production; sin valor ambiguo |
| APP_ORIGIN | Origen HTTPS público o http://localhost:3000 de dev |
| DATABASE_URL | Runtime DB con permisos RLS; secreto |
| MIGRATION_DATABASE_URL | Solo job migrador; nunca frontend ni runtime |
| OIDC_ISSUER_URL / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET | Proveedor identidad y cliente servidor; secret privado |
| SESSION_ENCRYPTION_KEY | Cifrado tokens/sesiones con versión de clave |
| OBJECT_STORAGE_ENDPOINT / OBJECT_STORAGE_BUCKET | Objetos privados y entorno aislado |
| OBJECT_STORAGE_ACCESS_KEY / OBJECT_STORAGE_SECRET_KEY | Credenciales limitadas a bucket y prefijo |
| SMTP_URL | Mailpit en local; transporte autorizado en sandbox |
| INTEGRATION_MODE | contract o sandbox; visible en reporte |
| LOG_LEVEL / OTEL_EXPORTER_OTLP_ENDPOINT | Observabilidad sin PII |


.env.example contiene nombres y valores no sensibles de ejemplo. setup genera secretos locales aleatorios en archivo ignorado, sin imprimirlos ni reutilizar credenciales reales. Nunca incluir .env.local, tokens, cookies, storage-state de Playwright, exports de credenciales ni base dumps en Git. Frontend solo recibe configuración pública de origen/feature flags; nada de DATABASE_URL o llaves API.

## Runner obligatorio y códigos de salida

Implementar scripts/project.mjs con spawn/execFile y argumentos separados, shell:false, propagación de exitCode y señales, timeout documentado y logs por comando bajo evidence/{run_id}. Validar target de filesystem y entorno antes de cualquier limpieza. No borrar volúmenes por defecto. Comandos desconocidos2; éxito real0; fallo de test/build1; prerequisito/config ausente2; dependencia sandbox ausente3 y estado BLOCKED_EXTERNAL. El gate nunca convierte exit3/skipped en PASS. Todos los comandos aceptan --run-id UUID o PROJECT_RUN_ID. verify crea un run_id y lo transmite a todos los subprocessos; e2e y controls independientes deben compartir PROJECT_RUN_ID. controls falla si no se proporciona, si cambia el hash del código/entorno o si falta reporte E2E del mismo run. No usar un marcador latest como prueba de éxito.

| Comando desde raíz | Contrato de ejecución |
| --- | --- |
| node scripts/project.mjs doctor | Valida manifests/lockfiles/config sin revelar secretos, Docker disponible, puertos y directorio del proyecto. No llama a terceros. |
| node scripts/project.mjs setup | Prepara entorno local y construye imágenes versionadas. No activa integraciones reales ni workflows contra terceros. |
| node scripts/project.mjs up | Bootstrap ordenado: docker compose up de db/identity/object-storage/smtp/scanner con --wait; ejecutar migrate con migrador; después levantar backend/worker/frontend/gateway y capas aplicables con --wait --wait-timeout 120. No esperar readiness de app antes de migrar una base vacía. |
| node scripts/project.mjs migrate | Ejecuta migrador con usuario separado; registra versión y prueba compatibilidad. |
| node scripts/project.mjs seed | Seed repetible local/test para ALFA/BETA y roles; bloquea APP_ENV=production. Usa operaciones que conservan invariantes. |
| node scripts/project.mjs contracts | Valida OpenAPI/event schemas y drift de cliente generado; contratos request/response. |
| node scripts/project.mjs architecture | Ejecuta límites/ciclos/imports descritos en01; fallo real por dependencia prohibida. |
| node scripts/project.mjs lint | Linter de frontend/backend; también formatos JSON n8n si aplica. |
| node scripts/project.mjs types | TypeScript tsc/Angular typecheck; Python mypy si aplica; Java compile. |
| node scripts/project.mjs unit | Reglas de dominio puras, cálculos y validaciones; reporte por módulo. |
| node scripts/project.mjs integration | Tests backend contra PostgreSQL/objetos/IdP reales locales; no mocks de repositorio para este gate. |
| node scripts/project.mjs auth | Suite AUTH de registro, sesiones, CSRF, invitaciones y MFA. |
| node scripts/project.mjs tenancy | Suite TENANT de RLS/FK/pool/scope/archivos/jobs/streams. |
| node scripts/project.mjs concurrency | Ejecuta CRIT-n y50 clientes con barrera; verifica invariantes persistidas. |
| node scripts/project.mjs e2e | Playwright dentro servicio e2e, baseURL del gateway test; Chromium desktop/móvil y smoke Firefox. |
| node scripts/project.mjs controls | Cruza expected-controls, manifest implementado y reporte E2E del mismo run; falla por faltante/skipped. |
| node scripts/project.mjs accessibility | Axe u otra herramienta + evidencias del recorrido teclado/móvil especificado. |
| node scripts/project.mjs security | Dependencias, secretos, autorización, upload/SSRF/CSRF y threat-model; no solo búsqueda de palabras. |
| node scripts/project.mjs jobs | Outbox/inbox, expiración de lease, reinicio, retries y efectos inciertos. |
| node scripts/project.mjs integrations --mode contract | Prueba adaptadores contra proveedor local determinista que reproduce firma,429,timeout y consulta por referencia. |
| node scripts/project.mjs integrations --mode sandbox | Verifica proveedor real de sandbox con cuentas autorizadas; si falta credencial registra BLOCKED_EXTERNAL y exit3. |
| node scripts/project.mjs performance | Carga/perfil de07; reporta percentiles/error/lag y fallos de objetivos con datos. |
| node scripts/project.mjs recovery | Snapshot/restore en volumen test nuevo, migración compatible y reinicio worker; compara conteos/checksums/invariantes. |
| node scripts/project.mjs build | Produce imágenes independientes frontend/backend y valida assets/workflows; no publica imagen ni despliega. |
| node scripts/project.mjs verify --mode contract | Orquesta todos los gates locales aplicables y escribe resumen; falla si falta suite requerida. No declara integraciones reales. |
| node scripts/project.mjs verify --mode sandbox | Gates locales más sandbox real; acceptance diferencia local e integración. |
| node scripts/project.mjs down | Detiene solo compose de este proyecto, sin -v ni borrado recursivo. |


## Implementación subyacente de pruebas

El runner llama docker compose run --rm al servicio de test correspondiente con TEST_SUITE explícito. Dentro de frontend-tests: npm ci; npm run lint; npm run typecheck; npm run test:unit; npm run build (scripts separados, no encadenar ignorando errores). Backend ./mvnw verify con perfiles test para unit/integration/security/concurrency, JUnit y Testcontainers o DB de compose; compile y ArchUnit. Tests que requieren Docker dentro de Docker deben elegir DB compose accesible; no montar socket en runtime ni duplicar Testcontainers innecesariamente.

E2E: package independiente en tests/e2e; npm ci y npx playwright test con proyecto/grep apropiados y reporter de controles. No usar npx descargando dependencias imprevistas: Playwright fijado en lockfile e imagen de browser compatible. Java Maven wrapper y distribución fijados; Python uv.lock y herramientas dev fijadas. Auditar dependencias con npm audit --json por package, pip-audit sobre entorno Python bloqueado cuando aplica y analizador SCA para Maven; interpretar informe, no editarlo para obtener verde.

## Orden que ejecutará el usuario al terminar la implementación

~~~powershell
$env:PROJECT_RUN_ID = [guid]::NewGuid().ToString()
node scripts/project.mjs doctor
node scripts/project.mjs setup
node scripts/project.mjs up
node scripts/project.mjs migrate
node scripts/project.mjs seed
node scripts/project.mjs verify --mode contract
node scripts/project.mjs verify --mode sandbox
~~~

Antes de cada paso comprobar exit code; no continuar como si hubiera arrancado cuando readiness falló. Los prompts de la carpeta ../prompts explican cómo crear lo ausente y cómo distinguir bloqueo externo de fallo de código.

## CI y repositorio GitHub

CI desde clon limpio: docs/contracts → lint/types/architecture → unit/integration/security/tenancy/concurrency → build → E2E/controls. PostgreSQL/IdP/objetos locales efímeros. Sandbox real en workflow protegido/manual con secretos de entorno y cuenta test; no correr con secretos en PR de forks. Artefactos JUnit/Playwright sanitizados, retención14d; nunca grabar passwords/tokens. Un PR no cumple por build únicamente.

Estructura recomendada: un repositorio GitHub por proyecto, con frontend/backend/automation separados dentro. No abrir repositorio remoto ni push como parte de redactar estos MD. release.yml prepara imágenes/versiones/changelog y migración revisables; despliegue remoto requiere autorización ya dada por usuario o aprobación final concreta.

## Producción, observabilidad y recuperación

Deploy por capa: frontend estático/Node según framework; backend/worker contenedores separados; AI/n8n privados si aplican. DB administrada/respaldada y storage privado. No prometer coste cero ni disponibilidad empresarial por usar free tier. TLS, cookies/headers, cuotas por tenant, tamaño de payload y aislamiento de conexiones verificados.

OpenTelemetry trace_id propagado frontend→backend→outbox→worker→adaptador. Métricas: latencia p95, errores, DB pool, outbox lag, retries, tareas DEAD/UNKNOWN y anomalías de invariantes. Evitar tenant_id como label de cardinalidad ilimitada; logs incluyen identificador interno cuando autorizado. Alertas: error rate>1%5min, oldest outbox>60s, dead-letter>0, restore fallido y agotamiento de presupuesto AI si aplica.

Objetivos iniciales de recuperación: RPO<=24h y RTO<=4h, a comprobar en entorno desplegado; requisitos más estrictos requieren PITR/frecuencia y coste acordes. Backup cifrado diario DB+metadatos/objetos, claves separadas; retención7diarios/4semanales para demo operativa. Recovery restaura en instancia nueva y verifica tenancy, conteos, hashes de archivos y casos de negocio; registrar tiempo real. No afirmar RTO sin simulacro.

Rollback usa imagen previa compatible y detiene nuevas tareas si cambia contrato. No restaurar DB sobre datos recientes a ciegas ni borrar ejecuciones para ocultar efectos. Migración irreversible necesita plan de recuperación y autorización específica cuando se ejecute en datos reales.
