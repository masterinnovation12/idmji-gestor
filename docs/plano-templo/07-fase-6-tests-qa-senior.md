# Fase 6 — Plan de tests senior y QA final

> Stack existente: **Vitest** (unit) + **Playwright** (e2e, config en `playwright.config.ts`).
> Skills a usar: `playwright` para los e2e con navegador real.

## 1. Unit (Vitest) — motor puro, sin DOM

`src/lib/utils/__tests__/planoLayout.test.ts` (+ utils portadas del v34):

| Suite | Casos |
|---|---|
| `resolverModo` | sacos 4 → modo 4 bloques; sacos 8 → modo 8; sacos 6/12 → `no_soportado`; respeta `dia_tipo` del servicio |
| Geometría SVG | 4 columnas con 18/20/17/16 filas y 8/11/10/8 asientos (662 total); anchors de bloque dentro de su columna; modo 8 parte cada columna en 2 secciones sin solape |
| Mapeo bloques | columnas de derecha a izquierda: bloque 1 = columna 1 (derecha) delantera … bloque 8 = columna 4 trasera (izquierda); modo 4: bloque n ↔ columna n |
| Coordenadas | px natural ⇄ % ida y vuelta sin pérdida; clamp dentro del lienzo; drag con escala 0.2×–4× produce el mismo delta natural |
| Tarjetas | `calcCardWidth` 112–170 px; `wrapText` máx. 2 líneas + elipsis; nombres largos sin desbordar |
| Serialización | `elementos` JSON valida `schemaVersion`; rechaza bloques fuera de 1–8, roles inválidos, coords no finitas (entrada de import JSON = boundary) |
| Migración v34 | el seed corrige las 4 inconsistencias `role`/`roleLabel` detectadas (P07, P08, P15, P16) |
| `planoPersonas` | normalización: trim, espacios colapsados, lower, sin tildes ("  José   PÉREZ " → "jose perez"); búsqueda por prefijo y "contiene" con ranking (prefijo primero); detección de duplicado normalizado; validación de nombre (2–80 chars, sin solo-espacios, sin caracteres de control) |

## 2. Integración server actions

- `savePlanoLayout` / `savePlanoAsignacion`: éxito como EDITOR, rechazo como USER
  (`requireEditor`), payload inválido rechazado, upsert idempotente por clave única.
- `createPlanoPersona`: crea y devuelve persona; duplicado normalizado → devuelve la existente
  (o error controlado, no excepción); carrera de dos inserciones simultáneas → constraint
  `unique` resuelve y la action lo maneja con gracia.
- `searchPlanoPersonas`: máx. 8 resultados, ignora `activo=false`, query vacía → lista vacía.
- RLS: con cliente anon/USER, `insert/update` sobre `ofrenda_plano_*` debe fallar
  (test tipo los existentes de ofrenda o verificación vía MCP Supabase + advisors).

## 3. E2E (Playwright)

`e2e/ofrenda-plano.spec.ts`:

| Escenario | Pasos |
|---|---|
| Modo por servicio | Login EDITOR → pestaña Plano → seleccionar jueves → 4 bloques/8 tarjetas (`data-testid`) → domingo mañana → 8 bloques/16 tarjetas |
| Dependencia de config | Cambiar `sacos_jueves` a 8 en SacosConfigPanel → plano del jueves pasa a 8 bloques |
| Drag + persistencia | Arrastrar tarjeta y muñequito → recargar → posición conservada (Supabase) |
| Número de bloque | Doble clic en número → modal liquid → cambiar texto → visible y persistente |
| Asignar nombre existente | Escribir 3 letras → sugerencias → seleccionar → tarjeta actualizada y persistida |
| Añadir persona nueva | Escribir nombre inexistente → «+ Añadir» → creada en Supabase, seleccionada, y aparece como sugerencia al reusarla en otra tarjeta |
| Anti-duplicados | Escribir "jose perez" existiendo "José Pérez" → NO ofrece añadir, ofrece la existente |
| Combobox móvil | Viewport 375: sheet fullscreen, teclado no tapa la lista, botón añadir alcanzable con el pulgar |
| Permisos | Login USER → sin drag, sin inputs, sin botones de edición; pan/zoom y export sí |
| Export | Botón PNG descarga archivo; verificar nombre y tamaño > 0 |
| Feedback | Guardar → toast liquid éxito; forzar error (mock) → modal con «Entendido» |
| Móvil (viewport 375×812) | Bottom-sheet abre/cierra con drag; pinch con `CDP Input.dispatchTouchEvent`; toolbar táctil |

## 4. Visual / QA manual asistido

- Capturas Playwright en 375 / 768 / 1024 / 1440 px, light y dark, modos 4 y 8 →
  guardadas en `docs/qa-screenshots/plano/` (patrón ya usado en el repo).
- Comparación pantalla vs export PNG (overlay al 50 %).
- QA con navegador real (MCP browser) recorriendo el flujo completo como EDITOR y USER.

## 5. Accesibilidad

- Navegación por teclado: tab a elementos, flechas para nudge, Escape cierra sheets/modales.
- `role`/`aria-label` en lienzo, tarjetas y controles; tabla alternativa para lector de pantalla.
- Contraste AA de textos sobre los 8 colores de bloque (verificar `#f4b000` y `#14b8b8`).
- `prefers-reduced-motion`: sin animaciones de layout.

## 6. Rendimiento

- DOM SVG acotado (`<use>`): < 1.000 nodos en el lienzo.
- Drag sin re-render de React por frame (mutación de transform + commit al soltar, patrón v34).
- `next/dynamic` verificado: el bundle de las otras pestañas no crece (comparar `next build`).

## 7. Checklist de salida (definition of done)

- [ ] Todas las suites verdes (`npm run test`, `npx playwright test`).
- [ ] `npx tsc --noEmit` y lint sin errores nuevos.
- [ ] Advisors de Supabase sin avisos nuevos (RLS).
- [ ] QA visual aprobado por el usuario (capturas).
- [ ] Validación del jefe sobre numeración de bloques y disposición jueves.
- [ ] Deploy según workflow `deploy-produccion` del repo.

## Estimación

~1,5 días (en paralelo parcial con Fases 4-5).
