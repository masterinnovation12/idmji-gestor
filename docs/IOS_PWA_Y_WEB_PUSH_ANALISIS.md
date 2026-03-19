# Análisis profundo: iOS, PWA y Web Push

## 1. Requisitos de Web Push en iOS (fuente: WebKit, Apple)

### Cuándo funciona

- **iOS 16.4+** (marzo 2023): Web Push disponible solo para **web apps añadidas a la pantalla de inicio**.
- **No funciona en Safari** abierto como navegador: solo en la PWA instalada (standalone).
- El permiso de notificaciones debe pedirse **como respuesta a una acción del usuario** (por ejemplo, pulsar un botón).

### Requisitos técnicos (WebKit)

1. **Manifest** con `"display": "standalone"` o `"fullscreen"`.
2. **PWA instalada** mediante "Añadir a pantalla de inicio" desde el menú Compartir.
3. **HTTPS** (o localhost en desarrollo).
4. **Permiso explícito** del usuario tras una interacción directa.

### Limitaciones conocidas

- **No hay `beforeinstallprompt`** en iOS: la instalación es siempre manual.
- **Suscripciones pueden caducar** tras 1–2 semanas en algunas versiones; a veces hay que reinstalar.
- **iOS 17.4 en la UE**: Apple retiró temporalmente el soporte PWA standalone; luego lo restauró.
- **Navegadores in-app** (WhatsApp, Instagram, etc.): no permiten instalar; hay que abrir en Safari.

---

## 2. Cómo está configurado el proyecto IDMJI

### Manifest (`public/manifest.json`)

| Campo | Valor | ¿Correcto para iOS? |
|-------|-------|----------------------|
| `display` | `standalone` | ✅ Requerido |
| `start_url` | `/dashboard` | ✅ |
| `scope` | `/` | ✅ |
| `id` | `idmji-sabadell-pwa` | ✅ Para Focus/sincronización |
| `icons` | 512, 192, maskable | ✅ |
| `orientation` | `portrait` | ✅ |

### Layout / meta tags Apple (`src/app/layout.tsx`)

| Elemento | Estado |
|----------|--------|
| `appleWebApp.capable` | ✅ `true` |
| `appleWebApp.title` | ✅ "IDMJI Sabadell" |
| `appleWebApp.startupImage` | ✅ Varios tamaños iPhone |
| `apple-touch-icon` | ✅ 180, 152, 167 px |
| `apple-mobile-web-app-capable` | ✅ `yes` |
| `apple-mobile-web-app-status-bar-style` | ✅ `default` |

### InstallPrompt – instrucciones iOS

El componente detecta iOS y muestra instrucciones paso a paso:

1. **Paso 1**: Pulsar **Compartir** en la barra de navegación.
2. **Paso 2**: Seleccionar **"Añadir a pantalla de inicio"**.
3. **Paso 3**: Pulsar **"Añadir"**.

Además:

- **Detección de navegador in-app**: si el usuario viene de WhatsApp/Facebook/etc., se muestra un aviso para abrir la web en **Safari**.
- **Detección de standalone**: si la app ya está instalada (`display-mode: standalone`), no se muestra el prompt de instalación.

### Iconos

- **Manifest**: `/icons/icon-512x512.png`, `icon-192x192.png`, `icon-maskable-512x512.png`.
- **Layout**: `apple-touch-icon` 180, 152, 167 px.
- **Splash**: `/splash/splash-iphone.png` para varios tamaños de iPhone.

---

## 3. Flujo completo para iOS

```
Usuario en iPhone (Safari o Chrome)
        │
        ▼
Entra a la web (HTTPS)
        │
        ├─ Si viene de WhatsApp/Instagram → Aviso: "Abre en Safari"
        │
        ▼
InstallPrompt detecta iOS y muestra instrucciones
        │
        ▼
Usuario: Compartir → Añadir a pantalla de inicio → Añadir
        │
        ▼
PWA instalada (icono en pantalla de inicio)
        │
        ▼
Usuario abre la app desde el icono (modo standalone)
        │
        ▼
NotificationPrompt o PushNotificationToggle pide permiso (tras tap)
        │
        ▼
Usuario acepta → Suscripción guardada en user_subscriptions
        │
        ▼
Web Push funciona (recordatorios, notificación de prueba)
```

---

## 4. Posibles mejoras

### A. Iconos y assets

El layout y manifest referencian:
- `apple-touch-icon`: 180, 152, 167 px
- Manifest: 512, 192, maskable
- Screenshots: `screenshot-wide.png`, `screenshot-narrow.png`

Verificar que `public/icons/` y `public/screenshots/` existan y contengan estos archivos. Si faltan, iOS usará un fallback (monograma con la primera letra del nombre). El script `npm run generate-splash` genera el splash; puede ampliarse para iconos.

### B. Traducción "Añadir a pantalla de inicio"

En español, la opción de iOS es **"Añadir a pantalla de inicio"**. La clave `pwa.addToHome` está como "Añadir a Inicio"; conviene cambiarla a "Añadir a pantalla de inicio" para que coincida con la interfaz de iOS.

### C. Screenshots en manifest

El manifest incluye `screenshot-wide.png` y `screenshot-narrow.png`. Verificar que existan en `public/screenshots/` para que la instalación en iOS muestre vistas previas correctas.

### D. Mensaje específico para iOS en notificaciones

Si el usuario está en Safari (no PWA), se podría mostrar un mensaje tipo: "Para recibir notificaciones en iPhone, instala la app desde el menú Compartir → Añadir a pantalla de inicio".

---

## 5. Resumen

| Aspecto | Estado en el proyecto |
|---------|------------------------|
| Manifest `display: standalone` | ✅ Correcto |
| Meta tags Apple | ✅ Correctos |
| Instrucciones iOS | ✅ Implementadas |
| Detección in-app browser | ✅ Con aviso |
| Detección standalone | ✅ No se muestra prompt si ya instalada |
| Web Push (tras instalar) | ✅ Mismo flujo que web/Android |

El proyecto está bien preparado para iOS. La única condición es que el usuario **instale la PWA manualmente** desde Safari (Compartir → Añadir a pantalla de inicio), ya que iOS no ofrece `beforeinstallprompt`.
