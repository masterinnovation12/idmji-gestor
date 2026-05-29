# Labor Ofrenda — Plan de Mejoras Premium Enterprise

> Documento de trabajo para llevar el módulo **Labor Ofrenda** a calidad enterprise, con
> foco total en **responsive móvil** y experiencia profesional. Cada bloque incluye la
> causa raíz detectada, la solución propuesta, los archivos afectados y un checklist
> verificable.

**Estado del documento:** Planificación + revisión QA
**Última actualización:** 29 de mayo de 2026
**Ámbito:** `src/app/dashboard/ofrenda/*`, `src/lib/i18n/*`, `src/lib/utils/ofrendaEngine.ts`

---

## Índice

1. [Scroll horizontal de la tabla en escritorio](#1-scroll-horizontal-de-la-tabla-en-escritorio)
2. [Navegación de semanas en móvil](#2-navegación-de-semanas-en-móvil)
3. [Selector de persona premium (modal / bottom-sheet)](#3-selector-de-persona-premium-modal--bottom-sheet)
4. [Exportación PDF / PNG fiel (WYSIWYG)](#4-exportación-pdf--png-fiel-wysiwyg)
5. [Edición de secuencia de sacos](#5-edición-de-secuencia-de-sacos)
6. [Tipografía y escala responsive](#6-tipografía-y-escala-responsive)
7. [Internacionalización (ES / CA)](#7-internacionalización-es--ca)
8. [QA senior — verificación funcional](#8-qa-senior--verificación-funcional)
9. [Revisión QA del plan — huecos y mejoras](#9-revisión-qa-del-plan--huecos-y-mejoras)
10. [Checklist global — Responsive Total Premium Enterprise](#10-checklist-global--responsive-total-premium-enterprise)

---

## 1. Scroll horizontal de la tabla en escritorio

### Problema
En modo escritorio no se puede hacer scroll hacia la derecha para ver la tabla completa
(meses de 5 semanas = 15 columnas de servicio + columna de roles). Las columnas se ven
comprimidas e ilegibles.

### Causa raíz
- En `PlanTable.tsx`, la tabla desktop usa `style={{ minWidth: '100%' }}`. Con 16 columnas
  esto **comprime** todas las celdas para caber dentro del contenedor `max-w-5xl` (1024px),
  en lugar de mantener un ancho mínimo por columna. Como la tabla nunca supera el ancho del
  contenedor, el `overflow-x-auto` jamás activa scroll.
- El contenedor de contenido en `OfrendaPageClient.tsx` (`max-w-5xl mx-auto px-4`) limita el
  ancho útil del módulo.

### Solución propuesta
- Calcular un `minWidth` real: `columnaRoles (≈180px) + nºServicios × anchoColumna (≈120px)`.
  Aplicarlo como estilo en línea de la `<table>` para que la tabla exceda el viewport y el
  `overflow-x-auto` genere scroll natural.
- Mantener la **primera columna sticky** (`Rol / Fecha`) al hacer scroll horizontal y reforzar
  su fondo sólido + sombra al desplazar para que no se transparente.
- Añadir afordancia visual de scroll: gradiente/sombra en el borde derecho cuando hay más
  contenido, y opcionalmente una mini-ayuda "← desliza para ver más →".
- Evaluar ampliar el contenedor del módulo a `max-w-6xl`/`max-w-7xl` solo en la pestaña Plan.

### Archivos afectados
- `src/app/dashboard/ofrenda/PlanTable.tsx`
- `src/app/dashboard/ofrenda/OfrendaPageClient.tsx`

### Checklist
- [ ] La tabla desktop muestra un ancho mínimo legible por columna (no se comprime).
- [ ] Aparece scroll horizontal cuando el contenido excede el viewport.
- [ ] La columna `Rol / Fecha` permanece fija (sticky) con fondo sólido al hacer scroll.
- [ ] Indicador visual de "hay más contenido a la derecha" (sombra/gradiente).
- [ ] Probado en 1280px, 1440px y 1920px con meses de 4 y 5 semanas.

---

## 2. Navegación de semanas en móvil

### Problema
En móvil no se ve el resto de semanas tras generar el plan; la paginación pasa desapercibida.

### Causa raíz
- La navegación por semanas existe (`currentPage`, flechas y dots en `PlanTable.tsx`) pero es
  poco visible y no hay gesto de swipe ni etiqueta de fecha de la semana.

### Solución propuesta
- Rediseñar la cabecera de navegación móvil: selector de semana prominente con rango de fechas
  (ej. "Semana 19 · 07–10 may") y flechas grandes con área táctil ≥ 44px.
- Añadir **gesto swipe** (drag horizontal con Framer Motion) para cambiar de semana.
- Hacer los **dots** más visibles y táctiles; resaltar la semana activa con color del tipo de día.
- Animación de transición direccional (entra desde el lado correcto según avance/retroceso).
- Opcional: contador "Semana X de Y" siempre visible y fijo.

### Archivos afectados
- `src/app/dashboard/ofrenda/PlanTable.tsx`

### Checklist
- [ ] La navegación entre semanas es claramente visible en móvil.
- [ ] Funciona el swipe horizontal para cambiar de semana.
- [ ] Las flechas tienen área táctil ≥ 44×44px.
- [ ] La semana activa muestra rango de fechas y queda resaltada.
- [ ] Transiciones direccionales fluidas sin parpadeos.
- [ ] Probado en 320px, 375px y 414px de ancho.

---

## 3. Selector de persona premium (modal / bottom-sheet)

### Problema
Al cambiar de persona se abre una lista (dropdown). Se pide algo más profesional, sobre todo
en móvil: una ventana con lógica completa en lugar de una simple lista.

### Causa raíz
- `AsignacionCell` en `PlanTable.tsx` usa un panel flotante (portal) con lista simple. Funciona,
  pero no transmite calidad enterprise ni ofrece búsqueda/contexto.

### Solución propuesta
- **Móvil:** convertir el selector en un **bottom-sheet** deslizable a pantalla casi completa:
  - Cabecera con rol, fecha y servicio (Jue / Dom mañana / Dom tarde) con su color.
  - **Buscador** de personas por nombre.
  - Lista con avatar/iniciales, indicador de grupo, marca de selección y estado (activo).
  - Aviso visual si la persona ya está asignada ese día/semana (anti-repetición).
  - Botón "Quitar asignación" y cierre por gesto (drag-down) + backdrop.
- **Escritorio:** popover anclado al botón, también con buscador y misma información, manteniendo
  posicionamiento inteligente (arriba/abajo según espacio) ya implementado vía portal.
- Reutilizar el patrón de modal existente del proyecto para consistencia visual.
- Feedback con toasts premium (ya implementados) al confirmar el cambio.

### Archivos afectados
- `src/app/dashboard/ofrenda/PlanTable.tsx`
- Posible nuevo componente: `src/app/dashboard/ofrenda/PersonaPicker.tsx`

### Checklist
- [ ] En móvil se abre un bottom-sheet, no una lista pegada a la celda.
- [ ] Incluye buscador por nombre con filtrado en vivo.
- [ ] Muestra rol, fecha y tipo de servicio en la cabecera.
- [ ] Indica grupo, selección actual y estado de cada persona.
- [ ] Avisa si la persona genera repetición (Jue→DomM→DomT→Jue).
- [ ] Permite "Quitar asignación" y cerrar por gesto + backdrop.
- [ ] En escritorio, popover con buscador y misma información.
- [ ] Fondo 100% opaco (sin transparencias) en claro y oscuro.
- [ ] Accesible por teclado (focus trap, Esc para cerrar, navegación con flechas).

---

## 4. Exportación PDF / PNG fiel (WYSIWYG)

### Problema
Al exportar en móvil el resultado "se ve a la mitad". La vista previa móvil aparece reducida y
no coincide con lo que finalmente se exporta.

### Causa raíz
- `ExportLayout.tsx` tiene **ancho fijo de 1600px**. En `ExportPanel.tsx` la preview se escala con
  un `transform: scale(...)`, creando una sensación WYSIWYG que no es exacta.
- El PDF se genera en A3 horizontal (vectorial); al abrirlo en visores móviles puede verse cortado
  si el visor no ajusta a página completa.

### Solución propuesta
- Garantizar **preview = export real**: renderizar el mismo `ExportLayout` y mostrar exactamente
  la imagen/captura que se descargará (idealmente, generar el PNG y mostrarlo como preview).
- Revisar el flujo PNG (`html-to-image`) para capturar el layout completo a 1600px y validar que
  no se recorta a ningún ancho de pantalla.
- En el PDF, asegurar que todo el contenido entra en una sola página A3 horizontal con márgenes
  correctos y que el "fit to page" sea el predeterminado.
- Añadir en la preview un botón "Ver a tamaño completo" (abrir imagen en nueva pestaña/modal zoom).
- Mostrar dimensiones / peso estimado del archivo y un aviso claro: "La descarga conserva calidad completa".
- Verificar exportación real en dispositivos móviles (no solo escritorio).

### Archivos afectados
- `src/app/dashboard/ofrenda/ExportPanel.tsx`
- `src/app/dashboard/ofrenda/ExportLayout.tsx`

### Checklist
- [ ] La vista previa refleja exactamente el archivo exportado (mismo contenido y proporción).
- [ ] El PNG exportado se ve completo (no recortado) abierto en móvil.
- [ ] El PDF entra completo en una página A3 horizontal (fit-to-page).
- [ ] Opción de "ver a tamaño completo" / zoom en la preview.
- [ ] Peso del PDF < 1 MB y nítido (vectorial).
- [ ] Probado descargando y abriendo en iOS Safari y Android Chrome.
- [ ] Compartir nativo (Web Share API) adjunta la imagen completa.

---

## 5. Edición de secuencia de sacos

### Problema
La edición manual de la secuencia ("Sacos") puede ser más clara y agradable.

### Causa raíz
- `SecuenciaCell` en `PlanTable.tsx` usa dos inputs numéricos pequeños inline; poco cómodo en móvil
  y con poca guía sobre qué representa (sacos de los ofrendarios, ciclo 1–20).

### Solución propuesta
- Editor premium: al pulsar la secuencia, abrir un mini-popover/sheet con:
  - Steppers grandes (+/−) o inputs amplios "desde" / "hasta" con teclado numérico.
  - Texto de ayuda: "Secuencia de sacos de los ofrendarios (ciclo 1–20)".
  - Validación en vivo (1–20) y vista previa del texto resultante ("05 al 12").
  - Botones claros Guardar / Cancelar con estados de carga.
- Mantener actualización optimista (ya existe) y toasts premium de confirmación.

### Archivos afectados
- `src/app/dashboard/ofrenda/PlanTable.tsx`

### Checklist
- [ ] El editor de secuencia es cómodo en móvil (inputs/steppers grandes).
- [ ] Muestra ayuda contextual sobre el significado de la secuencia.
- [ ] Validación en vivo 1–20 con vista previa del texto.
- [ ] Guardar/Cancelar claros con estado de carga.
- [ ] Actualización optimista y toast de confirmación funcionando.

---

## 6. Tipografía y escala responsive

### Problema
Algunos textos son demasiado pequeños (ej. etiqueta "Sacos"); se piden tamaños mayores
manteniendo el responsive móvil.

### Causa raíz
- Uso de tamaños muy reducidos (`text-[9px]`, `text-[11px]`) en etiquetas y celdas, pensados para
  densidad pero poco legibles, especialmente en móvil.

### Solución propuesta
- Definir una escala tipográfica responsive coherente (móvil → escritorio) para encabezados,
  etiquetas de rol, secuencia y nombres.
- Subir el tamaño base de etiquetas clave ("Sacos", roles) y nombres en las tarjetas móviles.
- Asegurar contraste AA y truncado elegante donde haga falta.

### Archivos afectados
- `src/app/dashboard/ofrenda/PlanTable.tsx`
- `src/app/dashboard/ofrenda/OfrendaPageClient.tsx`
- `src/app/dashboard/ofrenda/ExportLayout.tsx` (coherencia visual del export)

### Checklist
- [ ] Etiquetas clave ("Sacos", roles) con tamaño legible en móvil.
- [ ] Escala tipográfica coherente entre móvil y escritorio.
- [ ] Contraste de texto AA en claro y oscuro.
- [ ] Sin desbordes; truncado elegante donde corresponda.

---

## 7. Internacionalización (ES / CA)

### Problema
Casi todo el módulo Labor Ofrenda está en **español fijo** (strings hardcodeados en componentes).
El resto del gestor usa `useI18n()` + claves en `src/lib/i18n/translations.ts` para **español (`es-ES`)**
y **catalán (`ca-ES`)**. Hoy solo existen 4 claves de ofrenda (`dashboard.ofrenda`,
`dashboard.ofrendaDesc`, `nav.ofrenda` ×2).

### Estado actual (auditoría rápida)
| Área | ¿Usa i18n? | Ejemplos sin traducir |
|------|------------|------------------------|
| `OfrendaPageClient.tsx` | No | Tabs "Plan Mensual", "Personas", "Exportar"; meses; toasts; acordeón sacos |
| `PlanTable.tsx` | No | Roles, "Sacos", "Semana X de Y", toasts, picker "Asignar persona" |
| `MiembrosManager.tsx` | No | Importar directorio, confirmaciones, toasts, grupos |
| `ExportPanel.tsx` | No | Botones, pasos, banner, toasts |
| `ExportLayout.tsx` | No | Cabeceras tabla, leyenda, pie PDF/PNG |
| PDF vectorial (`ExportPanel`) | No | Mismas etiquetas que la UI, generadas en jsPDF |
| `date-fns` | Parcial | `formatFecha` usa locale `es` fijo |

### Solución propuesta
1. **Definir namespace** `ofrenda.*` en `translations.ts` (es-ES y ca-ES), siguiendo el patrón de
   `lecturas.*` / `hermanos.*`.
2. **Integrar `useI18n()`** en todos los client components del módulo (`t('ofrenda....')`).
3. **Fechas y meses:** usar `language` de `useI18n()` para elegir locale `es` / `ca` en `date-fns`.
4. **Exportaciones (PNG/PDF):** las etiquetas del documento deben salir de las mismas claves i18n
   (no duplicar strings en jsPDF ni en `ExportLayout`).
5. **Toasts y mensajes de error:** centralizar en claves; los errores del servidor pueden mostrarse
   tal cual si vienen en un idioma, o mapearse a claves genéricas (`common.error`).
6. **Checklist de cobertura:** inventario de ~80–120 cadenas (ver sublista abajo).

### Claves sugeridas (grupos)
- `ofrenda.title`, `ofrenda.tabs.plan`, `ofrenda.tabs.people`, `ofrenda.tabs.export`
- `ofrenda.month.prev`, `ofrenda.month.next`, `ofrenda.month.generate`, `ofrenda.regenerate.*`
- `ofrenda.roles.*` (realiza, apoyo, vigilancia, colaborador)
- `ofrenda.days.*` (jueves, domingo, manana, tarde)
- `ofrenda.table.sacos`, `ofrenda.table.rolFecha`, `ofrenda.week.*`
- `ofrenda.picker.*` (título, buscar, sinAsignar, quitar, repetición)
- `ofrenda.sequence.*` (editor, ayuda, validación)
- `ofrenda.export.*` (png, pdf, share, preview, steps)
- `ofrenda.members.*` (importar, activar, eliminar, grupos)
- `ofrenda.toast.*` (éxito/error por acción)
- `ofrenda.empty.*`, `ofrenda.loading.*`

### Archivos afectados
- `src/lib/i18n/translations.ts`
- `src/lib/i18n/types.ts` (si se tipan las claves)
- `src/app/dashboard/ofrenda/*.tsx` (todos los client)
- Opcional: helper `getOfrendaLocale(language)` para PDF y `date-fns`

### Checklist
- [ ] Todas las cadenas visibles de la UI usan `t()` (cero español hardcodeado en JSX).
- [ ] Existe paridad **es-ES** y **ca-ES** para cada clave `ofrenda.*` (sin claves huérfanas).
- [ ] Cambiar idioma en el selector del gestor actualiza Labor Ofrenda sin recargar página.
- [ ] Fechas y nombres de mes respetan el idioma activo.
- [ ] PNG/PDF exportados muestran etiquetas en el idioma activo al exportar.
- [ ] Toasts y modales traducidos (Personas, Plan, Exportar).
- [ ] Revisión manual: usuario cambia a Català y recorre las 3 pestañas completas.
- [ ] Revisión de textos largos en catalán (no se cortan en móvil por ser más largos).

---

## 8. QA senior — verificación funcional

### Objetivo
Garantizar que todo funciona de forma robusta tras los cambios, en datos reales y casos límite.

### Casos a cubrir
- Generar plan en meses de 4 y 5 semanas (incluye años bisiestos / cambios de mes).
- Regenerar Grupo 1, Grupo 2 y ambos, **conservando overrides manuales**.
- Cambiar persona (incluye "sin asignar") y verificar punto amarillo de override.
- Editar secuencia de sacos y validar rango 1–20 y continuidad Dom mañana → Dom tarde.
- Exportar PNG, PDF y compartir nativo en escritorio y móvil.
- Navegación de meses y semanas sin estados inconsistentes.
- Permisos: ADMIN/EDITOR pueden editar; otros solo lectura.
- **Idioma:** flujo completo en ES y CA (generar, editar, exportar).
- **Migraciones Supabase** aplicadas en el entorno donde se prueba (`20260528000000_*`, `20260528_001_*`).

### Comandos
- `npm run test` — unitarios del motor (`ofrendaEngine.test.ts`).
- `npm run build` — build de producción sin errores.
- Lint/tipos limpios en los archivos tocados.

### Checklist
- [ ] `npm run test` en verde.
- [ ] `npm run build` sin errores.
- [ ] Sin errores de lint/TS en archivos modificados.
- [ ] Prueba manual en navegador (escritorio y móvil) de todos los flujos.
- [ ] Verificación de overrides preservados tras regenerar.
- [ ] Prueba de idioma ES y CA en las tres pestañas.

---

## 9. Revisión QA del plan — huecos y mejoras

> Revisión del plan frente al código actual y al feedback del usuario. Ítems **nuevos** a incorporar
> en la implementación o en esta documentación.

### Críticos (bloquean uso real)
| # | Hueco detectado | Acción recomendada |
|---|-----------------|-------------------|
| A | Tabla desktop sin scroll (columnas comprimidas) | Ya en §1 — prioridad máxima |
| B | Móvil: semanas poco descubribles | Ya en §2 |
| C | Export móvil “cortado” / preview engañosa | Ya en §4 — unificar preview = archivo real |
| D | **i18n ausente en todo el módulo** | §7 — obligatorio para paridad con el resto del app |
| E | Texto UI dice “A4” en export PDF pero el PDF es **A3** | Corregir copy y documentación; alinear expectativas |

### Importantes (calidad premium)
| # | Hueco detectado | Acción recomendada |
|---|-----------------|-------------------|
| F | Selector persona: dropdown vs bottom-sheet pedido | §3 — `PersonaPicker.tsx` reutilizable |
| G | Secuencia “Sacos” con UX pobre en móvil | §5 |
| G2 | Tipografía demasiado pequeña | §6 |
| H | **Modo oscuro:** overlays y tabla deben probarse en `dark:` | Añadir checklist dark mode en §10 |
| I | **Safe area iOS** en bottom-sheet (notch/home indicator) | `padding-bottom: env(safe-area-inset-bottom)` |
| J | Botón **Atrás** del navegador / gesto iOS debe cerrar sheet, no salir de la página | `history.pushState` o flag en `popstate` |
| K | **Orientación** landscape en móvil al editar/exportar | Probar y fijar layout |
| L | Estados **vacío** mejorados: sin miembros, sin plan, lista import vacía | Mensajes + CTA claros (traducidos) |
| M | **Doble tap / doble guardado** en asignación y secuencia | Deshabilitar botón mientras `saving` (parcialmente hecho; auditar todo) |
| N | **Concurrencia:** dos editores en el mismo mes | Último guardado gana; opcional toast “plan actualizado por otro usuario” al refetch |

### Deseables (enterprise extra)
| # | Hueco detectado | Acción recomendada |
|---|-----------------|-------------------|
| O | Indicador de scroll horizontal en desktop (sombra + hint) | §1 |
| P | Atajo **Esc** cierra modales; **focus trap** en sheet | §3 checklist |
| Q | **Arrastrar orden** de miembros (Reorder) ya existe — verificar en móvil táctil | QA en Personas |
| R | Leyenda de colores Jue/DomM/DomT visible también en vista Plan (no solo export) | Mini-leyenda bajo tabs |
| S | Nombre de archivo export: incluir idioma o mes localizado | `labor-ofrenda-maig-2026.pdf` en CA |
| T | Tests E2E Playwright opcionales: scroll tabla, cambiar idioma, export smoke | Carpeta `e2e/ofrenda` |
| U | **Accesibilidad:** `aria-live` en toasts; roles en tabla | Auditoría axe en página |
| V | Rendimiento: mes 5 semanas × 15 columnas — scroll fluido | Evitar re-renders masivos en `PlanTable` |
| W | Documentación de **migraciones** para quien despliega | Nota en README o en este doc |

### Fuera de alcance (confirmado antes, no implementar salvo petición)
- Copiar plan de mes anterior como plantilla.
- Varias congregaciones / sedes.
- Historial editable de meses pasados más allá de consulta.

### Inconsistencias detectadas en código (corregir al implementar)
1. `ExportPanel`: descripción PDF menciona “A4 horizontal”; generador usa **A3**.
2. `OfrendaPageClient`: `MESES` en español fijo; debe usar i18n + locale.
3. `PlanTable` / `ExportLayout`: roles “Colaborador 1/2/3” en UI vs “Colaboradores” en export — unificar etiquetas vía i18n.
4. `nav.ofrenda` en catalán sigue siendo “Labor Ofrenda” (puede ser correcto como nombre propio; validar con congregación: “Labor Ofrena” vs mantener término mixto).

### Priorización revisada (orden de ejecución)
1. §1 Scroll desktop + §2 Semanas móvil (usabilidad base).
2. §7 i18n ES/CA (paridad producto; hacer en paralelo con UI si es posible).
3. §3 PersonaPicker premium.
4. §4 Export WYSIWYG + corregir copy A3/A4.
5. §5 Secuencia + §6 Tipografía.
6. §8 QA funcional + ítems H–N de esta revisión.
7. §10 Checklist global.

---

## 10. Checklist global — Responsive Total Premium Enterprise

> Lista maestra para comprobar que **todo** se ha implementado.

### Responsive (breakpoints 320 / 375 / 414 / 768 / 1024 / 1440 / 1920)
- [ ] La tabla desktop hace scroll horizontal y es legible en cada breakpoint.
- [ ] La vista móvil pagina/swipea semanas con claridad.
- [ ] Selector de persona: bottom-sheet en móvil, popover en escritorio.
- [ ] Editor de secuencia cómodo en móvil.
- [ ] Preview y exportación fieles en móvil y escritorio.
- [ ] Tipografía legible y coherente en todos los tamaños.
- [ ] Áreas táctiles ≥ 44px en controles interactivos.

### Internacionalización (ES / CA)
- [ ] 100 % de strings UI vía `t('ofrenda.*')` en es-ES y ca-ES.
- [ ] Fechas y meses localizados según idioma del gestor.
- [ ] Export PNG/PDF con etiquetas en idioma activo.
- [ ] Recorrido manual completo en Català sin textos en español residual.

### Calidad premium / enterprise
- [ ] Sin transparencias indebidas en overlays (fondos sólidos claro/oscuro).
- [ ] Modo oscuro verificado (tabla, cards, sheet, export preview).
- [ ] Animaciones fluidas (Framer Motion) sin parpadeos ni saltos.
- [ ] Estados de carga, vacío y error bien resueltos.
- [x] Toasts premium consistentes en todas las acciones (modal liquid, ~6 s / manual, sin cierre por backdrop — ver `ofrendaNotifications.qa.test.ts`).
- [ ] Accesibilidad: foco visible, teclado, ARIA y contraste AA.
- [ ] Bottom-sheet con safe-area iOS y cierre con botón Atrás del sistema.

### Funcional
- [ ] Generación/regeneración correcta y overrides preservados.
- [ ] Anti-repetición Jue → Dom M → Dom T → Jue siguiente respetada.
- [ ] Continuidad de secuencia Dom mañana → Dom tarde.
- [ ] Exportes (PNG/PDF/compartir) completos y de calidad.

### Verificación técnica
- [ ] `npm run test` en verde.
- [ ] `npm run build` sin errores.
- [ ] Lint/TS limpios en archivos modificados.
- [ ] QA manual en navegador (móvil + escritorio) completado.

---

### Orden de ejecución sugerido
Ver [Priorización revisada](#priorización-revisada-orden-de-ejecución) en §9.
