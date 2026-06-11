# Plano interactivo del Templo de Sabadell — Labor Ofrenda

> Plan maestro para incorporar el plano interactivo (`plano_png_interactivo_roles_v34`) al módulo
> **Labor Ofrenda** (`/dashboard/ofrenda`) como una nueva pestaña premium.
>
> **Estado (11/06/2026): Fase 1 COMPLETADA** — herramienta de calibración terminada con
> schema v3 (vistas **2D** y **3D** independientes) y calibración del usuario exportada.
> Fase 3 (pestaña Plano read-only) en curso. Pendientes de producto: validación visual 3D
> con el jefe y primer lote de nombres para el seed de Fase 4.

## Índice de documentos

| Doc | Contenido |
|---|---|
| [00-qa-analisis-html-v34.md](./00-qa-analisis-html-v34.md) | QA del HTML recibido: qué hace, qué está bien, hallazgos y riesgos |
| [01-arquitectura-integracion.md](./01-arquitectura-integracion.md) | QA de integración: dónde vive, librerías, modelo de datos, sistema de diseño |
| [02-fase-1-herramienta-calibracion.md](./02-fase-1-herramienta-calibracion.md) | Fase 1 — Herramienta HTML temporal para ubicar muñequitos/etiquetas |
| [03-fase-2-svg-premium.md](./03-fase-2-svg-premium.md) | Fase 2 — Plano SVG premium generado desde la configuración real de asientos |
| [04-fase-3-integracion-pestana.md](./04-fase-3-integracion-pestana.md) | Fase 3 — Pestaña "Plano" en Labor Ofrenda (modo 4/8 bloques según servicio) |
| [05-fase-4-edicion-persistencia.md](./05-fase-4-edicion-persistencia.md) | Fase 4 — Edición premium (drag, números editables, muñequitos) + Supabase |
| [06-fase-5-export-responsive.md](./06-fase-5-export-responsive.md) | Fase 5 — Export PNG/PDF, responsive desktop/tablet/móvil, dark mode, i18n |
| [07-fase-6-tests-qa-senior.md](./07-fase-6-tests-qa-senior.md) | Fase 6 — Plan de tests senior (unit, e2e, visual, a11y, RLS) y QA final |

## Resumen ejecutivo

- **Qué se recibió**: un HTML standalone (5,7 MB) con un plano PNG del templo embebido en base64,
  16 tarjetas arrastrables (8 bloques × Ofrendario + Apoyo), pan/zoom táctil, editor lateral,
  export PNG/JSON/CSV y persistencia en `localStorage`.
- **Dónde se integra**: nueva pestaña **"Plano"** dentro de `/dashboard/ofrenda` (4ª tab junto a
  Plan / Personas / Exportar). Comparte el `PlanCompleto` ya cargado y el sistema de diseño
  Liquid Glass del módulo.
- **Regla de negocio clave**: el nº de bloques visibles depende de la configuración de sacos del
  plan (`sacos_jueves=4`, `sacos_domingo=8`, `sacos_domingo_tarde=4` en `ofrenda_planes`):
  - Jueves → 4 bloques (4 columnas completas) → 4 Ofrendarios + 4 Apoyos = 8 tarjetas.
  - Domingo mañana → 8 bloques (cada columna partida en delantero/trasero) → 8+8 = 16 tarjetas.
  - Domingo tarde → 4 bloques, igual que jueves.
- **Dos representaciones del plano**:
  - **Opción A**: imagen PNG base actual (a la espera de la versión sin muñequitos integrados).
  - **Opción B (recomendada)**: SVG premium generado por código desde la configuración real de
    asientos del templo — escalable, theming, bloques 4/8 dinámicos sin necesitar dos fotos.
- **Editable**: nombres, etiquetas, **números de bloque** y **muñequitos movibles** (dejan de
  estar "pegados" a la foto). Solo `ADMIN`/`EDITOR` editan (mismo `canEdit` del módulo).
- **Persistencia**: Supabase (nuevas tablas `ofrenda_plano_*` con RLS), no `localStorage`.
- **Nombres con lista viva de personas**: al escribir un nombre se autocompleta contra la tabla
  `ofrenda_plano_personas`; si no existe, botón «Añadir "X" a la lista» lo crea al instante.
  La lista se alimenta sola con el uso (el usuario no tiene aún el listado completo; pasará
  un primer lote de nombres en texto que se sembrará en la migración).

## Configuración real de asientos (dato del usuario)

Templo de Sabadell — 4 columnas, numeradas **de derecha a izquierda** (vista desde el púlpito:
columna 1 a la derecha, columna 4 a la izquierda). Coincide con la numeración de bloques
(1 delante-derecha … 4 delante-izquierda en modo 4 sacos).

| Columna | Filas | Asientos/fila | Total |
|---|---|---|---|
| 1 (derecha) | 18 | 8 | 144 |
| 2 | 20 | 11 | 220 |
| 3 | 17 | 10 | 170 |
| 4 (izquierda) | 16 | 8 | 128 |
| **Total** | | | **662** |

## Orden de ejecución

```
Fase 1 (calibración) ──► usuario ubica muñequitos/etiquetas ──► JSON de posiciones  ✅ HECHA
Fase 2 (SVG premium) ──► SVG 2D generado por código (buildSvg en la herramienta)    ✅ EN HTML
Fase 3 (pestaña Plano, read-only) ──► Fase 4 (edición + Supabase)                   ⏳ EN CURSO
Fase 5 (export + responsive) ──► Fase 6 (tests + QA final)
```

## Modelo de datos vigente (schema v3 — 11/06/2026)

La calibración usa **dos vistas con coordenadas independientes**:

| Vista | Lienzo | Fondo | Púlpito/alfolí |
|---|---|---|---|
| **2D** (esquema vectorial) | 1448 × 1316 | SVG generado por código (`buildSvg`) | Overlays editables |
| **3D** (fotos IA) | 1024 × 768 | `plano-3d-sacos-8.jpg` / `plano-3d-sacos-4.jpg` según modo | Integrados en la foto (sin overlay) |

```jsonc
{
  "schemaVersion": 3,
  "modo": "sacos_8" | "sacos_4",
  "vista": "2d" | "3d",
  "vistas": {
    "2d": { "lienzo": {...}, "layout": {...}, "sacos_8": {...}, "sacos_4": {...} },
    "3d": { "lienzo": {...}, "layout": {...}, "fondos": {...}, "sacos_8": {...}, "sacos_4": {...} }
  }
}
```

Calibración oficial: [herramienta/plano-calibracion-default.json](./herramienta/plano-calibracion-default.json)
(export del usuario `2026-06-11T13:47:19.316Z`). Será el seed de la migración de Fase 4
(4 packs: 2d×8, 2d×4, 3d×8, 3d×4).

## Decisiones tomadas

0. ✅ **Dos representaciones 2D/3D con coordenadas independientes** (decidido 11/06/2026):
   la vista 2D es el SVG vectorial generado por código y la 3D usa fotos generadas por IA
   (una por modo 4/8 sacos). Las posiciones de tarjetas/muñequitos/números **no se comparten**
   entre vistas. En 3D el púlpito y el alfolí van en la propia foto (sin overlay editable).
1. ✅ **Nombres en el plano** (decidido 11/06/2026): combobox con autocompletar contra
   `ofrenda_plano_personas` (nombre y apellido). Si el nombre escrito no existe → botón
   «Añadir» que lo inserta en Supabase y lo selecciona. La lista se alimenta de forma
   incremental con el uso. El usuario pasará un primer lote de nombres en texto (seed).
   No se vincula a `ofrenda_miembros` (son colectivos distintos).

## Preguntas abiertas (resolver antes/durante Fase 3)

2. **Alcance del layout**: ¿posiciones globales por modo (4 sacos / 8 sacos) y nombres por
   servicio concreto? (propuesta por defecto) ¿o todo por servicio?
3. ✅ **Mapeo bloques ↔ columnas** (decidido 11/06/2026): columnas y bloques comparten la
   misma numeración de derecha a izquierda — bloque 1 = columna 1 (derecha), bloque 4 =
   columna 4 (izquierda); en modo 8, bloques 1–4 delanteros y 5–8 traseros por columna.
4. **Foto sin muñequitos**: pendiente de que el usuario la entregue (solo afecta a Opción A).
5. **Otros valores de sacos**: la config admite 1–20; el plano soporta de inicio 4 y 8.
   Para otros valores se muestra aviso "disposición no configurada" (extensible más adelante).
6. **Primer lote de nombres**: pendiente de que el usuario pase el texto con las personas que
   ya han hecho la labor (seed de `ofrenda_plano_personas`).
