# Guía para Iniciar el Servidor de Desarrollo

## 🚀 Inicio Rápido

### Opción 1: Usar el Script PowerShell (Recomendado)

```powershell
.\start-dev-server.ps1
```

Este script:
- ✅ Verifica que estés en el directorio correcto
- ✅ Comprueba si el puerto 3000 está en uso
- ✅ Inicia el servidor de forma confiable
- ✅ Muestra instrucciones claras

### Opción 2: Comando Directo

```powershell
npm run dev
```

O usando npx:

```powershell
npx next dev
```

## ⚙️ Configuración

### Puerto Personalizado

Si necesitas usar otro puerto (por ejemplo, 3001):

```powershell
$env:PORT=3001; npm run dev
```

O crear un archivo `.env.local`:

```
PORT=3001
```

## 🔍 Verificación

### Verificar que el servidor está corriendo:

```powershell
# Verificar puerto
netstat -ano | Select-String -Pattern ":3000.*LISTENING"

# Verificar respuesta HTTP
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

### Ver procesos de Node:

```powershell
Get-Process -Name node
```

## 🛑 Detener el Servidor

### Desde la terminal donde está corriendo:
- Presiona `Ctrl + C`

### Desde otra terminal:

```powershell
# Detener todos los procesos de Node
Get-Process -Name node | Stop-Process -Force

# O detener un proceso específico por ID
Stop-Process -Id <PID> -Force
```

## ⚠️ Problemas Comunes

### 1. Puerto 3000 en uso

**Solución:**
```powershell
# Ver qué proceso usa el puerto
netstat -ano | Select-String -Pattern ":3000"

# Detener el proceso (reemplaza <PID> con el ID del proceso)
Stop-Process -Id <PID> -Force
```

### 2. El servidor no inicia

**Verificaciones:**
- ✅ ¿Estás en el directorio correcto? (`c:\idmji-gestor`)
- ✅ ¿Están instaladas las dependencias? (`npm install`)
- ✅ ¿Hay errores en la consola?

**Solución:**
```powershell
# Limpiar y reinstalar
Remove-Item -Recurse -Force node_modules, .next -ErrorAction SilentlyContinue
npm install
npm run dev
```

### 3. Compilación muy lenta

**Primera compilación:** Puede tardar 2-5 minutos
**Compilaciones siguientes:** Deberían ser más rápidas (30-60 segundos)

**Acelerar:**
- Cierra otras aplicaciones que usen recursos
- Asegúrate de tener suficiente RAM disponible

## 📝 Notas

- El servidor usa **Turbopack** por defecto (Next.js 16.0.7)
- Los cambios en el código se recargan automáticamente (Hot Module Replacement)
- El servidor se inicia en modo desarrollo con todas las optimizaciones deshabilitadas

## 🔗 URLs Importantes

- **Aplicación:** http://localhost:3000
- **Dashboard:** http://localhost:3000/dashboard
- **Login:** http://localhost:3000/login

## 📚 Comandos Útiles

```powershell
# Ver logs en tiempo real
npm run dev

# Build de producción (para probar)
npm run build
npm start

# Limpiar caché
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```
