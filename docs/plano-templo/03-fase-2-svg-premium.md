# Fase 2 — Plano SVG premium generado desde la configuración real de asientos

> **Estado 11/06/2026**: el SVG 2D ya funciona en `herramienta/calibracion.html`
> (`buildSvg()` con asientos reales, púlpito, alfolí y colores por bloque). Queda portarlo
> a React (`PlanoSvgTemplo.tsx` + motor puro `planoLayout.ts`) — se hace dentro de la Fase 3.
> La "Opción A (PNG)" original evolucionó a la **vista 3D** (fotos generadas por IA, una por
> modo 4/8), con coordenadas propias; el toggle final en la app es **2D / 3D**.

> Objetivo: ofrecer la **Opción B**: un plano vectorial del templo dibujado por código a partir
> de la configuración real de columnas/filas/asientos, en lugar de la foto PNG. Es la opción
> recomendada a largo plazo.

## Por qué SVG (vs. PNG)

| | PNG (Opción A) | SVG generado (Opción B) ✅ |
|---|---|---|
| Peso | ~2,9 MB (o re-export optimizado ~300-500 kB WebP) | ~15-30 kB |
| Modo 4 vs 8 bloques | Necesita 2 fotos distintas (o tapar números) | Mismo componente, prop `modo` |
| Números de bloque | Pintados en la foto (no editables) | Elementos SVG editables |
| Muñequitos | Pintados en la foto | Capa propia movible |
| Nitidez en zoom | Pixela | Perfecta a cualquier escala |
| Theming/dark mode | No | Colores por token |
| Cambios futuros (más filas, otro templo) | Re-fotografiar/editar imagen | Cambiar config |

La foto se mantiene como alternativa visual (toggle "Foto / Esquema"), útil mientras el jefe
se acostumbra al cambio.

## Datos de entrada (config declarativa)

```ts
// planoLayout.ts
export const TEMPLO_SABADELL: TemploConfig = {
  id: 'sabadell',
  nombre: 'Templo de Sabadell',
  lienzo: { w: 1448, h: 1316 },   // alto real tras la calibración (antes 1086)
  columnas: [
    { n: 1, filas: 18, asientosPorFila: 8 },   // izquierda
    { n: 2, filas: 20, asientosPorFila: 11 },
    { n: 3, filas: 17, asientosPorFila: 10 },
    { n: 4, filas: 16, asientosPorFila: 8 },   // derecha
  ],
  // Vista desde el púlpito: columnas de derecha a izquierda (col 1 = derecha).
  // Bloque N ↔ columna N; modo 8: secciones delantera/trasera por columna.
  bloques8: [
    { n: 1, columna: 1, seccion: 'delantera' }, { n: 2, columna: 2, seccion: 'delantera' },
    { n: 3, columna: 3, seccion: 'delantera' }, { n: 4, columna: 4, seccion: 'delantera' },
    { n: 5, columna: 1, seccion: 'trasera' },   { n: 6, columna: 2, seccion: 'trasera' },
    { n: 7, columna: 3, seccion: 'trasera' },   { n: 8, columna: 4, seccion: 'trasera' },
  ],
  bloques4: [
    { n: 1, columna: 1 }, { n: 2, columna: 2 }, { n: 3, columna: 3 }, { n: 4, columna: 4 },
  ],
}
```

El SVG dibuja la columna 1 en el borde derecho del lienzo y la 4 en el izquierdo.

## Diseño visual del SVG (premium)

- **Proyección**: vista cenital ligeramente isométrica (skew sutil tipo 2.5D) o cenital pura —
  se presentarán ambas variantes para elegir; la cenital pura es más legible en móvil.
- **Asientos**: cada asiento un `<rect rx>` 2.5D con gradiente del color del bloque +
  separación entre filas; renderizado con `<pattern>`/`<use>` para mantener el DOM ligero
  (662 asientos → 4 `<defs>` reutilizados, no 662 nodos arbitrarios).
- **Bloques**: en modo 8, cada columna se divide visualmente en sección delantera/trasera con
  los 8 colores del prototipo; en modo 4, la columna completa con un único color (paleta de 4).
- **Pasillos**, tarima, **púlpito** (madera con gradiente), flores estilizadas, almacén
  "alfolid", puertas — mismos hitos que la foto para que sea reconocible.
- **Números de bloque**: `<g>` circular con número — elemento de la capa editable (no del fondo).
- **Muñequitos**: silueta SVG premium (cabeza+torso redondeados, color del bloque, halo blanco
  y sombra) — capa editable, NO parte del fondo.
- Filtros sutiles: `feDropShadow` en bloques y púlpito; sin filtros pesados (rendimiento móvil).
- Etiquetas de columna (1–4) y contador de asientos opcional como tooltip.

## Entregables

1. `PlanoSvgTemplo.tsx` — componente React `(config, modo, theme) → SVG`, memoizado.
2. Motor puro `planoLayout.ts` con geometría calculada (posiciones de columnas/filas/anchors
   por bloque) — 100 % testeable sin DOM.
3. Preview integrada también en la herramienta de calibración (Fase 1).
4. Mini-página de comparación A/B (PNG vs SVG) para que el jefe elija.

## Criterios de aceptación

- [ ] 662 asientos correctos: 18×8, 20×11, 17×10, 16×8.
- [ ] Cambio modo 4 ⇄ 8 sin recargar, con animación de color suave.
- [ ] Render < 16 ms en móvil medio (DOM SVG acotado, `<use>`).
- [ ] Anchors por bloque expuestos (donde "nacen" muñequito y tarjeta por defecto).
- [ ] Visualmente comparable o superior a la foto (validación del jefe).

## Estimación

~1 día (incluye iteración visual).
