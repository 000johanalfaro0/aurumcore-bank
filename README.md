# Proyecto 09 — aurumcore-bank

Libro mayor bancario y saldos disponibles

**Estado: especificación entregada; aplicación NO IMPLEMENTADA.** Este repositorio documental define una aplicación full stack multiempresa. Cada capa tendrá código, dependencias y pruebas propios. 

## Empezar con un agente

> Implementa el proyecto 09 (aurumcore-bank). Lee AGENTS.md y SPEC.md, sigue docs/08-PLAN.md de F0 a F8 y actualiza docs/PROGRESO.md con evidencia real. Conserva arquitectura modular, autenticación y aislamiento por tenant. Usa prompts/01-construir-proyecto.md. No reduzcas el alcance a una maqueta ni declares completado lo no verificado.

## Leer en este orden

1. [Instrucciones del agente](AGENTS.md) y [contrato del producto](SPEC.md).
2. [01-ARQUITECTURA.md](docs/01-ARQUITECTURA.md).
3. [02-SEGURIDAD-TENANCY.md](docs/02-SEGURIDAD-TENANCY.md).
4. [03-DATOS.md](docs/03-DATOS.md).
5. [04-API.md](docs/04-API.md).
6. [05-FRONTEND.md](docs/05-FRONTEND.md).
7. [06-PROCESOS.md](docs/06-PROCESOS.md).
8. [07-PRUEBAS.md](docs/07-PRUEBAS.md).
9. [08-PLAN.md](docs/08-PLAN.md).
10. [09-OPERACION.md](docs/09-OPERACION.md).
11. [10-ACEPTACION.md](docs/10-ACEPTACION.md).

## Prompts para construir y verificar

- [01 — Construir por fases](prompts/01-construir-proyecto.md).
- [02 — Auditoría de arquitectura y seguridad](prompts/02-auditoria-ecc-seguridad.md).
- [03 — E2E, pantallas y controles](prompts/03-pruebas-e2e-quality-gate.md).
- [04 — Gate de entrega y operación](prompts/04-verificar-entrega.md).
- [05 — Reanudar una sesión](prompts/05-reanudar-proyecto.md).

[Comandos y prerequisitos](docs/09-OPERACION.md) distingue el runner que debe construirse de las verificaciones ya realizadas sobre documentación. [expected-controls.json](docs/expected-controls.json) es inventario de pruebas previstas, no un reporte de éxitos. [SPEC-MANIFEST.json](SPEC-MANIFEST.json) identifica alcance, capas y documentos.

## Problema y demostración

Registrar transferencias, retenciones y reversos preservando integridad contable y evitando gastar fondos comprometidos.

Demostración: Ejecutar transferencias concurrentes y reintentos tras caídas sin crear dinero, duplicar movimientos ni gastar saldo retenido.

## Repositorio y autonomía

Esta carpeta está pensada como un repositorio GitHub independiente. No depende de archivos del directorio padre. El código futuro estará en frontend/ y backend/. No se ha creado ningún repositorio remoto, realizado push ni activado servicios externos.
