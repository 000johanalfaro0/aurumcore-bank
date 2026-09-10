# Frontend y controles verificables — aurumcore-bank

## Experiencia de producto

Libro mayor bancario y saldos disponibles. Usuario objetivo: TELLER, TREASURY_APPROVER, ACCOUNT_AUDITOR. Propósito visible: Registrar transferencias, retenciones y reversos preservando integridad contable y evitando gastar fondos comprometidos.

Shell: barra lateral por dominios, encabezado con organización activa y perfil, breadcrumbs en detalle, centro de tareas y notificaciones. Ancho desktop1280/1440; tablet768; móvil390. Operaciones densas usan tabla desktop y tarjetas/resumen móvil; no forzar veinte columnas en teléfono. Identidad visual profesional propia: tokens de color/espaciado/tipografía, una acción primaria por contexto, contraste comprobado. No hacer24 copias de un dashboard con nombres distintos: cada interacción central se desarrolla según su módulo.

Rutas tenant: /t/{tenant_slug} como prefijo de todas las rutas de dominio y configuración siguientes. El slug se resuelve contra memberships; API usa tenant UUID autorizado. /login, /registro, /recuperar-acceso, /invitaciones/aceptar, /organizaciones y /perfil/seguridad son globales. Acceso directo/refresh deben funcionar. Documentar404 y pantalla de sesión caducada; no redirigir a otra empresa silenciosamente.

## Pantallas compartidas y botones

| Control ID | Ruta | Etiqueta | Acción | Rol | Resultado comprobable |
| --- | --- | --- | --- | --- | --- |
| AUTH01 | /login | Iniciar sesión | Navegación GET /auth/login | PUBLIC | Redirige al IdP con state/PKCE; callback seguro; vuelve a organizaciones |
| AUTH02 | /registro | Crear cuenta | Navegación GET /auth/register | PUBLIC | Registro en IdP; verificación por correo; no crear tenant hasta identidad verificada |
| AUTH03 | /recuperar-acceso | Recuperar acceso | Navegación GET /auth/recover | PUBLIC | Respuesta genérica y recuperación en IdP |
| AUTH04 | /invitaciones/aceptar | Aceptar invitación | POST /api/v1/invitations/accept | VERIFIED_USER | Body token; consume hash una vez y crea membership; 409 si consumida, 410 si vencida |
| ORG01 | /organizaciones | Cambiar organización | Local + GET /api/v1/me/organizations | AUTHENTICATED | Selecciona tenant autorizado en URL, invalida caché y abre dashboard; no requiere mutación del negocio |
| ORG02 | /organizaciones/nueva | Crear organización | POST /api/v1/organizations | VERIFIED_USER | Body name,slug,timezone,currency; 201 tenant + OWNER atómicos; 409 slug ocupado |
| ORG03 | /configuracion/organizacion | Guardar organización | PATCH /settings/organization | OWNER,ADMIN | Body name,timezone,currency,expected_version; 200 nueva versión; no cambiar moneda de documentos históricos |
| MEM01 | /configuracion/equipo | Invitar integrante | POST /invitations | OWNER,ADMIN | Body email,roles[],scope_assignments[]; 201 invitación; never elevar OWNER por invitación |
| MEM02 | /configuracion/equipo | Revocar invitación | POST /invitations/{id}/revoke | OWNER,ADMIN | Body expected_version; 200 REVOKED; 409 ya aceptada |
| MEM03 | /configuracion/equipo | Modificar permisos | PUT /memberships/{id}/roles | OWNER,ADMIN | Body roles[],scope_assignments[],expected_version; 200; no permitir elevar privilegios fuera de facultad del actor |
| MEM04 | /configuracion/equipo | Suspender integrante | POST /memberships/{id}/suspend | OWNER,ADMIN | Body reason,expected_version; 200 y acceso revocado; 409 último OWNER |
| MEM05 | /configuracion/equipo | Transferir propiedad | POST /ownership-transfer | OWNER | Body target_membership_id,expected_version; MFA reciente; 200; destino activo y verificado |
| SES01 | /perfil/seguridad | Configurar MFA | Navegación GET /auth/account | AUTHENTICATED | Entra en gestión de identidad sin exponer tokens; verificar acr/amr al volver |
| SES02 | /perfil/seguridad | Revocar sesión | POST /api/v1/me/sessions/{id}/revoke | AUTHENTICATED | 200; solo sesión propia; revocación inmediata |
| SES03 | shell | Cerrar sesión | POST /auth/logout | AUTHENTICATED | CSRF; 204 y cookie expirada; limpiar estado de UI y cerrar streams |
| CON01 | /configuracion/integraciones | Conectar proveedor | POST /connections/{provider}/authorize | OWNER,ADMIN | Devuelve authorize_url allowlist; OAuth state ligado a tenant/actor; callback backend; tokens cifrados |
| CON02 | /configuracion/integraciones | Desconectar proveedor | POST /connections/{id}/disconnect | OWNER,ADMIN | Body expected_version; 200; revoca capacidad y cancela nuevas tareas dependientes |
| AUD01 | /auditoria | Filtrar auditoría | GET /audit-events | AUDITOR,OWNER,ADMIN | Cursor,actor_id,action,from,to; 200 metadatos autorizados; sin datos sensibles por defecto |
| JOB01 | /tareas | Consultar tarea | GET /jobs/{id} | AUTHORIZED_SCOPE | 200 estado,progreso,error_code,result_url si autorizado; URL solo al solicitar descarga |
| EXP01 | /tareas | Descargar resultado | POST /jobs/{id}/download | AUTHORIZED_SCOPE | 200 URL firmada60s si resultado CLEAN y permisos vigentes; 410 expirado |
| FILE01 | selector de documentos | Cargar archivo | POST /files/uploads + PUT URL + POST /files/{id}/complete | AUTHORIZED_SCOPE | Crear metadatos(scope_type,scope_id,name,mime,size,sha256); subir objeto; complete202 escaneo; mostrar cuarentena |
| DASH01 | /dashboard | Actualizar resumen | GET /dashboard | AUTHENTICATED_MEMBER | 200 métricas reales filtradas por permisos; excluir módulos no autorizados |


Los IDs CON01/CON02 se prueban como controles presentes cuando hay proveedor conectable; si no aplica proveedor, sus tests comprueban que no se presenta un botón ficticio y que la API rechaza proveedores no admitidos. No marcar esas comprobaciones skipped. Las integraciones solo muestran proveedores que este SPEC requiere; si no hay conexión OAuth aplicable, pantalla muestra estado no configurado con explicación, sin botones ficticios. Conexión de credencial manual usa formulario seguro y endpoint backend dedicado, nunca campo de token que vuelva en GET.

## Pantallas específicas

### 1. Clientes — /clientes

**Composición:** Ficha de titular y cuentas asociadas.

**Lectura:** GET /customers, y /clientes/{id} con GET /customers/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** external_ref,name. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM01-A01 | Crear cliente | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /customers; Crea titular activo | 201: refrescar detalle/listado y versión; 409 referencia duplicada; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.

### 2. Cuentas y saldos — /cuentas

**Composición:** Saldo contable, retenido y disponible por moneda; movimientos paginados.

**Lectura:** GET /ledger-accounts, y /cuentas/{id} con GET /ledger-accounts/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** customer_id,code,currency. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM02-A01 | Abrir cuenta | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /ledger-accounts; Cuenta de cliente con saldo 0 y no sobregiro | 201: refrescar detalle/listado y versión; 409 código duplicado; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.

### 3. Transferencias — /transferencias

**Composición:** Formulario origen/destino, confirmación e identificador de operación.

**Lectura:** GET /transfers, y /transferencias/{id} con GET /transfers/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** source_account_id,destination_account_id,amount>0,currency. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM03-A01 | Confirmar transferencia | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /transfers; Asiento doble y saldos confirmados atómicamente | 201: refrescar detalle/listado y versión; 409 INSUFFICIENT_AVAILABLE_BALANCE; conservar formulario y explicar recuperación |
| DOM03-A02 | Solicitar reverso | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /transfers/{id}/reversal-requests; Abre solicitud, sin borrar original | 200: refrescar detalle/listado y versión; 409 reverso existente; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.

### 4. Retenciones — /retenciones

**Composición:** Fondos retenidos, vencimiento y liberación.

**Lectura:** GET /holds, y /retenciones/{id} con GET /holds/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** account_id,amount,expires_at,reference. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM04-A01 | Crear retención | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /holds; Reduce disponible sin cambiar contable | 201: refrescar detalle/listado y versión; 409 disponible insuficiente; conservar formulario y explicar recuperación |
| DOM04-A02 | Liberar retención | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /holds/{id}/release; Libera una vez sin crear asiento de dinero | 200: refrescar detalle/listado y versión; 409 retención consumida; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.

### 5. Ajustes y reversos — /aprobaciones

**Composición:** Doble control con asiento propuesto, motivo y responsables.

**Lectura:** GET /adjustment-requests, y /aprobaciones/{id} con GET /adjustment-requests/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** cuentas,amount,reason. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM05-A01 | Solicitar ajuste | Rol TELLER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /adjustment-requests; PENDING_APPROVAL con propuesta equilibrada | 201: refrescar detalle/listado y versión; 422 contrapartida ausente; conservar formulario y explicar recuperación |
| DOM05-A02 | Aprobar ajuste | Rol TREASURY_APPROVER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /adjustment-requests/{id}/approve; Publica asiento y proyecciones una vez | 200: refrescar detalle/listado y versión; 403 autoaprobación; conservar formulario y explicar recuperación |
| DOM05-A03 | Aprobar reverso | Rol TREASURY_APPROVER; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /transfers/{id}/approve-reversal; Nuevo asiento inverso tras comprobar fondos y solicitud ajena | 200: refrescar detalle/listado y versión; 409 fondos insuficientes para reverso; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.

### 6. Libro mayor y conciliación — /libro-mayor

**Composición:** Asiento, apuntes y cadena de reversos; vista de diferencias.

**Lectura:** GET /journal-entries, y /libro-mayor/{id} con GET /journal-entries/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** account_id,from,to,reference. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM06-A01 | Conciliar saldos | Rol ACCOUNT_AUDITOR; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /reconciliation-runs; Recalcula desde apuntes bajo snapshot y reporta diferencias | 201: refrescar detalle/listado y versión; 409 conciliación en curso; conservar formulario y explicar recuperación |
| DOM06-A02 | Exportar libro | Rol ACCOUNT_AUDITOR; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /exports; Exportación privada con referencia de corte | 202: mostrar tarea pendiente, seguir hasta estado final; 422 rango excesivo; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.

### 7. Configuración de negocio — /configuracion/negocio

**Composición:** Catálogos operativos del tenant: Cuenta de contrapartida. Listado, alta y detalle por catálogo; preservar referencias históricas.

**Lectura:** GET /business-settings, y /configuracion/negocio/{id} con GET /business-settings/{id}. Consultas por tenant, cursor y filtros en URL.

**Formulario y validación:** Cuenta de contrapartida: code,currency,normal_side,purpose. Errores por campo, resumen accesible y misma validación en servidor. Importes derivados se presentan como preview hasta confirmación del backend.

| ID | Control | Precondición | Acción / persistencia | Confirmación y fallo |
| --- | --- | --- | --- | --- |
| DOM07-A01 | Configurar cuenta de contrapartida | Rol ADMIN; recurso del tenant/scope; campos válidos; estado permitido; MFA reciente si sensible | POST /ledger-counterpart-accounts; Crea maestro o nueva revisión; no altera documentos ya confirmados | 201: refrescar detalle/listado y versión; 409 referencia duplicada, vigencia incompatible o relación ajena; conservar formulario y explicar recuperación |


**Detalle verificable:** después de cada mutación recargar la página y confirmar persistencia. Operaciones irreversibles/financieras muestran resumen de organización, recurso, importe y motivo antes del envío. Deshabilitar botón durante request; la seguridad frente a duplicados depende del backend, no de ese bloqueo visual.


## Controles locales aplicables a cada pantalla

Cada módulo DOMnn tiene IDs DOMnn-READ, DOMnn-LOCAL-OPEN, DOMnn-LOCAL-CANCEL, DOMnn-FILTER, DOMnn-NEXT, DOMnn-DETAIL, DOMnn-RETRY. Abrir/cerrar modal no modifica BD; cancelar preserva o descarta cambios con confirmación si existen. Filtro cambia querystring y consulta; limpiar restablece querystring; siguiente página usa cursor; detalle navega al id autorizado; reintentar repite lectura, nunca un pago incierto. Registrar estos controles en tests/control-manifest.json y vincularlos a test ejecutado.

En DOMnn-LOCAL-OPEN se abre el formulario principal de la primera acción; si esa acción es un comando sin formulario, abre su confirmación. DOMnn-LOCAL-CANCEL cierra y devuelve foco al disparador. Si una pantalla carece de paginación por diseño (agenda/mapa), DOMnn-NEXT navega a siguiente ventana temporal equivalente y debe tener test explícito; no marcar omitido sin especificar sustitución.

## Estados y accesibilidad

- Cargando: skeleton estable para consulta; indicador por botón al mutar; tarea larga con progreso/cancelación si permitida.
- Vacío: diferencia entre ausencia real de registros y filtros sin coincidencias; CTA solo si autorizado.
- Error: código comprensible, trace_id copiable, conservar campos; reintento seguro. 409 compara versión actual con cambios locales.
- Éxito: dato persistido y feedback discreto; no toast verde definitivo por una tarea202 aún en cola.
- Acceso: 401 reautenticación con retorno seguro, 403 explicación de permiso,404 sin confirmar existencia ajena.
- Formulario: labels reales, aria-describedby para errores, foco al primer campo inválido; modales con trap de foco y Escape. Tablas con encabezados y orden anunciados; no depender solo del color.
- Lista virtualizada solo si aporta rendimiento; alternativa accesible y búsqueda server-side para históricos. Cancelar peticiones obsoletas al cambiar filtro/tenant.

## Criterios de acabado frontend

Pruebas Playwright en Chromium desktop y móvil390; smoke adicional Firefox para auth y flujo crítico. Sin errores de consola ni requests5xx en camino feliz. Verificar teclado, foco, estados vacíos/carga/error/409, scroll y texto sin recortes en capturas por pantalla. Reportar accesibilidad automática y revisión manual; no declarar accesible solo por pasar un escáner.

Objetivo de experiencia: respuesta visual inmediata del control<100ms sin afirmar commit antes de servidor; tabla principal interactiva<2.5s en perfil de laboratorio documentado. Medir bundle y evitar cargar visor PDF/mapa/editor en rutas que no lo usan. Metas de rendimiento se verifican bajo carga/perfil especificados en 07-PRUEBAS.md, no como promesas universales.
