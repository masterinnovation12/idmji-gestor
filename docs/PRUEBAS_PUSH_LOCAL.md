# Cómo probar notificaciones push en local

El error "push service not available" en Chrome con localhost es una limitación del navegador. Para probar push en local, usa una de estas opciones:

---

## Opción 1: ngrok (recomendado)

ngrok expone tu localhost con una URL HTTPS pública. El servidor push de Chrome funciona correctamente con HTTPS.

### 1. Crear cuenta en ngrok (gratis)

1. Ve a https://dashboard.ngrok.com/signup
2. Regístrate

### 2. Obtener tu authtoken

1. Ve a https://dashboard.ngrok.com/get-started/your-authtoken
2. Copia tu authtoken

### 3. Configurar el authtoken

**Windows (PowerShell):**
```powershell
$env:NGROK_AUTHTOKEN = "tu_token_aqui"
```

O añade a `.env.local` (no se sube al repo):
```
NGROK_AUTHTOKEN=tu_token_aqui
```

### 4. Ejecutar

```bash
# Terminal 1: servidor de desarrollo
npm run dev

# Terminal 2: ngrok (con el servidor ya corriendo en 3000)
npm run ngrok
```

ngrok mostrará una URL HTTPS como `https://abc123.ngrok-free.app`. Abre esa URL en el navegador y prueba las notificaciones en Perfil.

---

## Opción 2: Probar en producción

Despliega en Vercel y prueba en la URL de producción.

---

## Opción 3: Variable de entorno (localhost)

Añade a `.env.local`:
```
NEXT_PUBLIC_ENABLE_PUSH_DEV=true
```

Reinicia `npm run dev`. El Service Worker no se desregistrará en localhost.

**Nota**: Chrome en localhost puede seguir mostrando "push service not available" aunque el SW esté activo. En ese caso, usa ngrok o producción.
