# Fase 1 — Herramienta temporal de calibración (HTML standalone) ✅ COMPLETADA

> **Estado 11/06/2026: COMPLETADA.** La herramienta evolucionó más allá de lo planificado:
> schema **v3** con vistas **2D** (SVG, lienzo 1448×1316) y **3D** (fotos IA 1024×768,
> una por modo) con coordenadas independientes, púlpito y alfolí editables en 2D, sliders de
> layout en vivo, derivación 4←8 sacos, captura PNG multilínea y migración automática
> localStorage v2→v3. Calibración oficial del usuario exportada en
> `plano-calibracion-default.json` (2026-06-11T13:47:19.316Z). Tests Vitest de geometría y
> schema en `herramienta/*.test.ts` (incluidos en `vitest.config.ts`).
> Pendiente (no bloquea Fase 3): QA manual iOS Safari y validación visual 3D con el jefe.

> Objetivo: que el usuario pueda **ubicar visualmente** muñequitos, etiquetas de nombre y
> números de bloque sobre el plano, y exportar un JSON de coordenadas que alimentará la
> migración inicial de `ofrenda_plano_layouts`. Es una herramienta desechable, fuera de la app.

## Entregable

`docs/plano-templo/herramienta/calibracion.html` — archivo único que se abre con doble clic
(sin servidor), acompañado de `plano-base-sabadell.png` (ya extraído del HTML v34 en
`.analysis/plano-base-sabadell.png`, se copiará a la carpeta `herramienta/`).

## Funcionalidad

1. **Dos fondos conmutables** (toggle en toolbar):
   - **PNG**: la imagen base actual (y la futura "sin muñequitos" cuando el usuario la pase —
     se carga con un botón "Cargar imagen…" para no re-embeber base64).
   - **SVG**: el plano premium generado desde la config de asientos (preview de la Fase 2),
     para calibrar directamente sobre él.
2. **Dos modos**: `8 sacos` (16 muñequitos + 16 tarjetas + 8 números) y `4 sacos`
   (8 muñequitos + 8 tarjetas + 4 números). Cada modo guarda su propio set de posiciones.
3. **Elementos arrastrables** (Pointer Events, coords en px del lienzo natural — 2D: 1448×1316, 3D: 1024×768):
   - Muñequito SVG (silueta con el color del bloque, ~28 px, sombra suave).
   - Tarjeta de nombre (mismo estilo del v34: franja de color + nombre).
   - Número de bloque (círculo con el número, editable con doble clic → input inline).
4. **Pan/zoom**: rueda + drag de fondo + pinch (motor portado del v34).
5. **Export/Import JSON** con el esquema exacto de `elementos` definido en
   [01-arquitectura-integracion.md](./01-arquitectura-integracion.md) §4.1 — lo que exporte
   el usuario se siembra tal cual en la migración.
6. Autosave en `localStorage` (aquí sí es aceptable: herramienta local desechable).
   Los nombres en la herramienta son texto libre de prueba (el combobox con Supabase es de la
   app real, Fase 4); aquí solo importan las **posiciones**.
7. Botón "Captura de control": export PNG rápido para validar con el jefe.

## Flujo de trabajo con el usuario

```
1. Yo genero la herramienta con posiciones iniciales (las del v34 para modo 8;
   derivadas/estimadas para modo 4).
2. El usuario abre el HTML, ajusta muñequitos/etiquetas/números en ambos modos.
3. El usuario me devuelve los 2 JSON exportados (o me dice "ok así").
4. Esos JSON se convierten en el seed de la migración de Fase 4.
5. Cuando llegue la foto sin muñequitos, se carga en la herramienta y se revalida (solo Opción A).
```

## Criterios de aceptación

- [x] Abre offline con doble clic en Chrome/Edge/Safari iOS.
- [x] Drag fluido a cualquier nivel de zoom (sin "saltos" por la escala).
- [x] El JSON exportado valida contra el esquema (final: `schemaVersion: 3` con vistas 2d/3d).
- [x] Modo 4 y modo 8 independientes y persistentes (además, por vista).
- [x] Números de bloque editables (doble clic) y movibles (y redimensionables).

## Estimación

~½ día. Sin dependencias (vanilla JS, igual que el prototipo original).
