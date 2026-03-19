# Variables de entorno para Vercel - IDMJI Gestor

Guía completa de variables de entorno necesarias para que el proyecto funcione correctamente en Vercel.

---

## Obligatorias (core)

| Variable | Descripción | Dónde se usa |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Auth, DB, clientes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | Auth, DB |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (backend) | Admin, seed, server actions |

---

## Notificaciones Push (VAPID)

| Variable | Descripción | Dónde se usa |
|----------|-------------|--------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID (base64) | Cliente: suscripción push |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID (base64) | Servidor: firmar notificaciones |
| `VAPID_SUBJECT` | Email o URL del emisor (ej: `mailto:admin@idmji.org`) | web-push |

**Importante:** Las claves VAPID deben ser un par generado con `npx web-push generate-vapid-keys`. La clave pública va al cliente, la privada solo al servidor (nunca exponerla).

---

## Opcionales según funcionalidad

### Archivos (Google Sheets CSV)

| Variable | Descripción |
|----------|-------------|
| `SHEET_ENSENANZAS_CSV_URL` | URL pública CSV de Enseñanzas |
| `SHEET_ESTUDIOS_CSV_URL` | URL pública CSV de Estudios |
| `SHEET_INSTITUTO_CSV_URL` | URL pública CSV de Instituto |
| `SHEET_PASTORADO_CSV_URL` | URL pública CSV de Pastorado |

Ver [VERCEL_ENV_SHEETS.md](./VERCEL_ENV_SHEETS.md) para más detalles.

### Cron / automatización

| Variable | Descripción |
|----------|-------------|
| `CRON_SECRET` | Token para proteger endpoints `/api/cron/*` |

### URLs y correo

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (ej: `https://idmji-gestor.vercel.app`) |

Usada para redirects (ej: "olvidé contraseña").

---

## No necesarias en producción

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_ENABLE_PUSH_DEV` | Solo para desarrollo local (permite SW/push en localhost). En Vercel no hace falta |

---

## Resumen mínimo para Vercel

1. **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. **Push:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
3. **Archivos:** `SHEET_*_CSV_URL` (4 variables)
4. **Cron:** `CRON_SECRET`
5. **URL:** `NEXT_PUBLIC_SITE_URL` = `https://idmji-gestor.vercel.app`

---

## Comprobar en producción

- **Archivos:** `GET https://tu-dominio.vercel.app/api/archivos/env-check`
- **Push:** Activar notificaciones en Perfil → Notificaciones, enviar prueba de notificación.

---

## Tabla `user_subscriptions` (notificaciones push)

Las notificaciones push requieren la tabla `user_subscriptions` en Supabase. Si ves *"La tabla de suscripciones no existe"*:

1. **Con Supabase CLI:** `supabase db push` (aplica migraciones)
2. **Manual:** En Supabase Dashboard → SQL Editor, ejecuta el contenido de `supabase/migrations/20260317000000_user_subscriptions.sql`
