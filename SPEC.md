# SPEC — 09 aurumcore-bank

Versión documental1.0 — 2026-09-09. Estado: SPECIFIED, no implementación verificada.

## Propósito y alcance

**Producto:** Libro mayor bancario y saldos disponibles. **Grupo tecnológico:** 3. **Problema:** Registrar transferencias, retenciones y reversos preservando integridad contable y evitando gastar fondos comprometidos.

**Tenant:** Entidad financiera; cuentas de clientes pertenecen a esa entidad. **Roles de negocio:** TELLER, TREASURY_APPROVER, ACCOUNT_AUDITOR; además OWNER/ADMIN/AUDITOR con permisos limitados definidos en seguridad.

**Límites:** Core contable acotado a transferencias internas de la misma moneda. No banca licenciada, depósitos reales, FX ni conexión a redes de pago.

**Killer feature observable:** Ejecutar transferencias concurrentes y reintentos tras caídas sin crear dinero, duplicar movimientos ni gastar saldo retenido.

## Arquitectura confirmada

| Capa | Stack |
| --- | --- |
| front | React + TypeScript + Vite + React Router |
| back | Java 21 LTS + Spring Boot + Spring Security + JPA + Flyway |
| db | PostgreSQL; RLS y restricciones SQL; migraciones propiedad de backend |
| ai | No requerido: no agregar servicio IA ornamental |
| automation | Workers propios del backend con outbox e inbox; n8n no requerido |

Frontend y backend separados dentro de este repositorio, monolito backend modular como punto de partida. La modularidad debe verificarse con límites de imports y tests, no solo con carpetas.

## Módulos incluidos

| Módulo | Ruta relativa al tenant | Resultado |
| --- | --- | --- |
| Clientes | /clientes | Ficha de titular y cuentas asociadas. |
| Cuentas y saldos | /cuentas | Saldo contable, retenido y disponible por moneda; movimientos paginados. |
| Transferencias | /transferencias | Formulario origen/destino, confirmación e identificador de operación. |
| Retenciones | /retenciones | Fondos retenidos, vencimiento y liberación. |
| Ajustes y reversos | /aprobaciones | Doble control con asiento propuesto, motivo y responsables. |
| Libro mayor y conciliación | /libro-mayor | Asiento, apuntes y cadena de reversos; vista de diferencias. |
| Configuración de negocio | /configuracion/negocio | Catálogos operativos del tenant: Cuenta de contrapartida. Listado, alta y detalle por catálogo; preservar referencias históricas. |

Además: login/registro/recuperación, organizaciones, invitaciones, equipo, perfil/MFA/sesiones, integraciones, tareas y auditoría. Todas las rutas protegidas identifican empresa activa y verifican permisos en servidor.

## Contratos detallados obligatorios

- [01-ARQUITECTURA.md](docs/01-ARQUITECTURA.md)
- [02-SEGURIDAD-TENANCY.md](docs/02-SEGURIDAD-TENANCY.md)
- [03-DATOS.md](docs/03-DATOS.md)
- [04-API.md](docs/04-API.md)
- [05-FRONTEND.md](docs/05-FRONTEND.md)
- [06-PROCESOS.md](docs/06-PROCESOS.md)
- [07-PRUEBAS.md](docs/07-PRUEBAS.md)
- [08-PLAN.md](docs/08-PLAN.md)
- [09-OPERACION.md](docs/09-OPERACION.md)
- [10-ACEPTACION.md](docs/10-ACEPTACION.md)

Los documentos03/04/05/06 forman un único contrato: tabla/campo ↔ endpoint ↔ control ↔ transición. No implementar uno ignorando los demás. Los comandos del documento09 son interfaces a construir en F0; no se han ejecutado pruebas de aplicación al redactar este SPEC.

## Invariantes iniciales

- INV-1: Bloquear account_balances de todas las cuentas afectadas por UUID ascendente; validar saldo disponible, insertar journal/postings y actualizar proyecciones en una transacción.
- INV-2: Para cuenta con normal_side=CREDIT, saldo aumenta con créditos y disminuye con débitos; normal_side=DEBIT invierte cálculo. Transferencia debita pasivo origen y acredita pasivo destino.
- INV-3: Validación diferida de equilibrio al POSTED; rol runtime no UPDATE/DELETE de postings o entradas publicadas. Reconciliación detecta diferencias sin repararlas silenciosamente.
- INV-4: Retención y transferencia comparten bloqueo de saldo; expiración usa mismo lock y transición condicional. Seed de fondos se hace con asiento contra tesorería explícita, no UPDATE saldo.
- INV-5: Configuración de negocio solo crea maestros/versiones; nunca modifica retroactivamente dinero, decisiones o documentos cerrados. Los vínculos de usuario verifican membership y rol del mismo tenant. Cada catálogo tiene GET colección/detalle con permiso ADMIN y proyecciones mínimas para selectores autorizados.
- INV-6: POST /ledger-counterpart-accounts crea ledger_accounts de sistema sin customer_id, purpose explícito y política de signo fija por tipo. ADMIN no puede convertir una cuenta de cliente en cuenta con sobregiro ni cambiar su normal_side.
- INV-7: CAPTURED no está en alcance de holds: las retenciones solo bloquean/liberan saldo. No existe ruta para consumir retención ni el enum CAPTURED en migración.

## Escenarios que deben pasar

- CRIT-01: Conservación. Dado Cuenta A 100; B 0; 50 peticiones de 3; cuando Transferir concurrentemente con claves distintas; entonces 33 éxitos; A=1, B=99, total=100; ninguna negativa.
- CRIT-02: Reintento tras commit. Dado Transferencia publicada, respuesta perdida; cuando Repetir misma clave 10 veces; entonces Un asiento, una transferencia.
- CRIT-03: Fondos retenidos. Dado A=100 y hold=80; cuando Transferir 30; entonces 409; posted=100,held=80.
- CRIT-04: Reverso. Dado A envía 40 a B con fondos suficientes para devolver; cuando Aprobar reverso con actor distinto; entonces Original intacto y nuevo asiento opuesto equilibrado.

## Entrega

Aplicación navegable desde clon limpio, todas las rutas/controles implementados, DB real, multiempresa segura, procesos recuperables y documentación de operación. Cumplir docs/10-ACEPTACION.md con evidencia actual. Una captura o un build aislado no acreditan entrega. No afirmar cumplimiento fiscal/clínico/financiero ni operación productiva real por completar un portfolio.
