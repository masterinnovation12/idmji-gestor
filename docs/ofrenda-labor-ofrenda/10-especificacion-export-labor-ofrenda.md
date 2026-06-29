# 10 — Especificación export «Labor Ofrenda» (plano + lista)

> Basado en mockups del usuario (jun 2026) + mejoras acordadas.  
> Referencias visuales en repo:  
> - Plano: `assets/...WhatsApp_Image_2026-06-27_at_23.08.51-....png`  
> - Lista: `assets/...WhatsApp_Image_2026-06-27_at_23.45.13-....png`

## Principio: cabecera homogénea

**Un solo componente de cabecera** (`LaborOfrendaExportHeader`) usado por:

1. PNG plano (lienzo 3D/2D debajo)
2. PNG lista (tabla debajo)
3. (Opcional v2) PDF lista

Así logo, tipografías y colores son idénticos en ambos formatos.

### Mejoras respecto al mockup

| Aspecto | Mockup actual | Propuesta implementación |
|---------|---------------|--------------------------|
| Logo | ~80px, pequeño vs título | **110–120px** cuadrado, borde dorado (como `ExportHeaderBlock` 92px → subir a **112px**) |
| Jerarquía texto | Título dominante, iglesia pequeña | Mantener: línea iglesia → **Labor Ofrenda** → fecha/turno |
| Alineación | Logo izq, texto centro en lista; plano similar | **Misma plantilla** en ambos: cluster logo + bloque texto centrado en cabecera |
| Fecha | `Domingo 28/06/2026` / `… Mañana` | i18n + `date-fns`: incluir **turno** (Mañana / Tarde / Jueves) siempre en lista; en plano opcional en subtítulo |
| Ancho cabecera | 100 % del export | 100 % — el lienzo/tabla heredan el mismo `exportWidthPx` |

### Tokens (reutilizar `exportBrand.ts`)

```
Fondo cabecera:  IDMJI_BRAND.headerGradient
Texto principal: #ffffff, Montserrat 800
Fecha/turno:     IDMJI_BRAND.textGold / goldLight
Borde logo:      IDMJI_BRAND.goldGradient, radius 14px
Línea iglesia:   11px uppercase, blanco 85 % opacidad
```

### Estructura cabecera (wireframe)

```
┌────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ gradiente navy ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                                            │
│     ┌──────────┐   IGLESIA DE DIOS MINISTERIAL…            │
│     │  LOGO    │   Labor Ofrenda                          │
│     │  112×112 │   Domingo 28 jun 2026 · Mañana           │
│     └──────────┘   (dorado)                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

En **plano PNG**: el lienzo va pegado debajo sin gap (o 8px blanco).  
En **lista PNG**: tabla con esquinas superiores rectas pegadas a cabecera.

---

## Formato A — PNG plano (3D/2D)

### Contenido (ya existe en `planoExportPng.ts`)

- Fondo templo (foto 3D o SVG 2D)
- Discos de bloque numerados
- Muñequitos + tarjetas `{n}- OFRENDARIO` / `{n}- APOYO` + nombre
- Colores por bloque (calibración)

### Cambio

1. Crear canvas alto = `headerH + lienzoH`
2. Dibujar cabecera homogénea arriba
3. Dibujar lienzo escalado al ancho útil (mantener ratio)

### Metadatos archivo

```
labor-ofrenda-plano-{fecha}-{jueves|dom-manana|dom-tarde}-{2d|3d}.png
```

### Ejemplo mockup (domingo mañana, 8 sacos)

Parejas visibles en asignación ejemplo: Galvis–Noemy, Méndez–Edith, Pichardo–Mayela, Collazos–Marleny, Tangarife–Biedma*, Simoes–Nallivi, **Ramiro–Gleidis**, Fanny–Aroa.

\* En mockup lista fila 5 aparece Milton Castiblanco — tratar como dato de ejemplo, no canon.

---

## Formato B — PNG lista

### Cuándo

Toggle en panel export labor ofrenda: **Plano** | **Lista**.

### Alcance

| Alcance | Salida |
|---------|--------|
| Un servicio | 1 PNG lista (4 u 8 filas según sacos) |
| Semana (P5) | 3 PNG o 1 PNG con 3 tablas apiladas (recomendado: **3 archivos en ZIP** o 3 descargas) |
| Mes | ZIP de N listas |

### Tabla

| Columna | i18n ES | i18n CA (borrador) | Contenido |
|---------|---------|-------------------|-----------|
| PUESTO | Puesto | Lloc | Número bloque 1…N |
| RESPONSABLE | Responsable | Responsable | Nombre `ofrendario` |
| APOYO | Apoyo | Suport | Nombre `apoyo` |

- Cabecera tabla: fondo `IDMJI_BRAND.navy`, texto blanco, bold
- Filas: zebra `#ffffff` / `#eef2fa` (domingo) — color de acento según `SERVICE_EXPORT_COLORS[dia_tipo]`
- Números puesto: bold navy
- Nombres: bold negro

### Pie (mockup)

Franja dorada fina + texto centrado:

- ES: `Puestos de ofrenda y apoyo`
- CA: `Llocs d'ofrena i suport`

### Orden de filas

Orden **numérico por bloque** 1 → N (no por pareja).

Cada fila = una pareja ofrendario+apoyo del mismo bloque en el plano.

### Regla P2

Una persona solo aparece **una vez** por servicio (en una sola fila).

### Implementación

Nuevo `PlanoListExportLayout.tsx` (HTML para captura, como `ExportLayout`) **o** canvas puro en `planoExportListPng.ts`.

Recomendación: **html-to-image** con mismo patrón que `exportCapture.ts` para tabla (tipografía Montserrat fiel al mockup).

---

## Panel UI export labor ofrenda

Ubicación: sección **Labor ofrenda** → sub-pestaña **Exportar**.

| Control | Opciones |
|---------|----------|
| Formato | Plano · Lista |
| Vista (solo plano) | 2D · 3D |
| Alcance | Servicio actual · Semana · Mes |
| Descargar | PNG · (lista: PNG; ZIP si >1) |

---

## Datos de negocio confirmados (actualización)

| Tema | Decisión |
|------|----------|
| P5 Semana | Siempre **jueves + dom AM + dom PM** misma semana ISO |
| P3 Eymy, Maria del Mar, Georgina, Leni | `capacidad = ambos` |
| P3 Solo apoyo | **María Edilma Moreno**, **Gleidis Amador** |
| Yicely Ruiz | Mujer, sin pareja, sin reglas especiales |
| Pareja nueva | Gleidis ↔ Ramiro Zapata |

---

## Checklist implementación

- [ ] `LaborOfrendaExportHeader` compartido (React + canvas)
- [ ] Logo 112px, borde dorado, cluster centrado
- [ ] `exportPlanoPngPremium()` con cabecera
- [ ] `PlanoListExportLayout` + captura PNG
- [ ] i18n claves ES/CA
- [ ] Renombrar slug export labores generales (`plan-labores-…`)
- [ ] Tests snapshot cabecera (opcional)
- [ ] P1 turnos (pendiente imágenes usuario)

---

## Pendiente P1

Listas por turno (jueves / domingo mañana / domingo tarde) — usuario enviará en siguiente mensaje.
