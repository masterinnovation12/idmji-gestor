# Script para iniciar el servidor de desarrollo Next.js
# Uso: .\start-dev-server.ps1

Write-Host "🚀 Iniciando servidor de desarrollo Next.js..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio del proyecto." -ForegroundColor Red
    exit 1
}

# Detener procesos de Node existentes (opcional, descomentar si es necesario)
# Write-Host "Deteniendo procesos de Node existentes..." -ForegroundColor Yellow
# Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
# Start-Sleep -Seconds 2

# Verificar si el puerto 3000 está en uso
$portInUse = netstat -ano | Select-String -Pattern ":3000.*LISTENING"
if ($portInUse) {
    Write-Host "⚠️  El puerto 3000 ya está en uso." -ForegroundColor Yellow
    Write-Host "   Si quieres usar otro puerto, edita este script y cambia el puerto." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "¿Deseas detener el proceso que usa el puerto 3000? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        $pid = ($portInUse -split '\s+')[-1]
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Proceso detenido. Reiniciando servidor..." -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "❌ No se puede iniciar el servidor. El puerto está en uso." -ForegroundColor Red
        exit 1
    }
}

# Iniciar el servidor
Write-Host "📦 Ejecutando: npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ El servidor está iniciando..." -ForegroundColor Yellow
Write-Host "   Esto puede tardar 30-60 segundos en la primera compilación." -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Una vez listo, abre: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor." -ForegroundColor Gray
Write-Host ""

# Ejecutar npm run dev
npm run dev
