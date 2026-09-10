# Arquitectura modular — aurumcore-bank

Estado: contrato de implementación, no código existente. Cada proyecto es un repositorio independiente con un único producto y varios componentes desplegables.

## Stack y decisión de versiones

| Capa | Decisión |
| --- | --- |
| front | React + TypeScript + Vite + React Router |
| back | Java 21 LTS + Spring Boot + Spring Security + JPA + Flyway |
| db | PostgreSQL; RLS y restricciones SQL; migraciones propiedad de backend |
| ai | No requerido: no agregar servicio IA ornamental |
| automation | Workers propios del backend con outbox e inbox; n8n no requerido |

En F0 fijar versiones exactas soportadas y compatibles en lockfiles/imágenes por digest; registrar fecha, documentación y decisión en docs/DECISIONES-IMPLEMENTACION.md. No actualizar una major por iniciativa incidental. Conservar familia tecnológica, no una versión vulnerable por fidelidad histórica.

## Repositorio objetivo

~~~text
aurumcore-bank/
  README.md / AGENTS.md / SPEC.md
  frontend/              package.json, lockfile, Dockerfile, src/, tests/
  backend/               manifiesto propio, Dockerfile, src/, migrations/, tests/
  # ai/ no se crea: no aplica al alcance
  # automation/n8n/ no se crea: no aplica al alcance
  contracts/             openapi.yaml, events/*.schema.json, generated-client/
  infra/                 compose.yaml, gateway/, identity/, monitoring/
  scripts/               project.mjs, seed/, verify-controls.mjs
  tests/                 e2e/, contracts/, concurrency/, security/, fixtures/
  docs/                  especificaciones y decisiones
  evidence/              resultados locales ignorados por Git
  .github/workflows/     ci.yml, release.yml
~~~

Frontend y backend tienen instalaciones, pruebas e imágenes independientes. No un package.json que oculte el backend dentro de Next. La raíz solo coordina tareas; contratos compartidos contienen DTO/esquemas, nunca entidades ORM ni servicios de dominio. Un clon de esta carpeta debe bastar sin importar archivos del directorio padre.

## Módulos por responsabilidad

| Módulo funcional | Ruta de entrada | Responsabilidad |
| --- | --- | --- |
| customers | /clientes | Ficha de titular y cuentas asociadas. |
| ledger-accounts | /cuentas | Saldo contable, retenido y disponible por moneda; movimientos paginados. |
| transfers | /transferencias | Formulario origen/destino, confirmación e identificador de operación. |
| holds | /retenciones | Fondos retenidos, vencimiento y liberación. |
| adjustment-requests | /aprobaciones | Doble control con asiento propuesto, motivo y responsables. |
| journal-entries | /libro-mayor | Asiento, apuntes y cadena de reversos; vista de diferencias. |
| business-settings | /configuracion/negocio | Catálogos operativos del tenant: Cuenta de contrapartida. Listado, alta y detalle por catálogo; preservar referencias históricas. |


Backend: cada módulo usa public-api → application/use-cases → domain (entidades, invariantes, políticas) y infrastructure (repositorios, PSP/CRM, transporte). Domain no importa HTTP, ORM, n8n ni SDK de IA. Application recibe puertos; infrastructure los implementa. El controller valida forma/autorización y traduce resultado; no calcula dinero ni cambia tablas directamente.

Un módulo posee sus tablas. Otro módulo lo usa mediante su API interna tipada; no importa su repositorio privado. Las transacciones que abarcan módulos se coordinan mediante un caso de uso explícito y una unidad de trabajo compartida del backend. Evitar redes internas/microservicios para cada tabla. El backend comienza como monolito modular, separado del frontend y de los componentes externos.

Frontend: app/router y shell → features/{dominio}/{pages,components,hooks,api} → shared/ui. Estado remoto en cliente de consultas; estado efímero de formularios local. Prohibido un store global con todos los dominios o llamadas fetch dispersas en componentes visuales. API cliente generada desde contrato y adapters de presentación.

No agregar una capa AI vacía. El cómputo de negocio se prueba como funciones/casos de uso del backend.

Los trabajos del backend se empaquetan desde el mismo dominio, con un entrypoint worker separado; la persistencia de tareas usa PostgreSQL. No introducir n8n únicamente para cumplir un árbol de carpetas.

## Dependencias permitidas y comprobación

1. frontend → contracts y API pública; nunca backend/src, ORM, claves de proveedor o automatizaciones.
2. backend/domain → librería estándar y tipos de dominio; application → domain/ports; infrastructure → ports + SDK. Prohibir ciclos entre módulos.
3. contracts → ningún código ejecutable del producto. Cambios incompatibles requieren nueva versión o migración compatible.
4. AI/n8n → APIs internas acotadas; no consultas directas ni permisos globales sobre tenants.
5. scripts → herramientas de construcción; nunca contienen reglas del producto.

Gate architecture debe usar ArchUnit para límites backend y dependency-cruiser/ESLint para frontend; fallar por ciclos, dependencias invertidas y acceso a DB desde frontend/automation. No basta declarar carpetas.

## Autenticación y tráfico

Gateway único por entorno: / → frontend; /api y /auth → backend. Backend actúa como BFF de identidad con OIDC Authorization Code + PKCE y sesión opaca HttpOnly; el navegador no almacena refresh/access tokens en localStorage. Keycloak local proporciona registro, verificación, recuperación y MFA; realm exportado sin secretos. El dominio multiempresa pertenece a la aplicación, no se crea un realm por cliente.

TLS fuera de localhost; API privada para worker/AI/n8n con audiencia, scopes, tenant y tarea acotados. Los adaptadores llaman PSP/CRM solo desde backend. Llamadas externas nunca dentro de una transacción de inventario/dinero/aprobación.

## Praxis obligatoria

- Invariantes como funciones y restricciones comprobables, no comentarios aspiracionales. DTO de entrada separado de entidad persistida.
- Errores tipados y traducción centralizada; no capturar todo para devolver éxito vacío.
- Idempotencia + outbox en la transacción local; ningún mensaje de cola equivale a commit externo.
- Configuración tipada al arranque, secretos por entorno, reloj inyectable y UUID generados en servidor.
- Pruebas primero para una regla monetaria/concurrente nueva; no pruebas que solo reproduzcan getters.
- ADR breve por decisión con alternativas, consecuencias y método de verificación; no añadir infraestructura sin una necesidad del SPEC.
- Revisar diff local por fase; commits pequeños solo cuando estén autorizados, nunca secretos ni evidencia privada en Git.

## Límites del producto

Core contable acotado a transferencias internas de la misma moneda. No banca licenciada, depósitos reales, FX ni conexión a redes de pago.

## Decisiones preservadas o aclaradas

- Se conserva el concepto acordado; se completan frontend, backend, identidad multiempresa y contratos operativos.
