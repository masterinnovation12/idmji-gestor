# QA — Branding exportación Labor Ofrenda vs idmji.org

**Fecha:** 2026-05-29  
**Referencia:** https://idmji.org/ (CGMJCI / IDMJI oficial)  
**Alcance:** PNG, PDF vectorial, vista previa WYSIWYG

---

## 1. Auditoría branding web oficial (idmji.org)

| Elemento | Hallazgo en sitio | Aplicado en export |
|----------|-------------------|-------------------|
| **Color primario** | Navy `#1f2e85` (cabecera, bloques institucionales) | Cabecera documento, domingo mañana, pies |
| **Acento dorado** | `#b8964a`, gradientes `#c8a75a` → `#b8964a` | Franja superior, marco logo, separadores, `idmji.org` en pie |
| **Tipografía** | Montserrat (Google Fonts, tema BeTheme) | `ExportLayout` + enlace fuente en captura PNG |
| **Fondo página** | `#efefef` / gris claro | `#eef1f6` (`IDMJI_BRAND.pageBg`) |
| **Superficie** | Tarjetas blancas `#ffffff` | Tarjeta central con sombra suave |
| **Texto** | `#1a1a1a`, secundario `#555` | Cuerpo tabla y metadatos |
| **Enlaces** | Azul `#0a79db` | Reservado (gestor digital) |
| **Identidad** | CGMJCI, Hermana María Luisa Piraquive, NKJV | Subtítulo iglesia + `idmji.org` + CGMJCI en cabecera |

### Gaps conocidos (sitio vs export)

- El sitio muestra aviso PHP (Wordfence) en HTML — no afecta export.
- PDF usa Helvetica (limitación jsPDF); colores y estructura sí coinciden.
- Logo depende de `/logo.jpg` en el gestor (misma pieza que la app).

---

## 2. Implementación técnica

- **`exportBrand.ts`** — tokens únicos para PNG/PDF.
- **`ExportLayout.tsx`** — diseño premium: franja dorada, header navy degradado, logo con marco dorado, tabla con bordes semana en dorado.
- **`ExportPanel.tsx` (PDF)** — cabecera navy/dorado, colores de servicio desde tokens, pie con línea dorada y `idmji.org`.
- **`exportCapture.ts`** — fondo `pageBg` en PNG (marco gris institucional).

---

## 3. Test plan senior — ejecución

### A. Vista previa (WYSIWYG)

| # | Caso | Resultado esperado | Prioridad |
|---|------|-------------------|-----------|
| A1 | Abrir acordeón «Vista previa del documento» | Spinner → documento con cabecera navy/dorado | P0 |
| A2 | Comparar preview vs PNG descargado | Misma composición (WYSIWYG) | P0 |
| A3 | Zoom +/- y pinch (móvil) | 15%–250%, legible | P1 |
| A4 | Pantalla completa | Sin solapamiento con pestaña Exportar | P0 |

### B. PNG

| # | Caso | Resultado esperado | Prioridad |
|---|------|-------------------|-----------|
| B1 | Descargar PNG (mes con plan) | Archivo ≥ ancho tabla, cabecera branded | P0 |
| B2 | Abrir PNG en móvil (WhatsApp) | Texto legible, colores navy/dorado visibles | P0 |
| B3 | Mes 4–5 semanas | Sin recorte horizontal | P1 |

### C. PDF

| # | Caso | Resultado esperado | Prioridad |
|---|------|-------------------|-----------|
| C1 | Descargar PDF A3 horizontal | Franja dorada + banda navy superior | P0 |
| C2 | Imprimir PDF (100%) | Tabla nítida, bordes semana dorados | P1 |
| C3 | Pie de página | `idmji.org` + gestor + fecha + sacos | P0 |

### D. i18n

| # | Caso | Resultado esperado |
|---|------|-------------------|
| D1 | ES | Subtítulo iglesia en español, `idmji.org` |
| D2 | CA | Traducción catalana en roles/leyenda |

### E. Regresión funcional

| # | Caso | Resultado esperado |
|---|------|-------------------|
| E1 | Compartir (móvil) | PNG branded en share sheet |
| E2 | Sin plan | Mensaje vacío, sin export |
| E3 | Logo ausente | PDF/PNG sin romper (logo opcional) |

---

## 4. Checklist visual premium

- [ ] Franja dorada superior visible
- [ ] Cabecera navy con título blanco y subtítulo dorado
- [ ] Logo con marco dorado / fondo blanco
- [ ] Leyenda de servicios (jueves / dom mañana / dom tarde) coherente
- [ ] Separador de semanas en dorado (no gris plano)
- [ ] Pie con `idmji.org` destacado
- [ ] Fondo exterior gris claro en PNG (no blanco plano sin marco)

---

## 5. Criterios de aceptación

1. Usuario identifica el documento como material **oficial IDMJI** sin abrir el gestor.
2. PNG y PDF comparten la **misma jerarquía visual** (cabecera → tabla → pie).
3. Vista previa coincide con PNG exportado.
4. Colores alineados con **idmji.org** (navy + dorado), no paleta genérica gris/verde anterior.

---

## 6. Archivos modificados

- `src/app/dashboard/ofrenda/exportBrand.ts` (nuevo)
- `src/app/dashboard/ofrenda/ExportLayout.tsx`
- `src/app/dashboard/ofrenda/ExportPanel.tsx`
- `src/app/dashboard/ofrenda/exportCapture.ts`
- `src/app/dashboard/ofrenda/ofrendaLocale.ts`
- `src/lib/i18n/ofrendaKeys.ts`
