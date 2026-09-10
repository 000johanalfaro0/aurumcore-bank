# Identidad, permisos y aislamiento — aurumcore-bank

## Tenant y alcances

Entidad financiera; cuentas de clientes pertenecen a esa entidad.

Un usuario tiene identidad global y una membresía por organización. Roles/scopes pertenecen a membresía, no a usuario. Cambiar empresa limpia cachés y conexiones de la vista; no mezcla datos abiertos en otras pestañas. Cada petición usa /api/v1/tenants/{tenant_id}/...; el parámetro expresa la selección, no la autorización. Backend comprueba sesión, membresía ACTIVE, permiso y alcance del recurso en cada petición.

## Roles

| Rol | Facultad |
| --- | --- |
| OWNER | Ciclo de organización, transferencia de propiedad y administradores; no permiso implícito para autoaprobar operaciones de negocio. |
| ADMIN | Invitaciones, roles permitidos, configuración e integraciones. Para una acción de negocio necesita además su rol explícito. |
| AUDITOR | Lectura de auditoría y metadatos autorizados, sin secretos ni datos clínicos/salariales por defecto. |
| TELLER | Acciones y alcance exactos en 04-API.md y 05-FRONTEND.md; no hereda permisos de otro rol por su nombre. |
| TREASURY_APPROVER | Acciones y alcance exactos en 04-API.md y 05-FRONTEND.md; no hereda permisos de otro rol por su nombre. |
| ACCOUNT_AUDITOR | Acciones y alcance exactos en 04-API.md y 05-FRONTEND.md; no hereda permisos de otro rol por su nombre. |


Una membresía admite varios roles. Restricciones solicitante != aprobador se evalúan por identidad del actor, incluso con múltiples roles. No eliminar/suspender al último OWNER; transferencia atómica a miembro activo con MFA reciente. Roles externos (BUYER, INSURED, EMPLOYEE, CUSTOMER, SUPPLIER, VENDOR_USER, PROPERTY_OWNER si existen) además requieren relación explícita con su cuenta/expediente. Tener tenant común no les da lectura de toda la empresa.

## Flujos de identidad obligatorios

1. /login inicia OIDC con state, nonce y PKCE; callback valida issuer/audience/firma y nonce. returnTo relativo allowlist; no open redirect.
2. /registro lleva al registro del proveedor; email verificado antes de crear empresa o aceptar invitación. Respuestas genéricas ante email existente.
3. /recuperar-acceso inicia recuperación en IdP; token de un solo uso con expiración y rate limiting. No implementar password_hash propio paralelamente.
4. /organizaciones lista únicamente memberships del usuario autenticado. /organizaciones/nueva crea tenant + OWNER atómicamente; moneda y timezone obligatorias.
5. Invitación: email normalizado, roles permitidos, token aleatorio almacenado como hash, vence en72h. Aceptar exige identidad con ese email verificado, tenant activo y token sin consumo/revocación; carreras resueltas transaccionalmente.
6. Sesión: identificador opaco aleatorio, hash en DB, expiración inactiva30min y absoluta12h; renovar id después de login/elevación. Logout revoca servidor y expira cookie. Suspender miembro revoca acceso al tenant inmediatamente y cierra streams; no basta esperar JWT.
7. /perfil/seguridad permite listar/revocar sesiones y configurar MFA vía IdP. OWNER, ADMIN y roles que aprueban dinero/decisiones sensibles requieren MFA, validada por acr/amr y política de sesión; acciones críticas exigen autenticación reciente<=10min.
8. Onboarding registra nombre, slug único global, timezone IANA y moneda ISO. Sucursales/cuentas internas no crean tenants accidentalmente.

## Sesión, CSRF y endpoints

Cookie __Host-session en producción: Secure, HttpOnly, SameSite=Lax, Path=/, sin Domain; excepción localhost documentada para desarrollo. Backend guarda tokens IdP cifrados si necesita refresh. Mutaciones con cookie exigen token CSRF ligado a sesión más comprobación Origin/Referer; GET no cambia negocio. CORS no usa wildcard con credenciales. Validar body/path/query con allowlist, límites de tamaño, formatos y campos desconocidos rechazados. Consultas parametrizadas; nunca concatenar filtros a SQL.

Errores: 401 sin sesión; 403 sin permiso sobre una operación conocida; 404 para recursos de otro tenant/scope evitando enumeración; 409 conflicto de estado/versión; 422 validación de dominio; 429 cuota; 503 dependencia temporal. Logs contienen trace_id y código, no documentos/tokens/cuentas bancarias.

## PostgreSQL RLS y relaciones

Todas las tablas de dominio incluyen tenant_id NOT NULL e índice/unique(tenant_id,id). FK compuesta (tenant_id,parent_id) referencia (tenant_id,id); imposibilitar hijos con padres ajenos incluso por bug del servicio. RLS ENABLE + FORCE para tablas tenant; política USING y WITH CHECK sobre current_setting('app.tenant_id', true), denegando contexto ausente. Runtime no superuser, no BYPASSRLS y no dueño privilegiado. Migrador separado, nunca disponible en runtime.

Al empezar CADA transacción autorizada: SET LOCAL app.tenant_id y app.user_id con parámetros obtenidos de contexto verificado; la conexión del pool no conserva variables a nivel sesión. Consultas fuera de transacción tenant fallan cerradas. Tests deben usar el rol real de aplicación, no postgres/migrador.

Bootstrap de identidad: users/sessions están en esquema identity de acceso exclusivo al módulo de identidad; memberships permite al usuario consultar sus propias afiliaciones usando user_id validado por sesión. Listar tenants se hace por esa relación, nunca SELECT libre de empresas. Crear tenant/invitación usa operaciones específicas de identidad, con transacciones y pruebas de privilegio; no añadir una excepción global bypass-tenant. Domain roles se obtienen de memberships actuales en servidor.

## Aislamiento más allá de SQL

| Superficie | Garantía exigida |
| --- | --- |
| Archivos | Metadatos tenant/owner/scope; objeto en prefijo tenant/{uuid}/...; validar permiso antes de URL firmada <=60s. Bucket privado. No firmar claves arbitrarias recibidas del cliente. |
| Caché | Clave tenant + scope/permisos + versión + parámetros. Invalidar por tenant al mutar. Nunca cachear respuesta autenticada con clave solo URL global. |
| Streams | Canal seleccionado por servidor; validar tenant/scope al suscribir y por cada evento. Revocación cierra conexión; cursor no da permiso. |
| Jobs/exports | Envelope firmado con tenant y actor/capacidad; worker revalida autorización para acción sensible. Export privado con expiración y descarga autorizada. |
| Integraciones | Conexión por tenant y proveedor; cifrado de tokens, scopes mínimos, rotación y estado desconectado. Webhook resuelve conexión por endpoint/provider account verificado. |
| IA y vectores | No aplica: no habilitar búsqueda vectorial ni herramientas IA. |
| n8n | No aplica: no desplegar n8n. |


## Archivos y datos sensibles

Cargas: máximo25MB por documento salvo importaciones CSV de50MB explícitas; MIME real y extensión allowlist PDF/CSV/PNG/JPEG; StatusOps además TXT/LOG UTF-8 y JSON hasta25MB para logs con parser aislado y redacción. ZIP y ejecutables rechazados. Flujo UPLOADING → QUARANTINED → CLEAN/REJECTED. Antivirus y parser aislado sin red; escaneo fallido no habilita lectura/IA. Archivo original no se incrusta como HTML. Fórmulas CSV escapadas en exportación. URLs externas de integraciones con allowlist para impedir SSRF.

Datos sintéticos identificados en demo. Retención inicial: logs operativos30d sin PII, ejecuciones n8n7d, exports24h, archivos según política de tenant y obligación de dominio documentada. Auditoría365d como configuración inicial de demo, no afirmación legal. Eliminación de tenant: solicitud, periodo de recuperación7d configurable, purge por job con verificación de objeto/vector/caché; documentos sujetos a retención se bloquean de acceso y se registra motivo. No borrar libro mayor o nómina para ocultar historia: seudonimizar vínculos personales cuando corresponda.

## Pruebas negativas mínimas

- A y B con UUID conocidos: GET/list/count/search/export/file/stream/mutation contra B desde A deben no revelar datos ni producir efectos.
- Dos clientes externos dentro de A: repetir pruebas de alcance interno, no solo cross-tenant.
- Invitar como ADMIN no permite conceder OWNER sin transferencia explícita; invitar a otro email no permite aceptar.
- Suspender miembro durante sesión/job/revisión humana bloquea siguiente efecto autorizado.
- SQL de servicio con tenant A y FK padre B falla en BD. Conexión reutilizada A→B no filtra A. Contexto vacío devuelve denegación.
- CSRF, firma webhook inválida, replay, refresh/cookie revocada y cambios de roles se prueban con solicitudes directas al backend.

Fuentes de implementación: [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [OIDC en Keycloak](https://www.keycloak.org/securing-apps/oidc-layers). Son referencias de mecanismos; las políticas de este producto se verifican con las pruebas anteriores.
