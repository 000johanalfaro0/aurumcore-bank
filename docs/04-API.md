# Contratos HTTP y eventos — aurumcore-bank

## Transporte y formatos

Base de dominio: /api/v1/tenants/{tenant_id}. Las rutas de las tablas que empiezan /auth o /api son absolutas. El resto se concatena a esa base. Gateway mantiene mismo origen de navegador. Content-Type application/json salvo cargas firmadas; OpenAPI 3.1 en contracts/openapi.yaml generado y validado antes de UI. No sustituir contratos específicos por CRUD genérico expuesto libremente.

UUID canónico para ids; strings trim de1–200 salvo longitud específica; motivo10–2000, texto largo máximo10000; email validado; timestamps ISO8601 con offset; arrays máximo100 líneas y mínimo1 para creación de documento. Body tenant_id y actor_id prohibidos: se derivan de contexto. Campos ? opcionales; campos no declarados422. Tipos heredados del esquema de datos; expresiones enum/lista en la tabla son contratos, no texto literal a enviar.

Mutaciones de negocio: Idempotency-Key UUID requerido y X-CSRF-Token en sesión cookie. Guardar clave+request_hash+actor+operación+tenant; misma clave/cuerpo devuelve resultado original, cuerpo diferente409 IDEMPOTENCY_KEY_REUSED. Registro HTTP se conserva mínimo7d; unicidad de operación financiera/documento persiste todo su ciclo para no duplicar tras expirar caché.

Operaciones sobre recurso existente llevan expected_version entero positivo; comparar con version actual y devolver409 VERSION_CONFLICT antes de escribir. El formulario conserva cambios y ofrece recargar diferencias; no repetir ciegamente. Para nuevos documentos, backend calcula totales y snapshots: valores financieros calculados no se aceptan como autoridad del cliente.

## Respuestas

- 201 creación: {data:{id,version,status,...campos públicos del recurso},meta:{trace_id}} y Location a recurso. Sin secretos ni campos privados de otra función.
- 200 comando: {data:{id,version,status,...resultado de negocio},meta:{trace_id}}. Lectura de detalle usa misma envoltura con relaciones autorizadas y paginadas cuando grandes.
- 202 tarea: {data:{job_id,status:"QUEUED",status_url},meta:{trace_id}}; la UI sigue status_url/SSE. No mostrar éxito de negocio por recibir202.
- 204 logout sin body. Error application/problem+json: {type,title,status,code,detail,trace_id,field_errors?}; datos sensibles omitidos. 409 incluye current_version cuando recurso propio visible.
- GET list: {data:[],page:{next_cursor,has_more},meta:{trace_id}}; page_size por defecto25 máximo100, cursor opaco firmado ligado a tenant/filtro/orden; orden allowlist y desempate id. q máximo100, from/to acotados, filtro por estado/id declarado. count nunca global entre tenants.

## Plataforma y controles compartidos

| ID | Operación | Quién | Entrada / resultado |
| --- | --- | --- | --- |
| AUTH01 | Navegación GET /auth/login | PUBLIC | Redirige al IdP con state/PKCE; callback seguro; vuelve a organizaciones |
| AUTH02 | Navegación GET /auth/register | PUBLIC | Registro en IdP; verificación por correo; no crear tenant hasta identidad verificada |
| AUTH03 | Navegación GET /auth/recover | PUBLIC | Respuesta genérica y recuperación en IdP |
| AUTH04 | POST /api/v1/invitations/accept | VERIFIED_USER | Body token; consume hash una vez y crea membership; 409 si consumida, 410 si vencida |
| ORG02 | POST /api/v1/organizations | VERIFIED_USER | Body name,slug,timezone,currency; 201 tenant + OWNER atómicos; 409 slug ocupado |
| ORG03 | PATCH /settings/organization | OWNER,ADMIN | Body name,timezone,currency,expected_version; 200 nueva versión; no cambiar moneda de documentos históricos |
| MEM01 | POST /invitations | OWNER,ADMIN | Body email,roles[],scope_assignments[]; 201 invitación; never elevar OWNER por invitación |
| MEM02 | POST /invitations/{id}/revoke | OWNER,ADMIN | Body expected_version; 200 REVOKED; 409 ya aceptada |
| MEM03 | PUT /memberships/{id}/roles | OWNER,ADMIN | Body roles[],scope_assignments[],expected_version; 200; no permitir elevar privilegios fuera de facultad del actor |
| MEM04 | POST /memberships/{id}/suspend | OWNER,ADMIN | Body reason,expected_version; 200 y acceso revocado; 409 último OWNER |
| MEM05 | POST /ownership-transfer | OWNER | Body target_membership_id,expected_version; MFA reciente; 200; destino activo y verificado |
| SES01 | Navegación GET /auth/account | AUTHENTICATED | Entra en gestión de identidad sin exponer tokens; verificar acr/amr al volver |
| SES02 | POST /api/v1/me/sessions/{id}/revoke | AUTHENTICATED | 200; solo sesión propia; revocación inmediata |
| SES03 | POST /auth/logout | AUTHENTICATED | CSRF; 204 y cookie expirada; limpiar estado de UI y cerrar streams |
| CON01 | POST /connections/{provider}/authorize | OWNER,ADMIN | Devuelve authorize_url allowlist; OAuth state ligado a tenant/actor; callback backend; tokens cifrados |
| CON02 | POST /connections/{id}/disconnect | OWNER,ADMIN | Body expected_version; 200; revoca capacidad y cancela nuevas tareas dependientes |
| AUD01 | GET /audit-events | AUDITOR,OWNER,ADMIN | Cursor,actor_id,action,from,to; 200 metadatos autorizados; sin datos sensibles por defecto |
| JOB01 | GET /jobs/{id} | AUTHORIZED_SCOPE | 200 estado,progreso,error_code,result_url si autorizado; URL solo al solicitar descarga |
| EXP01 | POST /jobs/{id}/download | AUTHORIZED_SCOPE | 200 URL firmada60s si resultado CLEAN y permisos vigentes; 410 expirado |
| FILE01 | POST /files/uploads + PUT URL + POST /files/{id}/complete | AUTHORIZED_SCOPE | Crear metadatos(scope_type,scope_id,name,mime,size,sha256); subir objeto; complete202 escaneo; mostrar cuarentena |
| DASH01 | GET /dashboard | AUTHENTICATED_MEMBER | 200 métricas reales filtradas por permisos; excluir módulos no autorizados |


Lecturas auxiliares: GET /api/v1/me retorna identidad y estado MFA sin tokens; GET /api/v1/me/sessions lista sesiones propias; GET /api/v1/me/organizations lista memberships activas. Dentro de tenant: GET /settings/organization, /memberships, /invitations, /connections, /jobs, /files/{id}; aplican permisos de los comandos asociados y redacción. GET /health/live y /health/ready solo estado técnico mínimo sin secretos; readiness comprueba DB/migraciones, no consulta PSP por cada petición.

## Consultas del dominio

| ID | Endpoints | Permisos mínimos de lectura | Proyección |
| --- | --- | --- | --- |
| DOM01-READ | GET /customers; GET /customers/{id} | TELLER, ACCOUNT_AUDITOR | Ficha de titular y cuentas asociadas. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |
| DOM02-READ | GET /ledger-accounts; GET /ledger-accounts/{id} | TELLER, TREASURY_APPROVER, ACCOUNT_AUDITOR | Saldo contable, retenido y disponible por moneda; movimientos paginados. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |
| DOM03-READ | GET /transfers; GET /transfers/{id} | TELLER, TREASURY_APPROVER, ACCOUNT_AUDITOR | Formulario origen/destino, confirmación e identificador de operación. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |
| DOM04-READ | GET /holds; GET /holds/{id} | TELLER, TREASURY_APPROVER, ACCOUNT_AUDITOR | Fondos retenidos, vencimiento y liberación. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |
| DOM05-READ | GET /adjustment-requests; GET /adjustment-requests/{id} | TELLER, TREASURY_APPROVER, ACCOUNT_AUDITOR | Doble control con asiento propuesto, motivo y responsables. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |
| DOM06-READ | GET /journal-entries; GET /journal-entries/{id} | ACCOUNT_AUDITOR, TREASURY_APPROVER | Asiento, apuntes y cadena de reversos; vista de diferencias. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |
| DOM07-READ | GET /business-settings; GET /business-settings/{id} | ADMIN, OWNER | Catálogos operativos del tenant: Cuenta de contrapartida. Listado, alta y detalle por catálogo; preservar referencias históricas. Solo tenant y scope de membership. Usuarios externos: únicamente su cuenta/expediente. Proyección minimizada según rol; selectores devuelven id/label, no documento completo. |


Si un endpoint aparece en varias pantallas, se implementa un único operationId con permisos y validación por campo (por ejemplo mensajes PUBLIC/INTERNAL); no handlers contradictorios. Los catálogos de configuración exponen GET colección/detalle y selectores id/label a roles autorizados del dominio, sin elevarlos a ADMIN. Un rol listado recibe solo columnas/scopes necesarios: un EMPLOYEE/BUYER/CUSTOMER no hereda acceso de un aprobador que comparta pantalla. Un listado común con varias vistas debe aplicar proyección por permiso; pruebas de columna confidencial obligatorias. Cuando la pantalla muestra recursos auxiliares de un módulo distinto, exponer query DTO mediante API pública de ese módulo y documentar permiso; no acceso directo a tablas.

## Comandos por dominio

### Clientes

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM01-A01 | Crear cliente: POST /customers | external_ref,name | TELLER | 201 — Crea titular activo | 409 referencia duplicada |

### Cuentas y saldos

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM02-A01 | Abrir cuenta: POST /ledger-accounts | customer_id,code,currency | TELLER | 201 — Cuenta de cliente con saldo 0 y no sobregiro | 409 código duplicado |

### Transferencias

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM03-A01 | Confirmar transferencia: POST /transfers | source_account_id,destination_account_id,amount,currency | TELLER | 201 — Asiento doble y saldos confirmados atómicamente | 409 INSUFFICIENT_AVAILABLE_BALANCE |
| DOM03-A02 | Solicitar reverso: POST /transfers/{id}/reversal-requests | reason | TELLER | 200 — Abre solicitud, sin borrar original | 409 reverso existente |

### Retenciones

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM04-A01 | Crear retención: POST /holds | account_id,amount,expires_at,reference | TELLER | 201 — Reduce disponible sin cambiar contable | 409 disponible insuficiente |
| DOM04-A02 | Liberar retención: POST /holds/{id}/release | reason,expected_version | TELLER | 200 — Libera una vez sin crear asiento de dinero | 409 retención consumida |

### Ajustes y reversos

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM05-A01 | Solicitar ajuste: POST /adjustment-requests | account_id,counterpart_account_id,amount,reason | TELLER | 201 — PENDING_APPROVAL con propuesta equilibrada | 422 contrapartida ausente |
| DOM05-A02 | Aprobar ajuste: POST /adjustment-requests/{id}/approve | expected_version,reason | TREASURY_APPROVER | 200 — Publica asiento y proyecciones una vez | 403 autoaprobación |
| DOM05-A03 | Aprobar reverso: POST /transfers/{id}/approve-reversal | expected_version,reason | TREASURY_APPROVER | 200 — Nuevo asiento inverso tras comprobar fondos y solicitud ajena | 409 fondos insuficientes para reverso |

### Libro mayor y conciliación

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM06-A01 | Conciliar saldos: POST /reconciliation-runs | as_of | ACCOUNT_AUDITOR | 201 — Recalcula desde apuntes bajo snapshot y reporta diferencias | 409 conciliación en curso |
| DOM06-A02 | Exportar libro: POST /exports | kind=ledger,from,to | ACCOUNT_AUDITOR | 202 — Exportación privada con referencia de corte | 422 rango excesivo |

### Configuración de negocio

| ID | Control / endpoint | Body requerido | Permiso | Éxito y efecto | Error específico |
| --- | --- | --- | --- | --- | --- |
| DOM07-A01 | Configurar cuenta de contrapartida: POST /ledger-counterpart-accounts | code,currency,normal_side,purpose | ADMIN | 201 — Crea maestro o nueva revisión; no altera documentos ya confirmados | 409 referencia duplicada, vigencia incompatible o relación ajena |


Todos los comandos incluyen adicionalmente401/403/404,422 de esquema,409 de versión/estado y429 cuando corresponda. El backend comprueba preestado de 06-PROCESOS.md. No exponer PATCH status genérico para saltar aprobación, cobro o revisión.

## Archivos, exportación y validación

POST /files/uploads crea metadato provisional y URL PUT firmada de5min limitada a una clave y tamaño declarado; scope_type/scope_id deben existir y estar autorizados (para adjuntos de un borrador, crear primero el borrador; factura recibida de MatchInvoice usa proveedor autorizado como scope provisional y transfiere el vínculo al crear expediente). POST /files/{id}/complete verifica objeto/hash/tamaño y encola escaneo. GET /files/{id} devuelve metadatos permitidos, no el contenido si no CLEAN. POST /files/{id}/download autoriza de nuevo y emite URL60s.

POST /exports acepta solo kind enumerados en comandos del producto y filtros admitidos; devuelve202 job. Export no ejecuta SQL arbitrario ni usa claves de objeto suministradas. En /jobs/{id} SUCCEEDED no implica descarga pública.

## Webhooks e inbox

Endpoint externo /webhooks/{provider}/{connection_public_id}; provider allowlist, connection_public_id opaco identifica conexión registrada. Verificar firma sobre raw body y timestamp con SDK/documentación del proveedor y secreto de esa conexión; no inventar esquema de firma universal. Comparar provider account/portal con conexión y rechazar discordancia. Ack2xx solo tras persistir inbox; evento duplicado válido devuelve2xx sin repetir efectos. Rechazos auth4xx; fallo persistencia5xx para redelivery. Limitar tamaño1MB salvo contrato específico.

Para fuentes propias usar HMAC-SHA256 de timestamp + '.' + raw-body, ventana300s y nonce/event_id único, secret por fuente. Dispositivos de Pulse usan credencial propia con batch500. Importaciones declaradas como job aceptan file_id CLEAN y fuente autorizada. Todos los endpoints especiales mencionados en reglas se incorporan a OpenAPI y a tests de contrato, no quedan implementados fuera del inventario.

## Eventos internos

Envelope obligatorio: {event_id,tenant_id,event_type,schema_version:1,aggregate_type,aggregate_id,aggregate_version,occurred_at,trace_id,payload}. Payload con referencias y campos mínimos, sin secretos ni documentos completos. Consumidor valida esquema/tenant/capacidad y guarda inbox antes del efecto. Evento de dominio por cada comando confirmado: nombre estable resource.action.v1, definido en contracts/events; los nombres específicos de 06-PROCESOS.md prevalecen y se mapean sin duplicar eventos equivalentes.

## Integración AI y automatización

analysis-runs no se expone en este producto.

No endpoints n8n en este proyecto; workers del backend usan los mismos casos de uso autorizados.
