# Guía de Despliegue en Vercel - IDMJI Gestor

Para desplegar esta aplicación en Vercel correctamente, sigue estos pasos:

## 1. Conexión con Supabase
Vercel necesita las credenciales de Supabase para comunicarse con la base de datos y el servicio de autenticación.

### Variables de Entorno Requeridas:
Debes configurar las siguientes variables en el panel de Vercel (Project Settings > Environment Variables):

| Variable | Descripción | Valor sugerido |
|----------|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | `https://dcjqjsmyydqpsmxbkhya.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave Anon JWT | (Obtenla del panel de Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (bypass RLS) | **REQUERIDA** para acciones administrativas |
| `DATABASE_URL` | URL de conexión directa Postgres | Necesaria para migraciones si usas Prisma/Drizzle |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública para Push | `BEeyLGjKHt_LpMMvsD7_63UIvVktANK2wN48bMrSA9L0goyoEbpxhL1xCN62c3PvwzamOmgCABglrcGxUk` |
| `VAPID_PRIVATE_KEY` | Clave privada para Push | (Tu clave privada actual) |
| `VAPID_SUBJECT` | Email de contacto para Push | `mailto:admin@idmji.org` |

## 2. Configuración del Build
- **Framework Preset**: Next.js
- **Root Directory**: `web` (Asegúrate de configurar esto si el repositorio tiene el proyecto en una subcarpeta)
- **Install Command**: `npm install`
- **Build Command**: `npm run build`

## 3. Consideraciones de Seguridad
- Nunca subas el archivo `.env.local` al repositorio.
- Asegúrate de que las políticas RLS en Supabase estén configuradas correctamente para producción.
- El rol `ADMIN` en la tabla `profiles` otorgará acceso a las funciones de gestión de usuarios y estadísticas globales.

## 4. Pruebas antes del Deploy
Ejecuta los siguientes comandos localmente para asegurar que todo está correcto:
```bash
npm run lint
npm run build
```
Si estos comandos terminan sin errores, la aplicación está lista para Vercel.
