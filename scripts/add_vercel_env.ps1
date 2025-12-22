# Script para añadir variables de entorno a Vercel usando la API
# Requiere: Token de Vercel (obtener de https://vercel.com/account/tokens)

param(
    [Parameter(Mandatory=$true)]
    [string]$VercelToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "prj_cOghTJRDQQijZApUoSxJBJQSw6C1",
    
    [Parameter(Mandatory=$false)]
    [string]$TeamId = "team_hn64tc8bCRGPKr0ZEDkeo58Z"
)

$ErrorActionPreference = "Stop"

# Variables de entorno a añadir
$envVars = @(
    @{
        key = "NEXT_PUBLIC_SUPABASE_URL"
        value = "https://dcjqjsmyydqpsmxbkhya.supabase.co"
        type = "plain"
        target = @("production", "preview", "development")
    },
    @{
        key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzQ3MTUsImV4cCI6MjA4MDM1MDcxNX0.AQ-K6u8zxwREbrr_I7Lcfa8OQsUAUIYafzA4jGFs5ec"
        type = "plain"
        target = @("production", "preview", "development")
    },
    @{
        key = "SUPABASE_SERVICE_ROLE_KEY"
        value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc3NDcxNSwiZXhwIjoyMDgwMzUwNzE1fQ.ZsO4uTR-dW7KMtI553zLUyQam1hRcAa5QJXRzox3qMo"
        type = "sensitive"
        target = @("production", "preview", "development")
    },
    @{
        key = "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
        value = "BEeyLGjKHt_LpMMvsD7_63UIvVktANK2wN48bMrSA9L0goyoEbpxhL1xCN62c3PvwzamOmgCABglrcGxUk"
        type = "plain"
        target = @("production", "preview", "development")
    },
    @{
        key = "VAPID_PRIVATE_KEY"
        value = "_K5mDScV2Cq069tU2la"
        type = "sensitive"
        target = @("production", "preview", "development")
    },
    @{
        key = "VAPID_SUBJECT"
        value = "mailto:admin@idmji.org"
        type = "plain"
        target = @("production", "preview", "development")
    }
)

$baseUrl = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type" = "application/json"
}

Write-Host "🚀 Añadiendo variables de entorno a Vercel..." -ForegroundColor Cyan
Write-Host "Proyecto: $ProjectId" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($envVar in $envVars) {
    Write-Host "📝 Añadiendo: $($envVar.key)..." -ForegroundColor White
    
    $body = @{
        key = $envVar.key
        value = $envVar.value
        type = $envVar.type
        target = $envVar.target
    } | ConvertTo-Json
    
    try {
        $url = "$baseUrl/v10/projects/$ProjectId/env"
        if ($TeamId) {
            $url += "?teamId=$TeamId"
        }
        
        $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body
        
        Write-Host "   ✅ $($envVar.key) añadida correctamente" -ForegroundColor Green
        $successCount++
    }
    catch {
        $errorMessage = $_.Exception.Message
        if ($_.ErrorDetails.Message) {
            $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json | Select-Object -ExpandProperty error -ErrorAction SilentlyContinue
        }
        
        if ($errorMessage -like "*already exists*" -or $errorMessage -like "*duplicate*") {
            Write-Host "   ⚠️  $($envVar.key) ya existe (se omitirá)" -ForegroundColor Yellow
        }
        else {
            Write-Host "   ❌ Error: $errorMessage" -ForegroundColor Red
            $errorCount++
        }
    }
    
    Write-Host ""
}

Write-Host "=" * 60
Write-Host "📊 Resumen:" -ForegroundColor Cyan
Write-Host "   ✅ Añadidas: $successCount" -ForegroundColor Green
Write-Host "   ❌ Errores: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "✨ ¡Todas las variables se añadieron correctamente!" -ForegroundColor Green
    Write-Host "💡 El próximo deployment debería funcionar correctamente." -ForegroundColor Yellow
}
else {
    Write-Host "⚠️  Algunas variables no se pudieron añadir. Revisa los errores arriba." -ForegroundColor Yellow
}

