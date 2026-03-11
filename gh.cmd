@echo off
REM Wrapper para GitHub CLI solo en este proyecto.
REM Uso: gh.cmd auth status | gh.cmd pr list | etc.
set "GH_EXE=%~dp0.tools\gh-cli\bin\gh.exe"
if not exist "%~dp0.tools\gh-cli\bin\gh.exe" (
    echo GitHub CLI no encontrado en .tools\gh-cli
    exit /b 1
)
"%GH_EXE%" %*
