# Wrapper para GitHub CLI solo en este proyecto.
# Uso: .\gh.ps1 auth status | .\gh.ps1 pr list | etc.
$ghExe = Join-Path $PSScriptRoot ".tools\gh-cli\bin\gh.exe"
if (-not (Test-Path $ghExe)) {
    Write-Error "GitHub CLI no encontrado en .tools\gh-cli. Ejecuta el script de instalacion del proyecto."
    exit 1
}
& $ghExe @args
