# Pruebas y evidencia — aurumcore-bank

Estado actual: ninguna prueba de aplicación ejecutada; esta documentación define las pruebas a implementar. El validador del portafolio solo comprueba documentación, no acredita software.

## Entorno reproducible

Fixtures sintéticos en tests/fixtures y seed idempotente. Crear ALFA/BETA; usuario propietario de ALFA y miembro limitado de BETA; dos miembros separados para solicitud/aprobación; usuarios externos distintos dentro de ALFA si aplica. Cada fixture documenta objetivo y fuente ficticia. No usar PII real. Base E2E PostgreSQL real con mismo RLS/roles que runtime; proveedores dobles en modo contract y sandbox real en modo integration, claramente distinguidos.

El test crea entradas mediante API/casos de uso autorizados, interactúa desde navegador y recarga. Aserciones de BD usan conexión read-only de test acotada para verificar invariantes; no acceso privilegiado en aplicación. Un test debe fallar si falta un elemento o cambia el resultado, nunca catch-and-continue ni screenshot sin aserción.

## Escenarios críticos específicos

| ID | Escenario | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| CRIT-01 | Conservación | Cuenta A 100; B 0; 50 peticiones de 3 | Transferir concurrentemente con claves distintas | 33 éxitos; A=1, B=99, total=100; ninguna negativa |
| CRIT-02 | Reintento tras commit | Transferencia publicada, respuesta perdida | Repetir misma clave 10 veces | Un asiento, una transferencia |
| CRIT-03 | Fondos retenidos | A=100 y hold=80 | Transferir 30 | 409; posted=100,held=80 |
| CRIT-04 | Reverso | A envía 40 a B con fondos suficientes para devolver | Aprobar reverso con actor distinto | Original intacto y nuevo asiento opuesto equilibrado |


## Aceptación por superficie

| Suite ID | Debe demostrar | Evidencia |
| --- | --- | --- |
| AUTH | Registro/verify/recover, invitación consumida/caducada, MFA privilegiado, logout/revocación y cambio de tenant | Trace de navegador + respuestas directas de API |
| TENANT | A→B en GET/list/count/search/file/export/stream/job y FK; scope externo dentro A; pool reutilizado; RLS rol runtime | Resultados negativos y consulta que demuestra cero efectos |
| DOMAIN | Reglas INV-n y cada CRIT-n, errores422/409 y transiciones inválidas | Pruebas unitarias/integración y valores concretos de BD |
| CONCURRENCY | 50 clientes con barrera para soltar peticiones simultáneas; idempotencia repetida y claves diferentes | Conteo de éxitos/conflictos y saldo/stock/reservas final |
| API | OpenAPI validado, cliente generado sin drift; request/response/error por operación; auth/CSRF | Reporte de contrato ligado a operationId |
| UI | Cada DOMnn-Axx y control común/local probado con rol y estado apropiados; reload posterior | control-results.json, Playwright HTML/JUnit, trace.zip y capturas útiles |
| ARCH | Imports por módulo/capa, cero ciclos y ninguna llamada DB desde frontend/automation | Reporte herramientas de límites |
| OPS | Readiness, migración anterior→actual, reinicio de worker, backup/restore, logs redacted | Logs y checksums sin secretos |


## Cobertura de controles sin atajos

tests/control-manifest.json enumera IDs comunes de 05-FRONTEND.md y por módulo DOMnn-READ, DOMnn-LOCAL-OPEN, DOMnn-LOCAL-CANCEL, DOMnn-FILTER, DOMnn-NEXT, DOMnn-DETAIL, DOMnn-RETRY y cada DOMnn-Axx. Cada registro: {id,route,label,permission,operationId?,testFile,testTitle,assertions,applicability}. expected-controls.json entregado en este paquete es la lista documental de partida, no resultado de ejecución.

El reporter E2E produce evidence/control-results.json con {id,testId,status,runId,commit,assertions,tracePath}. scripts/verify-controls.mjs cruza manifiesto completo, descubrimiento de tests y resultados del mismo run: falla por control sin test, test skipped, duplicado ambiguo, aserción ausente, referencia a commit viejo o evidencia inexistente. Un test puede cubrir varios controles si tiene aserción específica para cada uno. Acciones UI locales no necesitan endpoint, sí comprobación de comportamiento/foco y ausencia de mutación cuando corresponda.

## Flujo E2E principal y fallos

E2E-01: crear/iniciar tenant, invitar roles, sembrar maestros, ejecutar secuencia de 06-PROCESOS.md desde UI y comprobar la killer feature: Ejecutar transferencias concurrentes y reintentos tras caídas sin crear dinero, duplicar movimientos ni gastar saldo retenido. Confirmar resultado en BD y pantalla después de reload y nueva sesión.

E2E-02: repetir como rol insuficiente y usuario BETA con UUID conocidos; afirmar error y cero efectos. E2E-03: formulario inválido, vacío y conexión interrumpida; conservar entradas. E2E-04: versión concurrente409 y recuperación sin duplicar mutación. E2E-05: teclado y móvil390 en todas las rutas; no confundir visible con usable. E2E-06: tarea larga, refresh/reinicio y retorno a resultado final.  

## Rendimiento y evaluación

Perfil reproducible: hardware/CPU/RAM y versiones en reporte; dataset100000 filas del recurso principal por tenant,50 sesiones concurrentes durante5min tras30s de calentamiento. Medir p50/p95/p99, tasa de errores, filas examinadas, consultas por petición y lag de outbox. Objetivo inicial: lecturas paginadas p95<500ms y comandos locales p95<800ms sin proveedor; error inesperado<1%. El tiempo LLM/PSP se reporta aparte y API responde202 cuando largo. No prometer200ms universal.

Frontend: rutas con tabla y detalle sin descargar todos los registros; medir interacción/carga con perfil documentado. Capturas desktop/mobile y accesibilidad automática más recorrido teclado. Tests de concurrencia comprueban invariantes siempre, incluso si no se alcanzan metas de latencia.



## Política de resultado

Estados permitidos: PASS, FAIL, BLOCKED_EXTERNAL, NOT_RUN. No convertir un skip en PASS. Gate local completo y gate de integraciones sandbox se reportan separados; si falta credencial/servicio, la aplicación no queda declarada integrada de punta a punta con ese proveedor. No usar porcentaje de cobertura como sustituto de estas garantías. Revisión de dependencias registra vulnerabilidades explotables y remediación; hallazgos críticos/altos sin resolver bloquean entrega salvo excepción concreta documentada por responsable.

Referencia: [Assertions de Playwright](https://playwright.dev/docs/test-assertions); preferir locators por rol/label y aserciones reintentables, sin sleeps arbitrarios.
