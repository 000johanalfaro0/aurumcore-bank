# Despliegue — aurumcore-bank

Objetivo: que el link este encendido siempre, sin tarjeta y sin pagar.

| Capa | Destino | ¿Duerme? |
|---|---|---|
| Base de datos | Supabase, proyecto `portafolio-shared`, schema `aurumcore` | Solo si pasa 7 dias sin consultas. Se evita con un ping diario. |
| Backend Java | Koyeb, plan gratis (1 servicio) | No. |
| Frontend | Vercel | No. |

Ninguno de los tres pide tarjeta al registrarse.

## Riesgo conocido

El plan gratis de Koyeb da **512 MB de RAM y 0.1 vCPU**. Spring Boot cabe, pero justo.
La imagen ya viene ajustada para eso (`MaxRAMPercentage=70` y recolector serie).
Si aun asi falla por memoria, el plan B es el credito de Azure del GitHub Student Pack.
**Esto no esta comprobado todavia**: se sabra en el primer despliegue real.

---

## TU PARTE (yo no puedo crear cuentas)

### 1. Cuenta de Koyeb
1. Entra en `https://www.koyeb.com` y pulsa **Sign up**.
2. Elige **Continue with GitHub**. Asi no hace falta contrasena nueva.
3. Si en algun momento te pide tarjeta, **para y avisame**: cambiamos a Azure.

### 2. Confirmame dos cosas
- Que la cuenta de Koyeb existe.
- Que puedo crear el repositorio en tu GitHub y subir el codigo.

Eso es todo lo tuyo.

---

## MI PARTE (cuando existan las dos cosas de arriba)

1. Crear el repositorio en GitHub y subir el codigo.
2. Crear en Supabase el schema `aurumcore` y sus roles, siguiendo la receta del
   portafolio (`../ESTADO-PORTAFOLIO.md`): `aurum_migrator` y `aurum_app`.
3. Conectar Koyeb al repositorio, construyendo desde `backend/Dockerfile`.
4. Cargar las variables de entorno (ver `.env.ejemplo`). Las contrasenas van en el
   panel de Koyeb, **nunca en el repositorio**.
5. Programar el ping diario a la base para que Supabase no se pause.
6. Comprobar el resultado de verdad y darte la evidencia: el comando y su salida.

## Variables de entorno del servicio

| Variable | Para que |
|---|---|
| `DB_URL` | Conexion de ejecucion. Rol `aurum_app`, sin bypass de RLS. |
| `DB_USUARIO` / `DB_CLAVE` | Credenciales de ejecucion. |
| `DB_URL_MIGRACION` | Conexion que usa Flyway al arrancar. |
| `DB_USUARIO_MIGRACION` / `DB_CLAVE_MIGRACION` | Credenciales del rol dueno del schema. |

Puerto que expone el contenedor: **8081**. Comprobacion de vida: `GET /api/salud`.

## Comprobar que quedo bien

```bash
curl https://<tu-servicio>.koyeb.app/api/salud
# esperado: {"estado":"ok","rol":"aurum_app","esquema":"aurumcore","migracionMaxima":"2"}
```

Si `rol` no dice `aurum_app`, el despliegue esta mal: la app estaria corriendo con el
rol dueno del schema y el aislamiento por fila no protegeria nada.
