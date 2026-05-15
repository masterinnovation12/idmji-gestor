---
description: Build completo + corrección iterativa + publicación en main y retorno a desarrollo
---

Workflow para publicar cambios a producción de forma segura y repetible.

## Objetivo

1) Ejecutar build web completo.
2) Corregir cualquier error que aparezca.
3) Repetir build hasta pasar sin errores.
4) Guardar cambios local/remoto en rama actual.
5) Merge a `main` y push de `main`.
6) Volver a `desarrollo`.

## Pasos

1. Verificar rama actual y estado:
```powershell
git branch --show-current
git status --short
```

2. Ejecutar build completo:
```powershell
npm run build
```

3. Si falla el build:
   - Analizar errores de salida.
   - Corregir código/ajustes necesarios.
   - Volver a ejecutar:
```powershell
npm run build
```
   - Repetir hasta que pase 100% sin errores.

4. Validación mínima recomendada antes de publicar:
```powershell
npm run lint
```

5. Commit y push en rama actual (normalmente `desarrollo`):
```powershell
git add .
git commit -m "fix: <resumen breve del cambio>"
git push origin HEAD
```

6. Sincronizar y publicar en `main`:
```powershell
git checkout main
git pull origin main
git merge desarrollo
git push origin main
```

7. Regresar a rama de trabajo:
```powershell
git checkout desarrollo
git status --short
```

## Criterio de éxito

- `npm run build` pasa sin errores.
- Cambios commiteados y subidos en rama de trabajo.
- Merge aplicado en `main` y push exitoso.
- Sesión finaliza en `desarrollo` con árbol limpio.
