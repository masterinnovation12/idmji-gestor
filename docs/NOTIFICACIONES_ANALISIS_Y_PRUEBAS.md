# Análisis de Notificaciones Push – IDMJI Gestor

## Dónde están y cómo funcionan

### Ubicación en el código

| Archivo | Función |
|---------|---------|
| `src/app/actions/notifications.ts` | Server actions: `subscribeToPush`, `unsubscribeFromPush`, `sendTestNotification`, `sendNotificationToUser` |
| `src/components/PushNotificationToggle.tsx` | UI en Perfil: activar/desactivar, enviar prueba |
| `src/components/NotificationPrompt.tsx` | Banner en Dashboard para pedir activación |
| `src/hooks/usePushNotifications.ts` | Hook para suscripción (usado en otros componentes) |
| `public/sw.js` | Service Worker: escucha `push` y `notificationclick` |
| `src/app/api/cron/send-reminders/route.ts` | Cron diario 9:00 – recordatorios de asignaciones |
| `src/app/dashboard/DashboardClient.tsx` | Renderiza `NotificationPrompt` |

### Plataformas soportadas

| Plataforma | Soporte | Notas |
|------------|---------|-------|
| **Web (Chrome/Edge)** | ✅ | Funciona en HTTPS. Localhost es contexto seguro. |
| **Web (Firefox)** | ✅ | Soporta Web Push. |
| **Android (Chrome PWA)** | ✅ | PWA instalada o en navegador. |
| **Android (Firefox)** | ✅ | Soporta Web Push. |
| **iOS (Safari)** | ⚠️ Limitado | Solo en PWA instalada (Add to Home Screen), iOS 16.4+. No en Safari en navegador. Ver `docs/IOS_PWA_Y_WEB_PUSH_ANALISIS.md`. |
| **iOS (Chrome)** | ❌ | Chrome en iOS usa WebKit; no soporta push. |

### Flujo técnico

1. **Activación**: Usuario acepta permisos → SW se registra → `pushManager.subscribe()` con VAPID pública → suscripción se guarda en `user_subscriptions`.
2. **Envío**: Servidor usa `web-push` + VAPID privada → `webpush.sendNotification(subscription, payload)`.
3. **Recepción**: SW recibe evento `push` → `showNotification()` → en `notificationclick` abre URL.

---

## Problemas identificados y mejoras

### 1. **Desarrollo local: SW desregistrado**

**Problema**: `PWARegister.tsx` desregistra el Service Worker en localhost para que HMR funcione. Eso impide que las notificaciones push funcionen en desarrollo.

**Solución**: Variable `NEXT_PUBLIC_ENABLE_PUSH_DEV=true` para no desregistrar SW en dev cuando se quiera probar push.

### 2. **Pruebas en localhost**

- Push requiere contexto seguro: **localhost** o **HTTPS**.
- En localhost el SW se desregistra por defecto.
- Para probar: usar `NEXT_PUBLIC_ENABLE_PUSH_DEV=true` o desplegar en staging (Vercel preview).

### 3. **iOS: PWA obligatoria**

- Web Push en iOS solo funciona si la app está instalada como PWA (Add to Home Screen).
- No funciona en Safari en navegador.
- El usuario debe abrir la app desde el icono en el escritorio.

### 4. **Tabla `user_subscriptions`**

- Debe existir en Supabase con RLS correcto.
- Política `Service role has full access` necesaria para que el cron envíe notificaciones.
- Verificar con: `node scripts/check_notifications_table.js`

### 5. **Variables de entorno**

Requeridas en producción (Vercel):

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ej: `mailto:admin@idmji.org`)
- `CRON_SECRET` (para `/api/cron/send-reminders`)

### 6. **Cron de recordatorios**

- Endpoint: `GET /api/cron/send-reminders`
- Cabecera: `Authorization: Bearer <CRON_SECRET>`
- Vercel Cron debe estar configurado para las 9:00.

---

## Cómo probar (pruebas senior)

### A. Verificación del entorno

```bash
node scripts/verify_notifications_setup.mjs
```

Comprueba: VAPID, tabla, variables.

### B. Pruebas unitarias

```bash
npm run test -- src/app/actions/notifications.test.ts
```

### C. Pruebas en producción/staging

1. **Activación**: Dashboard → aceptar prompt de notificaciones.
2. **Prueba manual**: Perfil → Notificaciones → Activar → Enviar notificación de prueba.
3. **Cron**:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio.vercel.app/api/cron/send-reminders
   ```

### D. Pruebas en desarrollo local (con SW habilitado)

1. Añadir a `.env.local`: `NEXT_PUBLIC_ENABLE_PUSH_DEV=true`
2. Reiniciar `npm run dev`
3. Ir a Perfil → Notificaciones → Activar → Enviar prueba

**Nota**: Chrome en localhost puede mostrar "push service not available". Es una limitación del navegador. Alternativas:
- Probar en **producción** (HTTPS)
- Usar **ngrok** para exponer localhost con HTTPS: `ngrok http 3000`

### E. Chrome DevTools – simular push

1. F12 → Application → Service Workers
2. Botón "Push" para simular un evento push
3. Payload de ejemplo: `{"title":"Test","body":"Mensaje","url":"/dashboard"}`

### F. Playwright E2E

- `e2e/notifications.spec.ts`: prueba que perfil requiere login y (con credenciales E2E) que la sección de notificaciones se muestra.
- Playwright no simula bien push real (permisos, headless).
- Para el test con login: configurar `.env.e2e.local` con `E2E_USER_EMAIL` y `E2E_USER_PASSWORD`.
