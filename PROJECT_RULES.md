# Reglas del Proyecto - IDMJI Gestor de Púlpito

## 📋 Reglas Generales

### 1. Documentación Obligatoria
- **TODOS** los archivos nuevos deben incluir documentación en **español de España**
- Comentarios claros y concisos al inicio de cada archivo explicando su propósito
- Funciones y componentes complejos deben tener comentarios JSDoc
- Variables y constantes importantes deben estar documentadas

### 2. Idioma del Código
- Comentarios y documentación: **Español de España**
- Nombres de variables, funciones y componentes: **Inglés** (convención estándar)
- Mensajes de error y logs: **Español**
- Texto de UI: **Multiidioma** (ES/CA) usando sistema i18n

### 3. Refactorización y Optimización Continua
- **Optimización Preventiva**: Todo código nuevo debe ser analizado para buscar la implementación más eficiente.
- **Refactorización Obligatoria**: Antes de dar por terminada una tarea, el código debe ser refactorizado para eliminar redundancias y mejorar la legibilidad.
- **Mantenibilidad**: Diseñar pensando en el futuro. Usar patrones de diseño claros y evitar soluciones "parche" (hacks).
- **Código Limpio (Clean Code)**: Aplicar principios SOLID. Mantener componentes pequeños y enfocados (Single Responsibility).
- **DRY (Don't Repeat Yourself)**: Extraer lógica repetida en funciones helper o hooks personalizados.
- **Estructura Robusta**: Seguir estrictamente la jerarquía de carpetas para evitar el caos arquitectónico.

### 4. Testing y Validación
- Cada feature nueva debe ser probada en navegador
- Verificar DevTools Console para errores
- Probar responsive en móvil, tablet y desktop
- Validar accesibilidad básica (contraste, navegación por teclado)
- Verificar que funcione en modo oscuro y claro

### 5. Estructura de Archivos
```
src/
├── app/              # Rutas de Next.js App Router
├── components/       # Componentes reutilizables
│   ├── ui/          # Componentes de UI base
│   └── ...          # Componentes específicos
├── lib/             # Utilidades y helpers
│   ├── supabase/   # Cliente Supabase
│   ├── i18n/       # Internacionalización
│   └── theme/      # Sistema de temas
├── hooks/           # Custom hooks
└── types/           # Tipos TypeScript
```

### 6. Convenciones de Nombres
- **Componentes**: PascalCase (ej: `UserSelector.tsx`)
- **Funciones**: camelCase (ej: `handleSubmit`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `DIAS_CULTO`)
- **Archivos de utilidades**: kebab-case (ej: `use-debounce.ts`)
- **Server Actions**: camelCase con prefijo descriptivo (ej: `getCultosForMonth`)

### 7. Dependencias de Supabase
- **TODOS** los textos configurables deben venir de `app_config`
- **NO** hardcodear textos como nombres de iglesia, ubicación, etc.
- Usar Supabase para:
  - Configuración de la app
  - Datos de usuarios
  - Contenido dinámico
  - Imágenes (Supabase Storage)

### 8. Estilo y Diseño
- Usar colores del logo IDMJI (azul #4A90E2)
- Aplicar glassmorphism en cards y modales
- Incluir animaciones suaves con Framer Motion
- Responsive mobile-first
- Modo oscuro obligatorio
- Accesibilidad (WCAG 2.1 AA mínimo)

### 9. Performance
- Lazy loading de componentes pesados
- Optimización de imágenes con Next.js Image
- Debounce en búsquedas y inputs
- Memoización de componentes costosos
- Server Components por defecto, Client Components solo cuando necesario

### 10. Seguridad
- Row Level Security (RLS) en todas las tablas de Supabase
- Validación de datos en servidor (Server Actions)
- Sanitización de inputs
- No exponer claves sensibles en cliente
- HTTPS obligatorio en producción

## 🔄 Workflow de Desarrollo

### Al crear un archivo nuevo:
1. ✅ Añadir comentario de documentación en español al inicio
2. ✅ Seguir convenciones de nombres
3. ✅ Implementar funcionalidad
4. ✅ Refactorizar código duplicado
5. ✅ Probar en navegador
6. ✅ Verificar DevTools (sin errores)
7. ✅ Validar responsive
8. ✅ Commit con mensaje descriptivo en español

### Al modificar un archivo existente:
1. ✅ Leer documentación existente
2. ✅ Entender el propósito del código
3. ✅ Hacer cambios mínimos necesarios
4. ✅ Actualizar documentación si aplica
5. ✅ Refactorizar si es necesario
6. ✅ Probar cambios
7. ✅ Verificar que no rompe funcionalidad existente

## 📝 Template de Documentación

```typescript
/**
 * [Nombre del Componente/Función] - IDMJI Gestor de Púlpito
 * 
 * Descripción breve de qué hace este archivo.
 * 
 * Características:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 * 
 * @example
 * // Ejemplo de uso si aplica
 * 
 * @author Antigravity AI
 * @date 2025-12-05
 */
```

## 🎯 Prioridades

1. **Funcionalidad**: El código debe funcionar correctamente
2. **Mantenibilidad**: Código limpio y documentado
3. **Performance**: Optimizado pero no prematuramente
4. **UX**: Experiencia de usuario fluida y moderna
5. **Accesibilidad**: Usable por todos

## ⚠️ Prohibido

- ❌ Hardcodear textos configurables
- ❌ Código sin documentar
- ❌ Duplicación de código
- ❌ Commits sin probar
- ❌ Ignorar errores de consola
- ❌ Romper responsive
- ❌ Olvidar modo oscuro
- ❌ Exponer datos sensibles

## ✅ Recomendado

- ✅ Usar TypeScript estricto
- ✅ Componentes pequeños y reutilizables
- ✅ Server Components cuando sea posible
- ✅ Optimistic UI updates
- ✅ Loading states y error boundaries
- ✅ Animaciones sutiles y elegantes
- ✅ Feedback visual al usuario
- ✅ Logs descriptivos en desarrollo
- ✅ **Tolerancia Cero a Errores**: Antes de finalizar cualquier tarea, es OBLIGATORIO ejecutar `npx tsc --noEmit` y `npx eslint .`. Cualquier error detectado DEBE ser corregido inmediatamente. No se permite la entrega de código con errores de compilación o linting.

## 🛠️ Regla de Auto-Corrección (Antigravity Skill)
- Siempre que se detecte un error de TypeScript, Lint o lógica durante el desarrollo, el agente (Antigravity) tiene la instrucción mandatoria de analizarlo y aplicar la corrección automáticamente antes de reportar el progreso al usuario.
- El agente debe usar las herramientas de diagnóstico (`tsc`, `eslint`, `run_command`) proactivamente sin esperar a que el usuario lo solicite después de cada modificación significativa.

---

**Última actualización**: 2025-12-05  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo IDMJI
