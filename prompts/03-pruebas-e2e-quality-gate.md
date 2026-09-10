# E2E y verificación de cada control — aurumcore-bank

> Usa docs/05-FRONTEND.md,06-PROCESOS.md,07-PRUEBAS.md y expected-controls.json como contrato. Comprueba que el runner, entorno y tests existen; completa lo faltante, no lo omitas. Arranca PostgreSQL/IdP/backend/frontend reales locales; prepara ALFA/BETA y roles separados. Crea tests Playwright con aserciones por cada botón, formulario, navegación, filtro y detalle. Prueba camino feliz, vacío, carga, validación, error de red, permiso insuficiente, conflicto409, recarga y persistencia. Ejecuta los CRIT-n y carrera sobre el último recurso. La demo central es: Ejecutar transferencias concurrentes y reintentos tras caídas sin crear dinero, duplicar movimientos ni gastar saldo retenido. Verifica valores persistidos y ausencia de efectos no autorizados. Produce control-manifest implementado y control-results del run actual; cualquier control sin evidencia o test skipped bloquea. No afirmar éxito por una captura o clic sin aserción.

~~~powershell
$env:PROJECT_RUN_ID = [guid]::NewGuid().ToString()
node scripts/project.mjs up
node scripts/project.mjs migrate
node scripts/project.mjs seed
node scripts/project.mjs integration
node scripts/project.mjs concurrency
node scripts/project.mjs e2e
node scripts/project.mjs controls
node scripts/project.mjs accessibility
~~~

Salida: HTML/JUnit/trace de Playwright, capturas desktop/móvil por ruta, reporte de controles y resultados CRIT con valores BD. Proveedor contract y sandbox se identifican por separado; no usar base simulada en este gate de integración local.
