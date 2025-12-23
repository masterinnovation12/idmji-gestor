# Reglas y Estándares del Proyecto IDMJI Gestor de Púlpito

Este documento establece las reglas y estándares que deben seguirse en el desarrollo del proyecto.

## 📋 Índice

1. [Internacionalización (i18n)](#internacionalización-i18n)
2. [Gestión de Errores](#gestión-de-errores)
3. [Optimización y Refactorización](#optimización-y-refactorización)
4. [Documentación](#documentación)
5. [Convenciones de Código](#convenciones-de-código)

---

## 🌍 Internacionalización (i18n)

### Regla 1: Textos siempre en dos idiomas

**OBLIGATORIO:** Todos los textos visibles para el usuario deben estar en español (ES) y catalán (CA).

#### Implementación:

1. **Nunca hardcodear textos** directamente en los componentes
2. **Usar siempre el sistema de traducciones** en `web/src/lib/i18n/translations.ts`
3. **Agregar traducciones** en ambos idiomas simultáneamente

#### Ejemplo Correcto:

```typescript
// ✅ CORRECTO
const { t } = useI18n()
<h1>{t('himnario.title')}</h1>

// En translations.ts
'es-ES': {
    'himnario.title': 'Himnario y Coros',
},
'ca-ES': {
    'himnario.title': 'Himnari i Cors',
}
```

#### Ejemplo Incorrecto:

```typescript
// ❌ INCORRECTO
<h1>Himnario y Coros</h1> // Texto hardcodeado
```

#### Checklist:

- [ ] ¿El texto está en `translations.ts`?
- [ ] ¿Existe la traducción en ES y CA?
- [ ] ¿Se usa `t('key')` en el componente?

---

## 🐛 Gestión de Errores

### Regla 2: Corregir siempre errores

**OBLIGATORIO:** Todos los errores deben ser corregidos antes de hacer commit.

#### Tipos de errores a corregir:

1. **Errores de TypeScript/JavaScript**
   - Errores de compilación
   - Warnings críticos
   - Errores de tipos

2. **Errores de Linter**
   - ESLint errors
   - Prettier formatting
   - Reglas de estilo

3. **Errores de Runtime**
   - Errores en consola del navegador
   - Errores de API
   - Errores de validación

4. **Errores de Build**
   - Errores de compilación en producción
   - Errores de Vercel deployment

#### Proceso:

1. **Detectar** el error (consola, linter, build)
2. **Investigar** la causa raíz
3. **Corregir** el error
4. **Verificar** que no hay regresiones
5. **Probar** en desarrollo y producción

#### Checklist:

- [ ] ¿No hay errores en la consola?
- [ ] ¿El linter pasa sin errores?
- [ ] ¿El build se completa exitosamente?
- [ ] ¿Se probó en navegador?

---

## ⚡ Optimización y Refactorización

### Regla 3: Optimizar y refactorizar código

**OBLIGATORIO:** El código debe ser optimizado y refactorizado continuamente.

#### Principios de optimización:

1. **Performance**
   - Evitar re-renders innecesarios
   - Usar `useMemo` y `useCallback` cuando sea apropiado
   - Lazy loading de componentes pesados
   - Optimización de imágenes

2. **Código limpio**
   - Funciones pequeñas y específicas
   - Eliminar código duplicado (DRY)
   - Nombres descriptivos
   - Separación de responsabilidades

3. **Estructura**
   - Componentes reutilizables
   - Hooks personalizados para lógica compartida
   - Servicios para lógica de negocio
   - Utilidades en archivos separados

#### Cuándo refactorizar:

- ✅ Cuando encuentras código duplicado
- ✅ Cuando una función es muy larga (>50 líneas)
- ✅ Cuando un componente tiene demasiadas responsabilidades
- ✅ Cuando el código es difícil de entender
- ✅ Cuando hay oportunidades de optimización

#### Checklist:

- [ ] ¿El código es fácil de leer y entender?
- [ ] ¿Hay código duplicado que se pueda extraer?
- [ ] ¿Los componentes son reutilizables?
- [ ] ¿El rendimiento es óptimo?

---

## 📚 Documentación

### Regla 4: Documentar código siempre en español de España

**OBLIGATORIO:** Todo el código debe estar documentado en español de España.

#### Tipos de documentación:

1. **Comentarios en código**
   ```typescript
   /**
    * Calcula la duración total de una lista de himnos y coros.
    * 
    * @param items - Array de himnos y coros con duración en segundos
    * @returns Duración total en formato MM:SS
    */
   function calcularDuracionTotal(items: (Himno | Coro)[]): string {
       // Implementación...
   }
   ```

2. **Documentación de componentes**
   ```typescript
   /**
    * Componente para mostrar el catálogo de himnos y coros.
    * 
    * Características:
    * - Búsqueda en tiempo real
    * - Filtrado por tipo (Himnos/Coros)
    * - Calculadora de tiempo integrada
    * 
    * @param initialHimnos - Lista inicial de himnos
    * @param initialCoros - Lista inicial de coros
    * @param counts - Contadores de himnos y coros
    */
   export default function HimnarioClient({ ... }: Props) {
       // Implementación...
   }
   ```

3. **Documentación de funciones complejas**
   ```typescript
   /**
    * Maneja el proceso de autenticación del usuario.
    * 
    * Flujo:
    * 1. Valida las credenciales
    * 2. Autentica con Supabase
    * 3. Crea la sesión
    * 4. Redirige al dashboard
    * 
    * @throws {Error} Si las credenciales son inválidas
    */
   async function handleLogin(email: string, password: string) {
       // Implementación...
   }
   ```

#### Estándares de documentación:

- ✅ Usar español de España (no latinoamericano)
- ✅ Explicar el "qué" y el "por qué", no solo el "cómo"
- ✅ Documentar parámetros y valores de retorno
- ✅ Incluir ejemplos cuando sea necesario
- ✅ Actualizar la documentación cuando cambie el código

#### Checklist:

- [ ] ¿Las funciones complejas están documentadas?
- [ ] ¿Los componentes tienen JSDoc?
- [ ] ¿Los comentarios explican el propósito?
- [ ] ¿La documentación está en español de España?

---

## 💻 Convenciones de Código

### Nomenclatura:

- **Componentes:** PascalCase (`HimnarioClient.tsx`)
- **Funciones:** camelCase (`calcularDuracion`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_HIMNOS`)
- **Variables:** camelCase (`isLoading`)
- **Archivos:** PascalCase para componentes, camelCase para utilidades

### Estructura de archivos:

```
src/
├── app/              # Rutas y páginas (Next.js App Router)
├── components/        # Componentes reutilizables
├── lib/              # Utilidades y configuraciones
│   ├── i18n/         # Sistema de traducciones
│   ├── supabase/     # Cliente de Supabase
│   └── theme/        # Sistema de temas
├── types/            # Definiciones de TypeScript
└── hooks/             # Custom hooks
```

### Imports:

```typescript
// 1. Imports de React/Next.js
import React from 'react'
import { useState } from 'react'
import Link from 'next/link'

// 2. Imports de librerías externas
import { motion } from 'framer-motion'

// 3. Imports internos (componentes)
import { Card } from '@/components/ui/Card'

// 4. Imports internos (utilidades)
import { useI18n } from '@/lib/i18n/I18nProvider'

// 5. Imports de tipos
import { Himno, Coro } from '@/types/database'
```

---

## ✅ Checklist Pre-Commit

Antes de hacer commit, verificar:

- [ ] Todos los textos están en ES y CA
- [ ] No hay errores de TypeScript/JavaScript
- [ ] No hay errores de linter
- [ ] El código está optimizado y refactorizado
- [ ] El código está documentado en español de España
- [ ] Se probó en el navegador
- [ ] El build se completa sin errores

---

## 📝 Notas Adicionales

- Estas reglas son **obligatorias** para todo el código nuevo
- El código existente debe migrarse gradualmente a estos estándares
- En caso de duda, priorizar claridad y mantenibilidad
- Revisar este documento periódicamente y actualizarlo según sea necesario

---

**Última actualización:** 2024-12-18
**Versión:** 1.0.0

