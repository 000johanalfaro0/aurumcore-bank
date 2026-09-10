# SPEC-LITE — 09 aurumcore-bank (Fase 1)

> Complementa `SPEC.md`, no lo reemplaza. Reglas comunes: `../LITE-CONTRATO.md`.

**Grupo 3** — React + TS + Vite / Java 21 + Spring Boot + JPA + Flyway / PostgreSQL con RLS.

## Killer feature (no se recorta)
Ejecutar transferencias concurrentes y reintentos tras caidas sin crear dinero,
duplicar movimientos ni gastar saldo retenido.

## ADN visual (CONFIRMADO 2026-09-10)

Propio de esta aplicacion. No se reutiliza en los otros 23. Aprobado por el usuario sobre
la maqueta de `design/cuentas.html` y `design/libro-mayor.html`. Reglas del metodo en
`../LITE-CONTRATO.md`.

| Decision | Valor |
|---|---|
| Referencia real | Stripe Dashboard (vista de saldos y libro mayor) y Mercury (banca para empresas). Herramienta de tesoreria, no panel de marketing. |
| Tipografia | IBM Plex Sans para interfaz. IBM Plex Mono para importes, IBAN e identificadores de operacion. |
| Paleta | Neutro piedra calido como base. Acento verde azulado profundo (no el azul por defecto). Semanticos: abono verde bosque, cargo rojo ladrillo, retenido ambar. |
| Densidad | Compacta. Fila de tabla de 32 px. Es una herramienta que alguien mira 8 horas. |
| Forma | Radios de 2 px, casi rectos. Bordes finos de 1 px. **Cero sombras.** Se separa con lineas, no con tarjetas. |
| Elemento firma | **Vista de asiento por partida doble.** Cada transferencia se muestra como asiento contable real: debe y haber en dos columnas, con una franja inferior que muestra la suma siempre igual a cero. Es el detalle que demuestra que se entendio el dominio. |

## Flujo vertical de Fase 1
`/cuentas` ver saldo contable, retenido y disponible por moneda -> `/transferencias`
enviar con identificador de operacion -> lanzar 50 transferencias a la vez y repetir
una tras perder la respuesta -> `/retenciones` un hold bloquea fondos y no se puede
gastar -> `/libro-mayor` cada asiento con sus apuntes cuadrados y la cadena completa.

## Modulos en Fase 1

| Modulo | Ruta | Alcance Fase 1 | Fuera de Fase 1 |
|---|---|---|---|
| Cuentas y saldos | `/cuentas` | Saldo contable, retenido y disponible por moneda; movimientos paginados | Apertura y cierre de cuentas |
| Transferencias | `/transferencias` | Origen/destino, confirmacion, identificador de operacion idempotente | Programadas, por lote, internacionales |
| Retenciones | `/retenciones` | Fondos retenidos, vencimiento y liberacion | Retenciones judiciales, motivos configurables |
| Libro mayor y conciliacion | `/libro-mayor` | Asiento, apuntes, cadena de reversos, vista de diferencias | Exportacion contable, cierres periodicos |

## Sembrado (existe, no se crea desde la interfaz)
Titulares y sus cuentas en dos monedas, saldos iniciales, cuentas de contrapartida.

## Aplazado a Fase 2
Clientes editable (`/clientes`), Ajustes y reversos con doble control (`/aprobaciones`),
Configuracion de negocio, reverso aprobado (CRIT-04).

## Pruebas de Fase 1

| Id | Que prueba | Origen |
|---|---|---|
| `LITE-01` | Banco A no ve cuentas, movimientos ni asientos del B | RLS |
| `LITE-02` | Cuenta A=100, B=0, 50 peticiones concurrentes de 3: la suma total no cambia y no hay movimientos duplicados | CRIT-01 |
| `LITE-03` | Transferencia publicada con respuesta perdida: repetir la misma clave no crea un segundo cargo | CRIT-02 |
| `LITE-04` | A=100 con retencion de 80: transferir 30 devuelve 409; contable sigue 100 y retenido sigue 80 | CRIT-03 |
| `LITE-05` | Humo e2e en navegador del flujo completo | — |

## Demo
El visitante entra como operador. Pulsa "50 transferencias a la vez" y ve el total del
sistema quedar exactamente igual, con el libro mayor cuadrado.
