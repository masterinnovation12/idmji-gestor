# Fase 3 — Pestaña "Plano" en Labor Ofrenda (lectura)

> Objetivo: nueva pestaña dentro de `/dashboard/ofrenda` que muestra el plano del servicio
> seleccionado con el modo correcto (4/8 bloques) según la configuración de sacos del plan.
> En esta fase el plano es **solo lectura** (la edición llega en Fase 4).

## Cambios

### 1. `OfrendaPageClient.tsx`

- `type Tab = 'plan' | 'personas' | 'exportar' | 'plano'`
- Nueva entrada en `TABS` (icono `Map` de lucide, labelKey `ofrenda.tabs.plano`).
- Contenido bajo `AnimatePresence` como el resto; ancho `max-w-[100%] xl:max-w-7xl`
  (igual que la pestaña Plan, el lienzo necesita espacio).
- `next/dynamic` para `PlanoTab` (evitar cargar el lienzo en las otras pestañas).

### 2. `PlanoTab.tsx` — selector de servicio

- Encabezado con el mes del plan activo + selector de servicio: chips por semana con los
  acentos del módulo (jueves emerald / dom. mañana sky / dom. tarde violet).
- Badge con el modo resuelto: «8 sacos · 8 bloques» / «4 sacos · 4 bloques», leído de
  `ofrenda_planes.sacos_*` vía `resolverModo()` — **nunca hardcodeado**.
- Si `sacos ∉ {4,8}` → banner liquid de aviso (no rompe).
- Si no hay plan generado para el mes → estado vacío con CTA a la pestaña Plan.

### 3. `PlanoCanvas.tsx` — lienzo

- `react-zoom-pan-pinch` (`TransformWrapper`): pinch, wheel zoom al cursor, doble tap,
  botones +/−/Ajustar (toolbar flotante estilo liquid, como el v34 pero con la paleta gold/navy).
- Capas (todas ancladas en coordenadas naturales de la vista — 2D: 1448×1316, 3D: 1024×768 → %):
  1. Fondo: `PlanoSvgTemplo` (modo 4/8) o `PlanoImageBase` según `ofrenda_plano_layouts.fondo`.
  2. Números de bloque (`PlanoBlockLabel`).
  3. Muñequitos (`PlanoFigure`).
  4. Tarjetas (`PlanoCard`): franja color bloque + «N- Ofrendario/Apoyo» + nombre; auto-ancho
     112–170 px y wrap 2 líneas (portar `calcCardWidth`/`wrapText` del v34 a util testeada).
- Badge de ayuda «1 dedo: mover · 2 dedos: zoom» en móvil.

### 4. Datos

- `planoActions.ts`: `getPlanoData(servicioId)` → layout del modo + asignaciones del servicio.
- Nombres mostrados desde `ofrenda_plano_asignaciones` (persona de `ofrenda_plano_personas`
  vía `nombre_snapshot`); vacío → placeholder «Nombre» en gris como el v34.

### 5. i18n y a11y

- Claves nuevas `ofrenda.plano.*` en los diccionarios existentes.
- Lienzo `role="application"` con `aria-label`; lista alternativa accesible (tabla
  bloque/rol/nombre oculta visualmente) para lectores de pantalla.

## Criterios de aceptación

- [ ] Cambiar jueves → domingo mañana alterna 4 ⇄ 8 bloques con animación, sin recarga.
- [ ] Cambiar `sacos_jueves` en `SacosConfigPanel` se refleja en el plano (misma fuente de verdad).
- [ ] USER ve el plano completo sin ningún control de edición.
- [ ] Pan/zoom fluido en iPhone/Android (probar con CDP touch points).
- [ ] Lighthouse: la pestaña Plano no degrada LCP de la página (carga dinámica).

## Estimación

~1,5 días.
