# Instrucciones de implementación — aurumcore-bank

## Objetivo

Construir el proyecto 09 completo conforme a SPEC.md y docs01–10. Estas instrucciones no afirman que exista código. Leer README.md → SPEC.md → docs en orden numérico → docs/PROGRESO.md si existe. Si falta PROGRESO, crearlo en F0 con estado real. No necesitas la conversación original ni archivos del padre.

## Arquitectura y praxis obligatorias

- Modularidad por dominio, dependencias dirigidas y API pública interna por módulo. Frontend/backend separados; manifests, config y tests propios.
- Ningún ORM/credencial en frontend; ningún SQL ni autorización de negocio en n8n; ningún pago/decisión sensible decidido por IA. No repositorios privados de otro módulo importados directamente.
- Autenticación OIDC, memberships multiempresa, roles/scopes, MFA privilegiado y aislamiento comprobado en cada capa. Nunca confiar en tenant_id/actor_id del cliente.
- Integridad en DB más casos de uso transaccionales. Mutaciones idempotentes, errores tipados, outbox y reconciliación de resultados externos inciertos.
- Construir verticalmente UI→API→DB, con tests de reglas y fallos. Todas las pantallas/control IDs deben funcionar. Acciones locales válidas no necesitan endpoint.
- Fixtures sintéticos y dobles de proveedores permitidos en pruebas y etiquetados. Prohibido usarlos para afirmar que una integración real funciona o reemplazar persistencia de producto por arrays.
- No interpretar una búsqueda de TODO/mock como prueba de funcionamiento. No marcar fase PASS sin comando, exit code y evidencia del estado resultante.

## Trabajo local y límites

Usar rg para navegación. Inspeccionar estado antes de editar y conservar cambios ajenos. No hace falta publicar ni tocar recursos externos para construir localmente. Preparar cualquier acción externa para revisión y ejecutarla solo con autorización del usuario ya existente. No enviar mensajes, pagos ni campañas reales por defecto. No modificar credenciales/config global del usuario.

## Validación y handoff

F0 implementa el runner descrito en docs/09-OPERACION.md; no ejecutar comandos de scripts inexistentes como si fueran herramientas instaladas. No asumir CLI ecc/$ecc. Ejecutar prompts02→03→04 tras completar dominio; registrar PASS/FAIL/NOT_RUN/BLOCKED_EXTERNAL por gate. Reportar pendientes honestamente y continuar lo independiente.

Los documentos son normativos salvo docs/antecedentes. Si detectas una contradicción, resuélvela mediante decisión explícita preservando autenticación, tenancy, modularidad y alcance. No recortar módulos para obtener verde. Cambios de stack/alcance importantes se documentan para revisión; decisiones rutinarias dentro de este contrato se toman autónomamente.
