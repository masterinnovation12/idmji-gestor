# QA — Exportación Labor Ofrenda (mensual y semanal)

**Fecha:** 2026-05-30  
**Módulo:** `src/app/dashboard/ofrenda/Export*`

---

## 1. Alcance funcional

| Función | Mensual | Semanal |
|---------|---------|---------|
| PNG alta resolución | ✅ Mes completo (todas las columnas) | ✅ 3 columnas (Jue + Dom M + Dom T) |
| PDF vectorial | ✅ A3 horizontal | ✅ A4 horizontal |
| Compartir (Web Share) | ✅ Mismo PNG activo | ✅ Mismo PNG activo |
| Vista previa WYSIWYG | ✅ | ✅ Según alcance elegido |
| Mismo diseño (navy/dorado, roles, secuencias) | ✅ | ✅ |
| Texto `idmji.org` | ❌ Eliminado | ❌ Eliminado |

---

## 2. Contenido: mensual vs semanal

### Mensual (actual)
- **Columnas:** 1 por cada servicio del mes (`N` = típicamente 12–15).
- **Filas:** Rol/fecha, Secuencia sacos, G1 (3 roles), divisor, G2 (3 colaboradores), Semana ISO.
- **Ancho layout PNG:** `max(1600px, 145 + N×100)`.
- **PDF:** A3 apaisado (420 mm útiles).

### Semanal (nuevo)
- **Columnas:** Exactamente los servicios de la semana elegida (3 en un mes normal de 4 semanas).
- **Mismas filas** que mensual; sin columnas de otras semanas.
- **Subtítulo:** «Semana X de Y · rango fechas» bajo el título del mes.
- **Ancho layout PNG:** `max(720px, 145 + 3×100)` — legible en móvil.
- **PDF:** A4 apaisado (297 mm) — cabe en impresión estándar.

### Regla de agrupación
- Idéntica a `PlanTable`: `servicios` ordenados por `posicion`, chunks de **3**.

---

## 3. UI / UX (responsive)

### Controles nuevos (`ExportScopeControls`)
1. **Segmented control:** «Mes completo» | «Por semana» — `min-h-[44px]`, grid 2 columnas en móvil.
2. **Selector de semana** (solo si semanal): chips con «Sem. n/total» + rango de fechas; wrap en móvil, fila en tablet/desktop.

### Breakpoints
| Viewport | Comportamiento esperado |
|----------|-------------------------|
| Móvil (<640px) | Chips semana 2 por fila (`basis 50%`); export options apiladas; preview con scroll/zoom |
| Tablet | Chips en fila; banner legible |
| Desktop fullscreen | Misma UI centrada en `max-w-5xl` del tab Exportar |

### Botones existentes (sin duplicar)
- Descargar PNG  
- Descargar PDF (descripción cambia a A4 en modo semanal)  
- Compartir (si Web Share)  
- Vista previa (acordeón)

### Estados
- Sin plan → empty state (sin cambios).
- Export en curso → deshabilitar scope y semanas.
- Semana sin datos → no debería ocurrir si hay plan; guard en servidor.

---

## 4. Archivos generados

| Alcance | Patrón ejemplo |
|---------|----------------|
| Mensual | `labor-ofrenda-mayo-2026.png` / `.pdf` |
| Semanal | `labor-ofrenda-mayo-2026-semana-2-7-10-may.png` |

---

## 5. Checklist QA manual

### Mensual
- [ ] PNG incluye todas las semanas del mes.
- [ ] PDF A3 una página, nítido.
- [ ] No aparece `idmji.org`.
- [ ] Pie: «Generado por IDMJI Gestor…» + meta sacos.

### Semanal
- [ ] Cambiar semana actualiza preview y descarga.
- [ ] PNG solo 3 columnas.
- [ ] PDF A4 una página.
- [ ] Subtítulo correcto en cabecera PNG/PDF.

### Responsive
- [ ] iPhone Safari: selector + export PNG.
- [ ] Android Chrome: compartir semanal.
- [ ] Desktop 1920px: preview zoom/pan.

### Regresión
- [ ] Tab Plan no afectado.
- [ ] i18n CA muestra strings catalanes.

---

## 6. Tests automatizados

- `exportWeekUtils.test.ts` — agrupación y anchos.
- `ExportLayout.export.test.tsx` — sin idmji.org, modo semanal.
- `e2e/ofrenda-export-scope.spec.ts` — UI scope (con credenciales E2E).
