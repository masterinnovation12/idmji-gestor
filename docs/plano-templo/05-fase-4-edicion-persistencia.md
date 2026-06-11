# Fase 4 — Edición premium + persistencia Supabase

> Objetivo: edición completa para ADMIN/EDITOR — mover tarjetas, **muñequitos** y **números de
> bloque**, editar textos y nombres — con guardado en Supabase y el sistema de modales/feedback
> Liquid Glass del módulo.

## 1. Migración SQL

`supabase/migrations/2026XXXX_ofrenda_plano.sql`:

- Tablas `ofrenda_plano_layouts`, `ofrenda_plano_personas` y `ofrenda_plano_asignaciones`
  (esquema en [01-arquitectura-integracion.md](./01-arquitectura-integracion.md) §4).
- RLS idéntica al resto de `ofrenda_*` (lectura autenticados, escritura ADMIN/EDITOR).
- Seed: layouts `sacos_8` y `sacos_4` con los JSON calibrados en Fase 1 (corrigiendo las
  inconsistencias `role`/`roleLabel` del v34 — hallazgo H5: el rol canónico es el del campo
  visible validado por el jefe).
- Seed de `ofrenda_plano_personas`: lote inicial de nombres que pasará el usuario en texto
  (normalizados y deduplicados antes de insertar).

## 2. Server actions (`planoActions.ts`)

| Action | Permiso | Descripción |
|---|---|---|
| `getPlanoData(servicioId)` | autenticado | layout del modo + asignaciones |
| `savePlanoLayout(modo, elementos)` | `requireEditor()` | valida esquema (zod-like manual, como el resto del módulo) y upsert |
| `savePlanoAsignacion(servicioId, bloque, rol, personaId)` | `requireEditor()` | upsert por `(servicio, bloque, rol)` + `nombre_snapshot` |
| `searchPlanoPersonas(query)` | autenticado | búsqueda normalizada (prefijo + contiene), máx. 8 resultados |
| `createPlanoPersona(nombre)` | `requireEditor()` | normaliza, valida (2–80 chars, al menos nombre y apellido recomendado), anti-duplicado → devuelve persona |
| `clearPlanoNombres(servicioId)` | `requireEditor()` | limpia asignaciones del servicio |
| `resetPlanoLayout(modo)` | `requireEditor()` | restaura seed |

Guardado de layout con **debounce** (~800 ms tras soltar un drag) + botón «Guardar» explícito;
indicador sutil «Guardado ✓» (patrón ya usado en el módulo). Optimistic UI con rollback +
`planError` si la action falla.

## 3. Interacciones de edición

| Elemento | Interacción |
|---|---|
| Tarjeta | Drag por la franja de color (pointer events conscientes de escala — se pausa el pan del lienzo durante el drag con `panning.disabled`). Nombre editable inline (textarea 2 líneas máx.). |
| Muñequito | Drag libre; doble tap/clic → mini-popover liquid para cambiar bloque/ocultar. |
| Número de bloque | Drag libre; doble clic → `OfrendaLiquidShell` pequeño con input numérico/texto (sustituye el `prompt()` del v34). |
| Nombre | `PersonaCombobox`: autocompletar contra `ofrenda_plano_personas`; sin coincidencia → botón «+ Añadir "X" a la lista» que crea y selecciona en un solo gesto. Ver §3.1. |
| Teclado | Elemento seleccionado + flechas = nudge 1 px (Shift = 10 px) — a11y senior. |

### 3.1 `PersonaCombobox` (componente clave, mobile-first)

- **Móvil (<768, uso principal)**: tocar el nombre de una tarjeta abre un sheet liquid casi
  fullscreen — input arriba con autofocus (`autocomplete="off"`, `autocapitalize="words"`,
  `enterkeyhint="done"`), lista de sugerencias con filas táctiles ≥48 px, fragmento buscado
  resaltado en dorado, y si no hay match exacto una fila destacada fija
  «+ Añadir "María García" a la lista» con icono `UserPlus`. Crear = inserta en Supabase,
  selecciona, cierra el sheet y muestra `quickSuccess('Añadida a la lista')`.
- **Desktop/tablet**: popover anclado bajo el input (máx. 6 resultados), navegación completa
  por teclado (↑/↓/Enter/Escape), `role="combobox"` + `aria-activedescendant`.
- Búsqueda con debounce 200 ms; cache en memoria de la sesión para respuesta instantánea;
  estados: cargando (shimmer), vacío («Sin coincidencias»), error (`planError`).
- Anti-duplicado en cliente: si lo escrito normaliza igual que una sugerencia, el botón
  «Añadir» se sustituye por «¿Es esta persona?» con la coincidencia arriba.
- Quitar asignación: acción «Dejar vacío» dentro del mismo combobox.

## 4. Editor lateral / bottom-sheet (`PlanoEditorSheet`)

- Desktop: panel lateral fijo 410 px con filas ordenadas por bloque 1→N (Ofrendario, Apoyo),
  círculo de color con el número (como el v34 pero con estética liquid gold/navy).
- Móvil: bottom-sheet con asa, drag-to-dismiss con velocidad, backdrop blur navy —
  reutilizando los patrones de `OfrendaLiquidShell`.
- Acciones en disclosure «Acciones y opciones»: Guardar, Limpiar nombres, Reset posiciones,
  Export (Fase 5). Confirmaciones destructivas SIEMPRE con liquid shell + `planWarning`.

## 5. Feedback (sistema actual del módulo)

- `useOfrendaToast()`: `planSuccess('Plano guardado')`, `planError(...)` con «Entendido»,
  `planWarning` para resets. Sin `alert/confirm` nativos.
- Cambios sin guardar al salir de la pestaña → aviso liquid (mismo patrón `feedback.dismiss()`
  al cambiar de tab que ya usa `OfrendaPageClient`).

## Criterios de aceptación

- [ ] Drag preciso con zoom 0.2×–4× (sin deriva de coordenadas).
- [ ] Números de bloque editables y movibles; persisten tras recarga.
- [ ] Muñequitos movibles independientes del fondo; persisten tras recarga.
- [ ] Dos navegadores: la edición de uno aparece en el otro tras refresh (Supabase, no localStorage).
- [ ] USER no puede editar ni vía UI ni vía action (RLS verificada con test).
- [ ] Sin `prompt/alert/confirm` nativos en todo el flujo.
- [ ] Combobox: escribir nombre existente → aparece y se selecciona; nombre nuevo → se añade a
      Supabase y queda disponible en la siguiente búsqueda desde otro dispositivo.
- [ ] Combobox móvil: flujo completo con una mano (tocar → escribir → añadir/seleccionar) sin
      que el teclado tape la lista (visualViewport).
- [ ] "josé pérez" y "Jose Perez" no generan duplicados.

## Estimación

~2 días.
