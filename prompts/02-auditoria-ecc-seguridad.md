# Auditoría de arquitectura y seguridad — aurumcore-bank

> Audita la implementación actual contra docs/01-ARQUITECTURA.md,02-SEGURIDAD-TENANCY.md,03-DATOS.md y04-API.md. Primero verifica que existen scripts/project.mjs y manifests; si faltan, implementa el gate requerido en F0 y no inventes un CLI ecc. Inspecciona dependencias entre módulos, ciclos, lógica de negocio en componentes/n8n, ORM fuera de backend, secretos, sesiones/MFA/CSRF, permisos por campo/recurso, RLS con rol runtime y FK compuestas. Prueba dos tenants y dos cuentas externas dentro del mismo tenant. Incluye archivos, búsquedas, exports, caché, streams, jobs. Ejecuta los comandos de abajo con resultados reales; documenta hallazgos por severidad y referencia. Corrige defectos dentro del alcance y repite suites afectadas. No marques seguro por ausencia de coincidencias en rg ni por esconder botones.

~~~powershell
$env:PROJECT_RUN_ID = [guid]::NewGuid().ToString()
node scripts/project.mjs doctor
node scripts/project.mjs architecture
node scripts/project.mjs auth
node scripts/project.mjs tenancy
node scripts/project.mjs security
~~~

Salida: evidence/{run_id}/security-review.md con archivos/líneas, riesgo, reproducción, corrección y retest; informe SCA y prueba de que requests no autorizados no mutan BD. Nunca mostrar tokens/PII completos en salida.
