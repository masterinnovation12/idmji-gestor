# Fase 5 — Export, responsive premium y pulido

> Objetivo: exportación PNG/PDF del plano con nombres, comportamiento impecable en
> desktop/tablet/móvil y pulido final (dark mode, i18n, branding).

## 1. Export

- **PNG 2×**: canvas dedicado que redibuja fondo (SVG serializado o PNG) + números +
  muñequitos + tarjetas — fidelidad total como el v34, pero con la fuente Inter del proyecto
  (corrige hallazgo H8) y el branding de export existente (`exportBrand.ts`: cabecera dorada
  con fecha del servicio y tipo de culto).
- **PDF**: vía `jspdf` (ya instalada), A4 apaisado, mismo pipeline que `ExportPanel`.
- Nombre de archivo: `plano-ofrenda-sabadell-YYYY-MM-DD-<turno>.png`.
- Punto de entrada doble: botón en la pestaña Plano + tarjeta nueva en la pestaña Exportar
  (consistencia con el flujo de export actual del módulo).

## 2. Responsive (matriz de soporte)

| Breakpoint | Layout |
|---|---|
| ≥1280 (desktop) | Grid lienzo + editor lateral 410 px; toolbar superior completa |
| 768–1279 (tablet) | Lienzo full-width; editor en panel deslizante derecho; toolbar compacta |
| <768 (móvil) | Lienzo fullscreen-height (`100dvh` − header − tabs, `safe-area-inset`); editor bottom-sheet; toolbar grid táctil ≥44 px; badge de gestos |

- Gestos móviles: 1 dedo pan, 2 dedos pinch (`react-zoom-pan-pinch`), drag de elementos con
  pointer capture sin conflicto con el pan.
- `prefers-reduced-motion` respetado (ya es regla global del prototipo y del proyecto).
- Probar coexistencia con `useWeekSwipe` (no debe activarse dentro del lienzo).

## 3. Pulido premium

- Micro-interacciones framer-motion: hover/active de tarjetas, transición 4 ⇄ 8 bloques con
  crossfade de color, entrada de la pestaña con `motion.div` como las demás.
- Skeleton de carga liquid (shimmer dorado) mientras llega `getPlanoData`.
- Dark mode: chrome (toolbar, editor, sheets) con tokens `dark:`; lienzo con superficie clara
  controlada (patrón `ofrenda-liquid-surface`).
- i18n completa (`ofrenda.plano.*`) en todos los idiomas del diccionario existente.
- Estados vacíos ilustrados (sin plan / sacos no soportados / sin permisos).

## Criterios de aceptación

- [ ] Export PNG idéntico a pantalla (mismos anchos de tarjeta, wrap, colores, Inter).
- [ ] PDF A4 apaisado legible impreso en B/N (contraste de números suficiente).
- [ ] iPhone SE (375 px), iPad (768/1024) y desktop 1440 verificados con capturas.
- [ ] Sin scroll-bleed ni zoom de página al hacer pinch en iOS (`touch-action` correcto).
- [ ] Dark mode sin flashes ni texto ilegible.

## Estimación

~1,5 días.
