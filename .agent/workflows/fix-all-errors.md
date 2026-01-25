---
description: Corrección automática de todos los errores de TypeScript y Lint del proyecto
---

Este workflow automatiza la detección y limpieza de errores técnicos.

1. Ejecutar el diagnóstico de TypeScript:
// turbo
```powershell
npx tsc --noEmit --pretty false
```

2. Analizar los errores detectados en la salida de consola.

3. Para cada archivo con errores, proceder con la corrección automática:
   a. Leer el archivo afectado.
   b. Corregir la lógica o el tipado basándose en la sugerencia del compilador.
   c. Guardar los cambios.

4. Ejecutar el diagnóstico de ESLint:
// turbo
```powershell
npx eslint . --fix
```

5. Repetir el paso 1 para asegurar que el proyecto está 100% limpio (Zero Tolerance).

6. Reportar el éxito al usuario.
