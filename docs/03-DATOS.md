# Modelo de datos — aurumcore-bank

## Convenciones obligatorias

Todas las entidades de dominio siguientes incluyen id UUID, tenant_id UUID NOT NULL, created_at/updated_at timestamptz, version bigint inicial1; excepto tablas explícitamente append-only, cuyo updated_at no cambia. Campos con ? son nullable; los restantes NOT NULL. Claves compuestas y RLS según [seguridad](02-SEGURIDAD-TENANCY.md). No emplear JSON como sustituto de las relaciones descritas.

Dinero numeric(19,4) con moneda ISO; enviar decimales como strings JSON. Redondeo HALF_UP a minor unit de moneda al cerrar documento, con regla versionada y conservación de bases. Cantidades numeric(19,4), nunca IEEE float para dinero/inventario. Porcentajes son fracciones 0..1 salvo campo score expresamente0..100. Fechas de negocio con timezone de tenant/sede y timestamps UTC; intervalos [inicio,fin). PK/FK indexadas empezando por tenant. Búsqueda y listados terminan por id para orden estable.

## Dominio

| Tabla | Campos específicos | Restricciones y relaciones | Índices adicionales |
| --- | --- | --- | --- |
| customers | external_ref:text; name:text; status:enum | Referencia única por tenant | (tenant_id,external_ref) |
| ledger_accounts | code:text; customer_id:uuid?; currency:char(3); normal_side:enum(DEBIT,CREDIT); status:enum; allow_negative:bool | Código único; allow_negative=false para cuentas de cliente; cuentas de contrapartida explícitas | (tenant_id,customer_id,status) |
| journal_entries | reference:text; kind:enum; status:enum(DRAFT,POSTED); effective_at:timestamptz; reverses_entry_id:uuid? | Referencia única; reverso total único por asiento inicial; POSTED inmutable | (tenant_id,effective_at,id) |
| postings | journal_entry_id:uuid; account_id:uuid; side:enum(DEBIT,CREDIT); amount:numeric(19,4); currency:char(3) | amount>0; moneda coincide cuenta/asiento; débito=crédito por asiento/moneda verificado al publicar | (tenant_id,account_id,created_at,id) |
| account_balances | account_id:uuid; posted_balance:numeric(19,4); held_amount:numeric(19,4) | Una proyección por cuenta; held>=0; cliente posted-held>=0; verificable contra postings | (tenant_id,account_id) |
| holds | account_id:uuid; amount:numeric(19,4); expires_at:timestamptz; status:enum; reference:text | Referencia única; amount>0; expiración libera una sola vez | (tenant_id,status,expires_at) |
| transfers | source_account_id:uuid; destination_account_id:uuid; amount:numeric(19,4); currency:char(3); journal_entry_id:uuid; status:enum | Cuentas distintas y misma moneda; asiento único por transferencia | (tenant_id,source_account_id,created_at) |
| adjustment_requests | account_id:uuid; counterpart_account_id:uuid; amount:numeric(19,4); reason:text; requested_by:uuid; approved_by:uuid?; status:enum | Actor distinto; ajuste siempre contra cuenta explícita | (tenant_id,status,created_at) |
| reconciliation_runs | as_of:timestamptz; status:enum; difference_count:int | Comparación bajo snapshot consistente | (tenant_id,created_at) |
| reversal_requests | transfer_id:uuid; requested_by:uuid; approved_by:uuid?; reason:text; status:enum(PENDING,APPROVED,REJECTED); reversal_entry_id:uuid? | Una solicitud pendiente por transferencia; actores distintos; vínculo a nuevo asiento | (tenant_id,transfer_id,status) |


Cada *_id referido a entidad del dominio se migra como FK compuesta; no dejar UUID sueltos sin FK. Para referencias polimórficas como source_id/subject_id/aggregate_id, validar tipo/id en servicio y conservar snapshot; no fingir FK SQL que PostgreSQL no puede imponer. Las listas de ids JSON/array de evidencia se normalizan a tablas puente al necesitar integridad o consultas cruzadas. Campos de estado usan CHECK con los estados de 06-PROCESOS.md y comandos de 04-API.md; registrar enums exhaustivos en OpenAPI/migración de F2 antes de implementar acciones. No aceptar estados libres del cliente.

## Plataforma compartida dentro de este repositorio

| Tabla | Campos | Integridad |
| --- | --- | --- |
| users | id:uuid; issuer:text; subject:text; email:text; verified:bool | Global de identidad; UNIQUE issuer/subject, no tenant_id |
| tenants | id:uuid; slug:text; name:text; timezone:text; currency:char(3); status:enum(ACTIVE,SUSPENDED,PENDING_DELETE) | Slug único; lectura por membership |
| memberships | tenant_id:uuid; id:uuid; user_id:uuid; status:enum(INVITED,ACTIVE,SUSPENDED) | UNIQUE tenant/user; roles en membership_roles; FK tenant/user |
| membership_roles | tenant_id:uuid; membership_id:uuid; role_code:text | UNIQUE tenant/member/role; códigos allowlist |
| scope_assignments | tenant_id:uuid; membership_id:uuid; scope_type:text; scope_id:uuid | Asignación explícita a equipo/sede/cliente; validar tipo y existencia tenant |
| invitations | tenant_id:uuid; id:uuid; email:text; token_hash:text; expires_at:timestamptz; status:enum(PENDING,ACCEPTED,REVOKED,EXPIRED) | Token hash único; una aceptación; índice tenant/email/status |
| sessions | id:uuid; user_id:uuid; secret_hash:text; expires_at:timestamptz; last_seen_at:timestamptz; revoked_at:timestamptz? | Global privada de identidad; nunca expone token IdP |
| files | tenant_id:uuid; id:uuid; owner_id:uuid; scope_type:text; scope_id:uuid; object_key:text; sha256:text; size:bigint; mime:text; status:enum(UPLOADING,QUARANTINED,CLEAN,REJECTED,DELETED) | Objeto privado; índice tenant/scope_type/scope_id |
| audit_events | tenant_id:uuid; id:uuid; actor_id:uuid?; service_id:text?; action:text; resource_type:text; resource_id:uuid?; outcome:text; reason:text?; trace_id:text; changes_redacted:jsonb; occurred_at:timestamptz | Append-only; runtime solo INSERT/SELECT autorizado; índice tenant/occurred_at/id |
| idempotency_records | tenant_id:uuid; actor_key:text; operation:text; key:text; request_hash:text; status:enum(IN_PROGRESS,COMPLETED,FAILED); response:jsonb?; resource_id:uuid?; expires_at:timestamptz | UNIQUE tenant/actor/operation/key; cuerpo distinto misma clave409; response sin secretos |
| outbox_events | tenant_id:uuid; id:uuid; aggregate_type:text; aggregate_id:uuid; aggregate_version:int; event_type:text; schema_version:int; payload:jsonb; status:enum(PENDING,CLAIMED,DELIVERED,DEAD); attempts:int; next_attempt_at:timestamptz; lease_until:timestamptz? | Evento inserto con commit de negocio; índice parcial status/next_attempt_at; worker autorizado por tenant |
| inbox_events | tenant_id:uuid; id:uuid; connection_id:uuid?; source:text; external_id:text; payload_hash:text; status:enum(RECEIVED,PROCESSING,DONE,FAILED); received_at:timestamptz | UNIQUE tenant/source/connection/external_id; NULL normalizado para deduplicación |
| jobs | tenant_id:uuid; id:uuid; actor_id:uuid?; kind:text; input:jsonb; status:enum(QUEUED,RUNNING,WAITING,SUCCEEDED,FAILED,CANCELLED); progress:int; attempts:int; lease_until:timestamptz?; result_file_id:uuid? | Claim con lease; índice tenant/status/created_at; sin efectos dobles tras expiración |
| connections | tenant_id:uuid; id:uuid; provider:text; external_account_id:text; encrypted_credentials:text; scopes:jsonb; status:enum(ACTIVE,DISCONNECTED,REAUTH_REQUIRED) | UNIQUE proveedor/external_account según reglas de conexión; nunca devolver credenciales a UI |
| settings | tenant_id:uuid; key:text; value:jsonb; version:int | UNIQUE tenant/key; esquema allowlist por clave; no secretos ni reglas financieras arbitrarias |





## Transacciones y consistencia

1. Bloquear account_balances de todas las cuentas afectadas por UUID ascendente; validar saldo disponible, insertar journal/postings y actualizar proyecciones en una transacción.
2. Para cuenta con normal_side=CREDIT, saldo aumenta con créditos y disminuye con débitos; normal_side=DEBIT invierte cálculo. Transferencia debita pasivo origen y acredita pasivo destino.
3. Validación diferida de equilibrio al POSTED; rol runtime no UPDATE/DELETE de postings o entradas publicadas. Reconciliación detecta diferencias sin repararlas silenciosamente.
4. Retención y transferencia comparten bloqueo de saldo; expiración usa mismo lock y transición condicional. Seed de fondos se hace con asiento contra tesorería explícita, no UPDATE saldo.
5. Configuración de negocio solo crea maestros/versiones; nunca modifica retroactivamente dinero, decisiones o documentos cerrados. Los vínculos de usuario verifican membership y rol del mismo tenant. Cada catálogo tiene GET colección/detalle con permiso ADMIN y proyecciones mínimas para selectores autorizados.
6. POST /ledger-counterpart-accounts crea ledger_accounts de sistema sin customer_id, purpose explícito y política de signo fija por tipo. ADMIN no puede convertir una cuenta de cliente en cuenta con sobregiro ni cambiar su normal_side.
7. CAPTURED no está en alcance de holds: las retenciones solo bloquean/liberan saldo. No existe ruta para consumir retención ni el enum CAPTURED en migración.

No SELECT-check-UPDATE sin mecanismo concurrente. READ COMMITTED + locks/updates condicionales para recursos identificables; constraints para unicidad/exclusión. Si la regla agrega filas no bloqueables individualmente, bloquear agregado padre o usar SERIALIZABLE con máximo3 reintentos jitter por serialization failure/deadlock. Orden canónico de locks por tipo/id. Un 409 de negocio no se reintenta automáticamente.

Atomicidad distribuida: persistir intención y outbox; llamar proveedor después del commit; deduplicar respuestas/inbox y conciliar incertidumbre. Nunca mantener conexión SQL bloqueada mientras espera un LLM, CRM o PSP. No prometer exactly-once universal; diseñar entrega at-least-once y efectos idempotentes consultables.

## Migraciones, seed y evolución

- Crear esquema desde vacío con migrador; grants separados para runtime/worker/AI/n8n. Sembrar roles y permisos explícitos.
- Seed repetible crea tenants ALFA y BETA, usuarios por rol y membresías cruzadas, fixtures del dominio de 07-PRUEBAS.md. Identidades en IdP mediante utilitario local; passwords generados y entregados por canal local ignorado, no constantes en Git.
- Nunca sembrar saldos/estados finales que omitan las reglas de producción: usar casos de uso o importadores controlados que registran movimientos.
- Cambio de esquema por expand → migrar datos en lotes reanudables → deploy compatible → contract posterior. Probar una base de versión anterior. Migración destructiva requiere evidencia de respaldo y decisión explícita.
- EXPLAIN (ANALYZE, BUFFERS) en entorno test para listados principales con100000 filas/tenant; guardar plan sin PII. No agregar índices sin consulta que los justifique.
