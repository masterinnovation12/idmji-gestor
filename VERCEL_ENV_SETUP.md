# Configuración de Variables de Entorno en Vercel

## Variables Requeridas para el Proyecto "web"

Debes añadir estas variables de entorno en Vercel para que el proyecto funcione correctamente.

### Cómo Añadir Variables en Vercel:

1. Ve a https://vercel.com/dashboard
2. Selecciona el proyecto **"web"** (prj_cOghTJRDQQijZApUoSxJBJQSw6C1)
3. Ve a **Settings** > **Environment Variables**
4. Añade cada variable con los siguientes valores:

### Variables de Supabase (REQUERIDAS):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dcjqjsmyydqpsmxbkhya.supabase.co
```

**Targets:** Production, Preview, Development

---

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzQ3MTUsImV4cCI6MjA4MDM1MDcxNX0.AQ-K6u8zxwREbrr_I7Lcfa8OQsUAUIYafzA4jGFs5ec
```

**Targets:** Production, Preview, Development

---

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc3NDcxNSwiZXhwIjoyMDgwMzUwNzE1fQ.ZsO4uTR-dW7KMtI553zLUyQam1hRcAa5QJXRzox3qMo
```

**Targets:** Production, Preview, Development  
**Tipo:** Secret (marcar como sensible)

---

### Variables VAPID (Notificaciones Push) - OPCIONALES:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BO2iL6_79-RNilgRKwV_qomTo01TbYbjfnBMDhPAcFV8BCLHlJGv6uQGRtW7P_RnHGUrHrzTok1otPwzqbRvOfY
```

**Targets:** Production, Preview, Development

---

```bash
VAPID_PRIVATE_KEY=zS-Zv7jb63h_25_26ihXHoevdpfyufu-gBUU91l7tvU
```

**Targets:** Production, Preview, Development  
**Tipo:** Secret (marcar como sensible)

---

```bash
VAPID_SUBJECT=mailto:admin@idmji.org
```

**Targets:** Production, Preview, Development

---

## Verificación

Después de añadir las variables, el próximo deployment debería funcionar correctamente. El error anterior era:

```
Error: supabaseUrl is required.
Failed to collect page data for /dashboard/admin/users
```

Esto se solucionará una vez añadidas las variables de entorno.

## Nota Importante

- Las variables que empiezan con `NEXT_PUBLIC_` son públicas y se exponen al cliente
- `SUPABASE_SERVICE_ROLE_KEY` y `VAPID_PRIVATE_KEY` son secretas y deben marcarse como "Sensitive"
- Asegúrate de seleccionar todos los targets (Production, Preview, Development) para cada variable

