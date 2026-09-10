# Plan de construcción para agente nuevo — aurumcore-bank

## Lectura y estado

Leer ../AGENTS.md, ../SPEC.md y docs01→10. No depender de conversaciones anteriores. Abrir solo este proyecto. Hoy el estado es SPECIFIED: no asumir que frontend/backend/scripts ya existen. Crear docs/PROGRESO.md con fase, decisiones, archivos cambiados, comandos reales/resultados y siguiente acción concreta; actualizar al terminar cada sesión. No tachar fases sin evidencia.

Cada fase es una unidad revisable pequeña, subdivisible conservando dependencias. Modelo por defecto de la sesión; usar razonamiento más fuerte para decisiones de contratos/concurrencia y revisión. No necesita servicios remotos para editar o verificar localmente. Publicar/push/desplegar solo cuando el usuario lo haya autorizado; preparar antes el resultado concreto.

| Fase | Depende | Contexto autocontenido y tareas | Verificación / salida | Reversión |
| --- | --- | --- | --- | --- |
| F0 — Repositorio y contratos | ninguna | Crear estructura modular de01, versiones/lockfiles, manifests independientes, compose, gateway y scripts/project.mjs con comandos de09. Crear OpenAPI y enums exhaustivos a partir de03/04/06; scripts de contratos y límites. | doctor; contracts; architecture. Arranque mínimo con readiness real, no endpoints vacíos de negocio. | Cambios locales reversibles; conservar documentos. |
| F1 — Identidad y tenancy | F0 | OIDC, sesión, CSRF, onboarding, memberships, invitaciones, MFA y permisos. Aplicar RLS/roles/FK y contexto transaccional; pantallas comunes AUTH/ORG/MEM/SES. | auth + tenancy contra PostgreSQL/IdP reales; dos tenants y usuario cruzado; revocación inmediata. | Revertir código compatible; no borrar identidades ajenas ni realm del usuario. |
| F2 — Modelo y maestros | F1 | Migraciones de todas las entidades03, catálogos configurables, fixtures de07, índices y estados permitidos. Implementar repositorios por módulo y casos de uso para altas. | migrate + seed + integration; FK/RLS negativos; esquema desde vacío y upgrade. | Expand/contract; restaurar solo DB aislada del proyecto si falla. |
| F3 — Primer flujo vertical | F2 | Construir Clientes y Cuentas y saldos: API, UI, validaciones, estados, pruebas de cada botón y persistencia tras reload. | lint + types + unit + integration + e2e de módulos completos. Sin listas en memoria sustituyendo backend. | Revertir módulo/feature sin tocar base de otros proyectos. |
| F4 — Núcleo y concurrencia | F3 | Implementar Transferencias, Retenciones, Ajustes y reversos, Libro mayor y conciliación, Configuración de negocio con las invariantes de06; locks, idempotencia, reversos y auditoría. Completar todos los command operationIds. | domain + concurrency + API contracts; cada CRIT-n pasa con valores esperados. | Desactivar nueva operación si es incompatible; conservar historial confirmado. |
| F5 — Integraciones y trabajos | F4 | Implementar outbox/inbox/jobs, archivos/exports y adaptadores. Contrato local primero y sandbox real después. | jobs + integrations; AI/N8N cuando aplican; fallos429/503/timeout/reinicio reproducidos. | Pausar dispatch, conservar cola y usar versión compatible; no repetir efectos inciertos. |
| F6 — Frontend completo | F4; F5 para tareas | Completar todas las rutas y controles05, detalle, filtros, paginación, móvil, teclado, acceso, tarea larga, conflictos y estados. Integrar frontend exclusivamente por contrato. | controls + e2e + accessibility; cada control tiene evidencia del run actual. | Revertir UI sin alterar reglas persistidas. |
| F7 — Operación y seguridad | F5,F6 | Imagen por capa, secrets, CI, health, métricas, alertas, quotas, backups, restore y migración compatible. Revisar threat model y permisos de proveedores. | security + performance + recovery; observabilidad sin PII y restauración comprobada. | Volver a imagen anterior compatible; restauración probada en entorno aislado. |
| F8 — Revisión y entrega | F7 | Ejecutar prompts02,03,04; resolver hallazgos y repetir solo suites afectadas más flujo crítico. Preparar README operativo y demo grabada/capturas, reporte honesto local/sandbox. | verify; evidence/acceptance.md con todos los criterios10 y resultados. No declarar producción por solo build. | Si gate falla, volver a fase afectada; no reducir alcance para obtener verde. |


## Dependencias y trabajo simultáneo

F0→F1→F2→F3→F4→F5; F6 puede avanzar después de F4 con contratos estables y finalizar tras F5. F7 depende de F5/F6; F8 depende de F7. No compartir archivos entre tareas concurrentes sin propietario definido. Si el usuario autoriza varios agentes, asignar ownership por módulo/capa, advertir que no están solos y prohibir revertir cambios ajenos. No se requiere delegación para implementar este plan.

## Praxis en cada fase

1. Enunciar invariante/resultado observable y permisos antes de escribir código.
2. Escribir prueba de regla o fallo significativo; implementar la mínima solución modular que satisface todo el contrato.
3. Revisar límites de módulos, errores y efectos externos. UI usa DTO; servicios aplican reglas; infraestructura solo persiste/transporta.
4. Ejecutar checks relevantes, revisar diff y registrar evidencia. No repetir suites extensas sin cambios/fallos nuevos.
5. Actualizar PROGRESO con comando siguiente y blockers específicos. Si una librería cambia API, verificar documentación oficial y registrar versión; no improvisar comando ECC.

## Reanudación

Un agente nuevo lee estado real, compara PROGRESO con archivos/tests y revalida última fase. Un marcador anterior no prueba implementación. Si falta credencial, avanzar con contrato local y dejar integration BLOCKED_EXTERNAL; mantener pendiente verificación real. No borrar alcance ni asumir permiso por tiempo transcurrido.
