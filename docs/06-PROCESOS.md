# Procesos, estados e integraciones — aurumcore-bank

## Reglas de negocio

- **INV-1:** Bloquear account_balances de todas las cuentas afectadas por UUID ascendente; validar saldo disponible, insertar journal/postings y actualizar proyecciones en una transacción.
- **INV-2:** Para cuenta con normal_side=CREDIT, saldo aumenta con créditos y disminuye con débitos; normal_side=DEBIT invierte cálculo. Transferencia debita pasivo origen y acredita pasivo destino.
- **INV-3:** Validación diferida de equilibrio al POSTED; rol runtime no UPDATE/DELETE de postings o entradas publicadas. Reconciliación detecta diferencias sin repararlas silenciosamente.
- **INV-4:** Retención y transferencia comparten bloqueo de saldo; expiración usa mismo lock y transición condicional. Seed de fondos se hace con asiento contra tesorería explícita, no UPDATE saldo.
- **INV-5:** Configuración de negocio solo crea maestros/versiones; nunca modifica retroactivamente dinero, decisiones o documentos cerrados. Los vínculos de usuario verifican membership y rol del mismo tenant. Cada catálogo tiene GET colección/detalle con permiso ADMIN y proyecciones mínimas para selectores autorizados.
- **INV-6:** POST /ledger-counterpart-accounts crea ledger_accounts de sistema sin customer_id, purpose explícito y política de signo fija por tipo. ADMIN no puede convertir una cuenta de cliente en cuenta con sobregiro ni cambiar su normal_side.
- **INV-7:** CAPTURED no está en alcance de holds: las retenciones solo bloquean/liberan saldo. No existe ruta para consumir retención ni el enum CAPTURED en migración.

## Máquinas de estado

| Proceso | Transiciones autorizadas | Unidad transaccional | Fallo y recuperación |
| --- | --- | --- | --- |
| Transferencia | REQUESTED → POSTED; validación fallida → REJECTED; POSTED → REVERSED mediante nuevo asiento | Transferencia+asiento+apuntes+saldos+outbox atómicos | Caída antes commit no deja datos; después commit reintento devuelve resultado original |
| Retención | ACTIVE → RELEASED/EXPIRED | Lock cuenta y hold; decremento de held una sola vez | Liberación y expiración concurrentes tienen un ganador |


Cada transición verifica estado y expected_version en servidor, rol/alcance, precondiciones de cantidades/fechas y restricciones SQL. Estados terminales no se reabren mediante update genérico; correcciones generan versión o reverso explícito. Acciones listadas en UI/API deben representar transiciones presentes aquí o creación de una entidad secundaria descrita en datos.

## Secuencia operativa principal

1. Usuario verificado crea tenant ALFA, configura moneda/timezone y maestros del negocio; OWNER invita roles separados, incluyendo revisor cuando aplique.
2. Operador crea datos de entrada desde pantallas: Clientes → Cuentas y saldos → Transferencias. Confirmar persistencia tras reload.
3. Ejecutar caso de uso central: Ejecutar transferencias concurrentes y reintentos tras caídas sin crear dinero, duplicar movimientos ni gastar saldo retenido.
4. Revisar resultado en Libro mayor y conciliación y Configuración de negocio; auditoría vincula actor, tenant y resource_id.
5. Provocar conflicto/fallo del escenario CRIT-01 y repetir únicamente mediante estrategia idempotente. No ocultar UNKNOWN, NEEDS_REVIEW o FAILED detrás de un estado genérico de éxito.
6. Cambiar a BETA y comprobar aislamiento de listado, detalle, documentos y jobs; volver a ALFA y verificar resultado conservado.

## Integraciones exigidas

- Ninguna red bancaria real; API interna y exportación contable. Datos monetarios de demo marcados sintéticos.

Cada adaptador tiene interface de aplicación, implementación de test/contrato y de sandbox, timeout explícito(connect3s/read15s por defecto), límite por conexión, reintentos con jitter(1,5,30,120,600s, máximo5) y respeto de Retry-After. 4xx de validación no se reintenta. Resultado externo incierto pasa a NEEDS_RECONCILIATION; proveedor sin idempotencia/consulta no puede prometer deduplicación perfecta: detener y exponer revisión manual con evidencia.

## Outbox, jobs y reloj

Worker reclama lotes de50 mediante FOR UPDATE SKIP LOCKED y lease60s renovable; operaciones largas informan heartbeat15s. Tras reinicio, leases vencidos vuelven a ser elegibles; consumidor deduplica por event_id y efecto. Outbox DELIVERED significa ack del consumidor, no éxito final de pago/campaña. Cada paso tiene estado separado. Clock inyectable en tests; scheduler usa reloj servidor/timezone declarado, no setInterval del navegador.

## IA

No forma parte de este producto. No agregar chat, embeddings o agente como sustituto de reglas de negocio.

## Automatización

n8n no aplica. Mantener jobs del backend con el mismo esquema de eventos y permisos. No crear workflows vacíos para aparentar integración.
