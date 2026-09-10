# Gate final reproducible — aurumcore-bank

> Contrasta el software y sus evidencias con cada ACC de docs/10-ACEPTACION.md y toda la especificación. Implementa cualquier gate faltante; no crear scripts que devuelvan verde sin ejecutar comprobaciones. Ejecuta verify contract y, con credenciales de prueba autorizadas, verify sandbox. Incluye arquitectura, lint/tipos, unit/integration, auth/tenancy, concurrencia, E2E/controles, seguridad, jobs, build, rendimiento y recuperación. Examina salidas, timestamps, commit/digest y persistencia; comprueba que el reporte no pertenece a ejecución vieja. Corrige fallos de código y vuelve a probar lo afectado. Si falta proveedor, registra BLOCKED_EXTERNAL con nombre y condición, nunca PASS. Actualiza README con arranque exacto y evidencia sanitizada. Prepara demo y handoff; no hagas push/despliegue sin autorización vigente.

~~~powershell
$env:PROJECT_RUN_ID = [guid]::NewGuid().ToString()
node scripts/project.mjs verify --mode contract
node scripts/project.mjs verify --mode sandbox
~~~

Entregar evidence/acceptance.md y summary.json con criterio→prueba→resultado→artefacto. Enumerar limitaciones materiales y separar aplicación verificada localmente de integraciones sandbox y despliegue productivo.
