# Notificaciones Push – IDMJI Gestor

## Qué hace el sistema

- **Recordatorios de asignaciones**: Si tienes un rol asignado en un culto (introducción, enseñanza, finalización, testimonios), el sistema puede enviarte una **notificación push** el mismo día del culto.
- **Notificación de prueba**: Desde **Mi Perfil → Notificaciones** puedes enviarte una notificación de prueba; el texto respeta el **idioma** de tu perfil (español o catalán).
- **Ventana de activación**: Al entrar en el **Dashboard** (y si el navegador lo permite), puede aparecer un aviso para **activar notificaciones**; si lo aceptas, se guarda la suscripción para enviarte los recordatorios.

## Cuándo se notifica

1. **Cron diario (9:00)**  
   - El endpoint `/api/cron/send-reminders` se ejecuta cada día a las 9:00 (configurado en Vercel Cron).  
   - Busca **cultos del día actual** y, por cada asignación (intro, enseñanza, final, testimonios), envía **una notificación push** al usuario asignado.  
   - El **título y el cuerpo** del recordatorio usan el **idioma del perfil** del usuario (es-ES o ca-ES).

2. **Nueva asignación**  
   - Cuando en el detalle de un culto se asigna a un hermano a un rol, se puede llamar a `sendNotificationToUser` para avisar de la nueva asignación (según la lógica del detalle del culto).

3. **Notificación de prueba**  
   - Solo cuando tú pulsas **«Enviar Notificación de Prueba»** en **Mi Perfil → Notificaciones**.  
   - El título y el cuerpo se generan en el **idioma de tu perfil** (traducciones `notifications.test.title` y `notifications.test.body`).

## Cómo funciona (flujo técnico)

1. **Activación (PWA o web)**  
   - El usuario acepta permisos de notificaciones.  
   - Se registra el **Service Worker** (`/sw.js`) si no estaba registrado.  
   - Con la **clave pública VAPID** (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) el navegador crea una suscripción push.  
   - Esa suscripción (endpoint + keys) se envía al servidor y se guarda en la tabla **`user_subscriptions`** (por `user_id`).

2. **Envío desde el servidor**  
   - Las server actions y el cron usan **web-push** con las claves VAPID (pública y privada en servidor).  
   - Para cada usuario a notificar se buscan sus filas en `user_subscriptions` y se llama a `webpush.sendNotification(subscription, payload)`.  
   - El **payload** es JSON: `{ title, body, url }`.  
   - El **idioma** de los textos (recordatorios y prueba) se toma del campo **`language`** del **perfil** del usuario en `profiles` (es-ES / ca-ES).

3. **Recepción en el dispositivo**  
   - El **Service Worker** recibe el evento **`push`**, hace `event.data.json()` y muestra la notificación con **title**, **body** e **icon**.  
   - En **`notificationclick`** se abre la **URL** del payload (en ventana existente o nueva); la URL se resuelve a **absoluta** con `self.location.origin` para que funcione bien en PWA y enlaces directos.

4. **PWA**  
   - La app es instalable como PWA (`manifest.json`, `/icons/`, `display: standalone`).  
   - Las notificaciones funcionan igual en la **web** y en la **app instalada**; el mismo SW y las mismas suscripciones en `user_subscriptions` se usan en ambos casos.

## Qué hace falta para que funcione en producción

- **Variables de entorno en Vercel** (ya configuradas para Production):  
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  
  - `VAPID_PRIVATE_KEY`  
  - `VAPID_SUBJECT` (p. ej. `mailto:admin@idmji.org`)
- **Tabla `user_subscriptions`** en Supabase (migración `001_user_subscriptions.sql`) con RLS que permita al usuario gestionar sus propias filas y al **service_role** leer para enviar notificaciones.
- **Cron en Vercel**: el job que llama a `/api/cron/send-reminders` a las 9:00. El endpoint está protegido con **`CRON_SECRET`**: la petición debe enviar la cabecera `Authorization: Bearer <CRON_SECRET>`; si no, responde 401.
- **HTTPS**: Las notificaciones push solo funcionan en origen **seguro** (https o localhost en desarrollo).

## Pruebas (local y producción)

### Tests unitarios (Vitest)
- `src/app/actions/notifications.test.ts`: `subscribeToPush` (sin auth → error), `unsubscribeFromPush`, `sendTestNotification` (sin suscripciones → error), `sendNotificationToUser` (sin suscripciones → error).
- Ejecutar: `npm run test` o `npx vitest run src/app/actions/notifications.test.ts`.

### E2E (Playwright)
- `e2e/dashboard-prompts.spec.ts`: al cargar el dashboard, como mucho un prompt visible (install o notificaciones), sin solapamiento.
- Ejecutar: `npm run test:e2e` (con servidor en marcha o `PLAYWRIGHT_BASE_URL` apuntando a producción para pruebas en producción).

### Pruebas manuales en producción
1. **Activación**: Entra al dashboard en producción (HTTPS). Si el navegador lo permite, primero puede aparecer el aviso de **instalar la PWA**; al cerrarlo, tras ~1,5 s puede aparecer el aviso de **activar notificaciones**. Comprueba que no se solapan (solo uno a la vez).
2. **Notificación de prueba**: En **Mi Perfil → Notificaciones**, activa notificaciones y pulsa **Enviar notificación de prueba**. Debe llegarte una notificación; el texto debe respetar el idioma de tu perfil (ES/CA).
3. **Recordatorios (cron)**: El endpoint `/api/cron/send-reminders` está protegido con `CRON_SECRET`. Sin cabecera `Authorization: Bearer <CRON_SECRET>` debe responder 401. Con el token correcto (y cultos del día con asignaciones) debe responder 200. Puedes probar con:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://tu-dominio.vercel.app/api/cron/send-reminders
   # Esperado: 401
   curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio.vercel.app/api/cron/send-reminders
   # Esperado: 200 (o 200 con mensaje "No hay cultos para hoy")
   ```

## Resumen de componentes

| Componente | Dónde | Función |
|------------|--------|--------|
| **NotificationPrompt** | Dashboard | Ventana/banner para pedir activar notificaciones; registra SW y suscribe si el usuario acepta. |
| **PushNotificationToggle** | Mi Perfil | Activar/desactivar notificaciones y enviar notificación de prueba. Textos con i18n (ES/CA). |
| **send-reminders (cron)** | `/api/cron/send-reminders` | Cada día a las 9:00; notifica a usuarios con asignación ese día; idioma por perfil. |
| **sendTestNotification** | Server action | Envía notificación de prueba; título y cuerpo según idioma del perfil. |
| **sendNotificationToUser** | Server action | Envía una notificación a un usuario por `userId` (título, cuerpo, url). |
| **sw.js** | Service Worker | Escucha `push` y `notificationclick`; muestra la notificación y abre la URL en absoluto. |

## Idioma en las notificaciones

- **Recordatorios del cron**: se usa `profile.language` del usuario asignado; con eso se eligen las cadenas `notifications.reminder.title` y `notifications.reminder.body` (ES o CA).
- **Notificación de prueba**: se usa `profile.language` del usuario actual; con eso se eligen `notifications.test.title` y `notifications.test.body`.
- La **ventana de activación** (NotificationPrompt) y la **sección de notificaciones** en perfil (PushNotificationToggle) usan **useI18n** y las claves `notifications.*` y `profile.notifications.*` en ES/CA.
