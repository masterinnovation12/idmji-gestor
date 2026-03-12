# Fase 5 – Comprobaciones finales y responsive

Verificación end-to-end, responsive en desktop y móvil total, y criterios de nivel senior para dar la funcionalidad por cerrada.

---

## Objetivo

- Confirmar que la funcionalidad Archivos cumple todos los criterios de las fases anteriores.
- Validar **responsive desktop (pantalla completa)** y **responsive móvil total** en cualquier dispositivo.
- Aplicar las mejores prácticas de adaptación móvil (touch, viewports, legibilidad).
- Cerrar la fase con una checklist definitiva antes de subir a remoto.

---

## Checklist de comprobaciones definitivas

- [x] **5.1** Las 4 hojas se ven correctamente en la app (datos y cabeceras adaptativas).
- [x] **5.2** Las URLs de los Sheets no se exponen al cliente (peticiones solo desde servidor vía `getSheetData`).
- [x] **5.3** Solo usuarios autenticados pueden ver la sección Archivos (redirect en `page.tsx` + comprobación en Server Action).
- [x] **5.4** En la página Archivos, los datos se actualizan solos cada 45 s (polling) cuando alguien edita el Sheet en Drive.
- [x] **5.5** `.env.local` no está en Git; `.env.example` documenta las variables.
- [x] **5.6** Diseño coherente con el resto del dashboard (glass, tabs, tabla/cards) y usable en móvil (touch 44px, modal detalle, scroll horizontal en tabs).

---

## Tests senior – Backend (revisión final)

| ID   | Criterio | Comprobación |
|------|----------|--------------|
| BE-F | La Server Action exige autenticación | Sin login → error o redirección; con login → datos correctos. |
| BE-F | Errores (403, timeout, CSV inválido) no tiran la app | Respuesta controlada y mensaje en UI. |

---

## Tests senior – Fuente de datos / CSV (revisión final)

| ID    | Criterio | Comprobación |
|-------|----------|--------------|
| FD-F  | Las 4 URLs responden con CSV válido (o se documenta la que falle) | `fetch` desde servidor devuelve texto CSV con cabecera. |
| FD-F  | Cambios en Drive se reflejan al refrescar o en el siguiente polling | Añadir fila en Sheet → en la app aparece en la siguiente carga. |

---

## Tests senior – Frontend (revisión final)

| ID   | Criterio | Comprobación |
|------|----------|--------------|
| FE-F | Navegación y pestañas | Clic en “Archivos” → página con 4 pestañas; cada pestaña muestra el Sheet correcto. |
| FE-F | Estados carga / error / vacío | Skeleton o spinner, mensaje de error, tabla vacía sin crash. |
| FE-F | Polling y limpieza | Actualización automática cada 30–60 s; al salir de la página no quedan peticiones activas. |

---

## Tests senior – Responsive desktop (pantalla completa)

| ID  | Criterio | Comprobación |
|-----|----------|--------------|
| RD-1 | Viewport grande (≥1280px) | Tabla completa visible o con scroll horizontal contenido; sidebar y contenido bien proporcionados. |
| RD-2 | Tipografía y contraste | Misma familia y tamaños que el resto del dashboard; contraste suficiente (WCAG AA recomendado). |
| RD-3 | Scroll y overflow | Solo donde se espera (tabla o contenedor de pestañas); sin scroll horizontal en el body. |

---

## Tests senior – Responsive móvil total (cualquier dispositivo)

| ID  | Criterio | Comprobación |
|-----|----------|--------------|
| RM-1 | Viewports 320px, 375px, 414px | Contenido legible; pestañas accesibles (scroll horizontal o wrap); tabla como cards o tabla con scroll horizontal suave. |
| RM-2 | Touch targets | Mínimo ~44x44px en pestañas y botones; separación suficiente para evitar toques equivocados. |
| RM-3 | Sin zoom forzado | Fuentes y controles con tamaño adecuado; no hace falta hacer zoom para leer o pulsar. |
| RM-4 | Orientación portrait y landscape | Layout se adapta; datos siguen accesibles en ambas orientaciones. |
| RM-5 | Scroll y performance | Scroll fluido; polling no bloquea la UI; sin memory leaks al cambiar de pestaña o salir. |

---

## Mejores prácticas de adaptación móvil (resumen)

- **Viewport:** meta viewport correcto; no desactivar zoom de usuario sin necesidad.
- **Contenedores:** `overflow-x: auto` o `overflow-x: scroll` solo en el contenedor de la tabla/cards, no en `body`.
- **Tipografía:** tamaños mínimos ~16px para cuerpo en móvil; escalado con `clamp()` o breakpoints si se usa.
- **Touch:** `min-height`/`min-width` 44px en elementos interactivos; `touch-action` si hay gestos personalizados.
- **Tablas:** En móvil, preferir cards por fila o tabla con scroll horizontal con indicador visual (sombra o scrollbar visible).

---

## Criterios de aceptación de la fase

- Todas las comprobaciones del checklist 5.1–5.6 están pasando.
- Backend, fuente CSV, frontend y responsive (desktop + móvil) cumplen los tests senior de esta fase y de las fases anteriores.
- La funcionalidad está lista para subir a remoto y se considera cerrada en local.
