# 06 — Exportación PNG: Labor ofrenda (plano premium)

## Situación actual

| Export | Archivo | Cabecera premium | Alcance |
|--------|---------|------------------|---------|
| Labores generales | `ExportPanel.tsx` + `exportCapture.ts` | ✅ `ExportHeaderBlock` | Mes / semana |
| Plano templo | `planoExportPng.ts` | ❌ | 1 servicio |

## Objetivo

Nueva exportación **Labor ofrenda** que:

1. Use el **mismo renderer** del plano (`planoExportPng.ts`) — fondo, discos, muñequitos, tarjetas.
2. Añada **cabecera premium** (logo + gradiente navy + título) como `ExportHeaderBlock.tsx`.
3. Permita alcance **semana** o **mes** (múltiples servicios).
4. Sea accesible desde pestaña **Exportar plano** (sección Labor ofrenda), no mezclada con export de labores generales.

## Referencia visual existente

Assets de marca en `exportBrand.ts`:

```typescript
IDMJI_BRAND.headerGradient  // linear-gradient navy
IDMJI_BRAND.navy
SERVICE_EXPORT_COLORS       // jueves verde, dom navy, dom tarde violeta
```

Cabecera PNG: `ExportHeaderBlock.tsx`  
Cabecera PDF: `drawExportPdfHeader.ts`  
Layout métricas: `exportHeaderLayout.ts`

## Formato propuesto — un servicio

```
┌──────────────────────────────────────────────┐
│  [LOGO]   LABOR OFRENDA — IDMJI Sabadell     │  ← gradiente premium
│           Jueves 5 de junio de 2026          │
│           4 sacos · Plano 2D                 │
├──────────────────────────────────────────────┤
│                                              │
│         [Lienzo plano — canvas 2×]           │
│         muñequitos + tarjetas + bloques      │
│                                              │
└──────────────────────────────────────────────┘
```

## Formato propuesto — semana (3 servicios)

Opciones (pendiente confirmación usuario — ver P7):

### Opción A — PNG único apilado

3 lienzos verticales bajo una cabecera común:

```
┌─────────────────────────────────┐
│ Cabecera: Semana 23 · jun 2026  │
├─────────────────────────────────┤
│ Jueves 5 jun — 4 sacos          │
│ [lienzo]                        │
├─────────────────────────────────┤
│ Domingo 8 jun mañana — 8 sacos  │
│ [lienzo]                        │
├─────────────────────────────────┤
│ Domingo 8 jun tarde — 4 sacos   │
│ [lienzo]                        │
└─────────────────────────────────┘
```

### Opción B — ZIP con 3 PNG

Un archivo por servicio + cabecera individual (más ligero por imagen).

### Opción C — PDF multipágina

Reutilizar pipeline PDF de labores con páginas por servicio.

**Recomendación inicial:** Opción A para WhatsApp (un solo archivo); Opción B como alternativa en UI.

## Formato propuesto — mes completo

~12–13 servicios/mes → PNG apilado muy largo o ZIP obligatorio.

**Recomendación:** mes = **ZIP de PNG** o **PDF multipágina**; no un PNG infinito.

## Implementación técnica

### Fase 1 — Cabecera en export single-servicio

```typescript
// planoExportPng.ts
export interface PlanoExportPremiumOptions {
  header: {
    title: string           // i18n
    subtitle: string        // fecha + tipo día
    periodLabel?: string    // semana opcional
    logoUrl: string         // '/logo.jpg'
  }
  brand: typeof IDMJI_BRAND
}

export async function exportPlanoPngPremium(
  data: PlanoDisplayData,
  labels: PlanoExportLabels,
  options: PlanoExportPremiumOptions,
  filename: string,
): Promise<void>
```

Render:

1. Calcular altura total = `headerHeight + canvasHeight`.
2. Dibujar gradiente + logo + textos (portar lógica de `ExportHeaderBlock` a canvas).
3. Dibujar lienzo debajo (código actual).
4. `toBlob` + download.

### Fase 2 — Panel export plano

Nuevo `PlanoExportPanel.tsx`:

| Control | Igual que |
|---------|-----------|
| Alcance mes/semana | `ExportScopeControls` |
| Vista 2D/3D | toggle de `PlanoTab` |
| Semana selector | `exportWeekUtils` |
| Botón descargar | acción async con loading |

### Fase 3 — Multi-servicio

```typescript
export async function exportPlanoPngBatch(
  servicios: PlanoServicioExportInput[],
  options: PlanoExportBatchOptions,
): Promise<void>
```

## Nombre de archivo

```
labor-ofrenda-sabadell-2026-06-semana-23.png
labor-ofrenda-sabadell-2026-06-jueves-05-2d.png
labor-ofrenda-sabadell-2026-06-completo.zip
```

## i18n (borrador)

| Clave | ES |
|-------|-----|
| `ofrenda.planoExport.title` | Exportar plano de ofrenda |
| `ofrenda.planoExport.desc` | Imagen del templo con nombres asignados |
| `ofrenda.planoExport.scope.week` | Semana |
| `ofrenda.planoExport.scope.month` | Mes completo |
| `ofrenda.planoExport.format.zip` | Descargar ZIP |
| `ofrenda.planoExport.format.single` | Una imagen |

## Qué reutilizar sin duplicar

| Módulo | Uso |
|--------|-----|
| `exportBrand.ts` | Colores |
| `exportHeaderLayout.ts` | Centrado logo+texto |
| `getTituloMes` / `ofrendaLocale.ts` | Fechas localizadas |
| `planoExportPng.ts` | Core lienzo |
| `ExportScopeControls.tsx` | Patrón UI |

## Qué NO incluir en v1

- Captura DOM / html-to-image (mantener canvas dedicado).
- Export del plano desde pestaña Exportar labores generales.

## Criterios de aceptación QA

- [ ] Cabecera visualmente alineada con export labores (mismo gradiente, logo redondeado).
- [ ] Textos pasan por i18n ES/CA.
- [ ] Jueves 4 sacos / domingo 8 / domingo tarde 4 respetados.
- [ ] Nombres y roles coinciden con asignaciones del servicio.
- [ ] Semana exporta los 3 servicios de esa semana.
- [ ] Funciona en móvil (descarga navegador).

## Pendiente del usuario

Detalle exacto del layout de cabecera y si prefiere ZIP vs imagen única para mes/semana — ver [07-preguntas-abiertas.md](./07-preguntas-abiertas.md) P7.
