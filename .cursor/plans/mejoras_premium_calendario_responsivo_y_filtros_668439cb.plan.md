---
name: Mejoras Premium Calendario Responsivo y Filtros
overview: Optimización del calendario para tabletas, implementación de filtros por hermanos y visualización detallada de asignaciones en las tarjetas del calendario.
todos:
  - id: responsive-update-xl
    content: Actualizar breakpoints en Calendar.tsx para optimización en tabletas
    status: completed
  - id: filter-hermanos-ui
    content: Implementar estado y UI de filtro por hermanos en CultosPageClient.tsx
    status: completed
  - id: modal-hermanos-select
    content: Crear modal de selección de hermanos con búsqueda y multiselección
    status: completed
  - id: filter-logic-hermanos
    content: Actualizar lógica de filtrado de cultos por hermanos seleccionados
    status: completed
  - id: card-asignaciones-display
    content: Rediseñar tarjetas de calendario para mostrar hermanos asignados en escritorio
    status: completed
  - id: card-full-size-desktop
    content: Hacer que la tarjeta del evento ocupe el 100% del cuadro del día en escritorio
    status: completed
---

# Plan de Mejoras Premium para el Calendario de Cultos

Este plan aborda la optimización responsiva para dispositivos intermedios (tabletas), la implementación de un sistema de filtrado por hermanos y la mejora visual de las tarjetas de cultos en la vista de escritorio.

## 1. Adaptación Responsiva Premium ✅ COMPLETADO

Se ajustarán los puntos de ruptura para evitar que la cuadrícula del calendario se vea comprimida en pantallas de tamaño mediano (tabletas).

- ✅ En `web/src/components/Calendar.tsx`, se cambió el umbral de visualización de la cuadrícula de `md` (768px) a `xl` (1280px). (Línea 191: `hidden xl:block`)
- ✅ Las pantallas entre 768px y 1280px muestran la vista de lista optimizada, garantizando una legibilidad perfecta. (Línea 316: `xl:hidden`)

## 2. Filtro Avanzado por Hermanos ✅ COMPLETADO

Se añadirá la capacidad de filtrar cultos según los hermanos asignados a las diferentes labores.

- ✅ En `web/src/app/dashboard/cultos/CultosPageClient.tsx`:
    - ✅ Se implementó el estado `selectedHermanos` para almacenar los IDs de los perfiles seleccionados. (Línea 61)
    - ✅ Se añadió un botón "Hermanos" en el panel de filtros con contador de seleccionados. (Líneas 438-450)
    - ✅ Se creó un modal interactivo para seleccionar uno o varios hermanos, utilizando la acción `getHermanos`. (Líneas 534-638)
    - ✅ Se actualizó la lógica de `filteredCultos` para incluir cultos donde cualquiera de los hermanos seleccionados esté asignado (intro, enseñanza, finalización o testimonios). (Líneas 162-169)

## 3. Visualización Detallada de Asignaciones ✅ COMPLETADO

Las tarjetas del calendario en modo escritorio mostrarán quién está a cargo de cada labor de forma elegante.

- ✅ En `web/src/components/Calendar.tsx`:
    - ✅ Se rediseñó la tarjeta interna del evento para que ocupe el 100% del espacio del día (`h-full`, `w-full`). (Líneas 240-242)
    - ✅ Se añadió una sección de "Asignaciones" que muestra:
        - **Intro:** Nombre del hermano. (Líneas 278-281)
        - **Enseñanza:** Nombre del hermano (con icono de libro `BookOpen`). (Líneas 283-287)
        - **Finalización:** Nombre del hermano. (Líneas 289-292)
    - ✅ Se utilizan fuentes más pequeñas y compactas (`text-[10px]`) para asegurar que la información quepa sin saturar el diseño.
    - ✅ Se mantiene el centrado perfecto y los colores de estado (verde para completos, beige para festivos) ya implementados.

## 4. Pruebas y Verificación ✅ COMPLETADO

- ✅ Uso de `@Browser` para validar el comportamiento:
    - ✅ Servidor verificado en `http://localhost:3000`
    - ✅ Aplicación cargando correctamente sin errores
    - ✅ Variables de entorno de Supabase configuradas correctamente
    - ✅ Todas las funcionalidades implementadas y funcionando