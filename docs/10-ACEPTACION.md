# Contrato de aceptación — aurumcore-bank

La documentación puede estar completa mientras la aplicación sigue sin construir. Esta lista pertenece a la entrega futura del software. Estado inicial de todos los criterios: NOT_RUN. No marcar completado por intención, existencia de archivo o prueba de otra capa.

| ID | Criterio | Evidencia requerida | Estado inicial |
| --- | --- | --- | --- |
| ACC01 | Clon de esta carpeta autocontenido | README + manifests/lockfiles y arranque limpio | NOT_RUN |
| ACC02 | Frontend/backend modulares separados | Reporte architecture + imágenes/manifests independientes | NOT_RUN |
| ACC03 | Auth, MFA, sesiones e invitaciones | Suite AUTH ejecutada + prueba de revocación | NOT_RUN |
| ACC04 | Tenancy integral y scopes internos | Suite TENANT con runtime RLS, FK y pruebas de archivos/jobs | NOT_RUN |
| ACC05 | Modelo y migraciones íntegros | DB desde vacío y upgrade, constraints activas y seed idempotente | NOT_RUN |
| ACC06 | Todos los comandos/rutas funcionales | Contrato OpenAPI + integration por operación | NOT_RUN |
| ACC07 | Todos los controles y pantallas | expected-controls vs E2E run actual, capturas y teclado | NOT_RUN |
| ACC08 | Invariantes y concurrencia específicas | Todos los INV-n y CRIT-n con resultados de BD | NOT_RUN |
| ACC09 | Outbox/reintentos/recuperación | Suite jobs y timeout tras efecto confirmado | NOT_RUN |
| ACC12 | Integraciones sandbox verificadas | Reporte proveedor real; no sustituir por contract | NOT_RUN |
| ACC13 | Calidad visual y rendimiento | Capturas desktop/móvil, access review y carga de07 | NOT_RUN |
| ACC14 | Operación y respaldo | Health, logs redacted, migraciones y restore medido | NOT_RUN |
| ACC15 | Seguridad y dependencias | SCA/secret scan + pruebas de permisos/CSRF/uploads | NOT_RUN |
| ACC16 | Entrega reproducible | Comandos exactos, exit codes, commit/digest, fecha, run_id y limitaciones | NOT_RUN |


## Evidencias a producir

evidence/{run_id}/summary.json: commit/diff_hash, image_digests, versions, environment, provider_mode, timestamp, suites[{name,command,exit_code,status,report_path}], controls{expected,passed,failed,missing}, critical_scenarios, limitations. Salidas reales, no JSON escrito a mano declarando PASS. evidence/acceptance.md referencia cada ACC y resultado; links deben existir. Guardar una copia sanitizada revisable para portfolio, excluyendo PII/secrets.

Si un proveedor no aplica a un proyecto sin integraciones externas, ACC12 debe declarar NO_APLICA con integración concreta evaluada y razón, no fingir verificación. Si sí aplica y falta acceso, BLOCKED_EXTERNAL y entrega de integración pendiente. El alcance de dominio nunca se reduce a una demo visual para cerrar checklist.

## Demostración para entrevista

Problema: Registrar transferencias, retenciones y reversos preservando integridad contable y evitando gastar fondos comprometidos.

Demostración principal: Ejecutar transferencias concurrentes y reintentos tras caídas sin crear dinero, duplicar movimientos ni gastar saldo retenido.

Preparar recorrido de5–8min con dos roles, empresa activa visible, proceso completo, un conflicto/fallo recuperado y prueba de aislamiento. Mostrar módulo/caso de uso/test que sostienen la garantía. No usar datos falsos en memoria para simular persistencia; fixtures sintéticos persistidos y declarados son apropiados. No presentar un proyecto de portfolio como sistema certificado/operado en producción real.
