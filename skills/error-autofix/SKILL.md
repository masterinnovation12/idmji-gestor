# Skill: Auto-Fix Errors

Esta skill otorga al agente la capacidad y obligación de detectar y corregir automáticamente cualquier error técnico en el proyecto (TypeScript, Lint, Build).

## 🚀 Propósito
Garantizar que el repositorio siempre se mantenga en un estado "verde" (sin errores), eliminando la carga cognitiva del usuario de tener que reportar fallos triviales de sintaxis o tipos.

## 🛠️ Herramientas de Diagnóstico
El agente debe ejecutar estos comandos siempre que realice cambios significativos:
- `npx tsc --noEmit`: Para validar tipos de TypeScript.
- `npx eslint . --fix`: Para validar y auto-corregir problemas de estilo y mejores prácticas.
- `npm run dev`: Para verificar errores de runtime en la consola.

## 📋 Protocolo de Actuación
1. **Detección Proactiva**: Tras cada edición de código, el agente debe considerar si el cambio afecta a otros archivos y ejecutar un chequeo rápido.
2. **Ciclo de Corrección**:
   - Analizar el mensaje de error (archivo, línea, código de error).
   - Localizar el origen del problema.
   - Aplicar la corrección usando `replace_file_content` o `multi_replace_file_content`.
   - Verificar la corrección ejecutando el diagnóstico de nuevo.
3. **Mantenimiento de Tipos**: Si una corrección requiere actualizar una interfaz global, el agente debe buscar todas las dependencias y actualizarlas en cascada.

## 🧠 Guía de Resolución Común
- **TS2322 (Type Incompatibility)**: Verificar interfaces en `src/types/database.ts` o componentes UI.
- **TS2345 (Argument mismatch)**: Añadir comprobaciones de nulidad o cast de tipos (si es seguro).
- **ESLint (Unused vars)**: Eliminar o prefijar con `_` si son necesarias para el futuro.
- **ESLint (Any)**: Intentar tipar correctamente antes de usar `any`.

## ⚠️ Restricción
No ignorar errores con `@ts-ignore` o `any` a menos que sea estrictamente necesario debido a una limitación de la librería externa y se haya agotado el análisis de tipos.
