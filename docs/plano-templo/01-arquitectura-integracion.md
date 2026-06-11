# QA — Arquitectura de integración en IDMJI Gestor

## 1. Dónde vive: pestaña "Plano" dentro de Labor Ofrenda (decisión)

Se evaluaron dos opciones:

| Opción | Pros | Contras |
|---|---|---|
| **A. Nueva pestaña en `/dashboard/ofrenda`** ✅ | Reutiliza `PlanCompleto` ya cargado (plan, servicios, sacos, miembros), comparte `canEdit`, feedback liquid y navegación existente; el plano **depende** de la config de sacos del plan → cohesión natural. | La página crece (ya tiene 74 archivos en la carpeta). |
| B. Subpágina `/dashboard/ofrenda/plano` | URL propia, code-splitting automático. | Duplicar carga de datos/cabecera, salto de contexto al cambiar de servicio, no comparte el estado del mes seleccionado. |

**Decisión: Opción A** — añadir `'plano'` al union `Tab` de `OfrendaPageClient.tsx`
(`'plan' | 'personas' | 'exportar' | 'plano'`), con icono `Map`/`LayoutGrid` de lucide y
carga perezosa (`next/dynamic`) del componente pesado para no penalizar las otras pestañas.

```
src/app/dashboard/ofrenda/
└── plano/
    ├── PlanoTab.tsx              # Contenedor de pestaña: selector de servicio + lienzo
    ├── PlanoCanvas.tsx           # Stage pan/zoom + capa de tarjetas/muñequitos
    ├── PlanoSvgTemplo.tsx        # Opción B: plano SVG generado desde config asientos
    ├── PlanoImageBase.tsx        # Opción A: PNG estático optimizado
    ├── PlanoCard.tsx             # Tarjeta nombre+rol (auto-ancho, drag)
    ├── PlanoFigure.tsx           # Muñequito SVG movible
    ├── PlanoBlockLabel.tsx       # Número de bloque editable y movible
    ├── PlanoEditorSheet.tsx      # Editor lateral desktop / bottom-sheet móvil
    ├── PersonaCombobox.tsx       # Autocompletar + «Añadir a la lista» (popover/sheet)
    ├── planoLayout.ts            # Motor puro: bloques desde config de sacos/asientos
    ├── planoPersonas.ts          # Normalización/búsqueda de nombres (puro, testeable)
    ├── planoTypes.ts             # Tipos del dominio plano
    └── planoActions.ts           # Server actions (layout, asignaciones, personas)
```

## 2. Regla de negocio: bloques según sacos del plan

Fuente de verdad: `ofrenda_planes.sacos_jueves | sacos_domingo | sacos_domingo_tarde`
(ya editable en `SacosConfigPanel`). El plano **no** define su propio número de sacos.

```
resolverModo(servicio, plan):
  sacos = plan.sacos_<dia_tipo del servicio>
  sacos === 8 → modo "8 bloques": cada columna partida en bloque delantero + trasero
                → 8 Ofrendarios + 8 Apoyos (16 tarjetas, 16 muñequitos)
  sacos === 4 → modo "4 bloques": una columna completa por bloque
                → 4 Ofrendarios + 4 Apoyos (8 tarjetas, 8 muñequitos)
  otro valor  → banner "Disposición de N sacos sin plano configurado" (no rompe)
```

El usuario selecciona el **servicio** (fecha + jueves/dom. mañana/dom. tarde) con el mismo
patrón de chips/segmentos del módulo, y el plano se reconfigura con animación (framer-motion
layout) entre 4 ⇄ 8 bloques.

## 3. Librerías (recomendación)

Principio: **mínimas dependencias nuevas**; el proyecto ya tiene casi todo.

| Necesidad | Solución | ¿Nueva dep? |
|---|---|---|
| Pan + pinch-zoom del lienzo | **`react-zoom-pan-pinch`** (~12 kB gz, mantenida, pinch táctil + wheel + doble tap, API React 19 compatible) | ✅ Sí (única) |
| Drag de tarjetas/muñequitos/números | Pointer Events propios conscientes de escala (patrón del v34, probado). framer-motion `drag` no es fiable dentro de contenedores con `scale`. | No |
| Animaciones (cambio 4⇄8, sheets, tabs) | `framer-motion` (ya instalada) | No |
| Plano SVG premium | SVG generado por código propio desde la config de asientos (sin librería) | No |
| Export PNG/PDF | Canvas dedicado (fidelidad, como v34) + `jspdf` ya instalada; alternativa `html-to-image` ya usada en Exportar | No |
| Iconos / muñequitos | `lucide-react` para UI; muñequitos como SVG propio (silueta premium con el color del bloque) | No |
| Modales/notificaciones | `OfrendaLiquidShell` + `ofrendaFeedback` (sistema actual del módulo) | No |

> Skill a usar durante la implementación: **`frontend-ui-engineering`**
> (`C:\Users\JeffreyBolaños\.codex\skills\frontend-ui-engineering\SKILL.md`) — es la indicada
> para construir UI con calidad de producción. Para los e2e: skill **`playwright`**.

## 4. Modelo de datos (Supabase)

Dos conceptos separados:

### 4.1 `ofrenda_plano_layouts` — geometría (global por modo × vista)

> **Actualizado 11/06/2026**: la calibración (schema v3) tiene **dos vistas con coordenadas
> independientes** — `2d` (SVG vectorial, lienzo 1448×1316) y `3d` (foto IA, lienzo 1024×768,
> una imagen por modo). El modelo pasa de "una fila por modo" a **una fila por (modo, vista)**
> → 4 filas seed: `(sacos_4, 2d)`, `(sacos_8, 2d)`, `(sacos_4, 3d)`, `(sacos_8, 3d)`.

Posiciones de tarjetas, muñequitos y números de bloque. Editar un layout afecta a todos los
servicios de ese modo (es la disposición física del templo, no cambia por semana).

```sql
create table ofrenda_plano_layouts (
  id uuid primary key default gen_random_uuid(),
  modo text not null check (modo in ('sacos_4','sacos_8')),
  vista text not null check (vista in ('2d','3d')),
  fondo text not null default 'svg' check (fondo in ('svg','jpg')),  -- 2d→svg, 3d→jpg
  elementos jsonb not null,        -- ver esquema abajo
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (modo, vista)
);
```

`elementos` (versionado con `schemaVersion: 3`, mismo formato que el pack por modo del JSON
de calibración — ver [README](./README.md#modelo-de-datos-vigente-schema-v3--11062026)):

```jsonc
{
  "schemaVersion": 3,
  "lienzo": { "w": 1448, "h": 1316 },          // 3d: { "w": 1024, "h": 768 }
  "layout": { /* tarjetas, etiquetaBloque, figuraScale; solo 2d: pulpito, alfolid, asiento… */ },
  "fondoSrc": null,                             // 3d: "plano-3d-sacos-8.jpg"
  "bloques": [
    { "n": 1, "color": "#ec2f87", "labelPos": { "x": 1266, "y": 728 }, "labelText": "1" }
  ],
  "posiciones": [   // tarjetas y muñequitos, coords en px del lienzo natural de SU vista
    { "id": "B1-ofrendario", "bloque": 1, "rol": "ofrendario",
      "card": { "x": 1193, "y": 929 }, "figura": { "x": 1126, "y": 863 } },
    { "id": "B1-apoyo", "bloque": 1, "rol": "apoyo",
      "card": { "x": 1340, "y": 927 }, "figura": { "x": 1403, "y": 863 } }
  ]
}
```

El seed de la migración se genera desde `herramienta/plano-calibracion-default.json`
(`vistas.2d.sacos_8`, `vistas.2d.sacos_4`, `vistas.3d.sacos_8`, `vistas.3d.sacos_4`, cada uno
con el `layout` y `lienzo` de su vista). Las fotos 3D se sirven desde
`public/plano-templo/` (no Supabase Storage; son assets estáticos del repo).

### 4.2 `ofrenda_plano_personas` — lista viva de personas (decidido)

Directorio de personas que pueden hacer la labor (nombre y apellido). **No** se vincula a
`ofrenda_miembros` (son colectivos distintos). La lista se alimenta incrementalmente: al
escribir un nombre que no existe, el editor puede añadirlo al instante desde el combobox.

```sql
create table ofrenda_plano_personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                  -- "Nombre Apellido" tal como se muestra
  nombre_normalizado text not null,      -- lower + sin tildes + espacios colapsados (servidor)
  activo boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (nombre_normalizado)            -- anti-duplicados ("José Pérez" = "jose perez")
);
create index ofrenda_plano_personas_busqueda
  on ofrenda_plano_personas (nombre_normalizado text_pattern_ops);
```

- Seed inicial: lote de nombres en texto que pasará el usuario (pendiente nº 6 del README).
- Normalización en servidor (server action), no en SQL, para mantener una sola implementación
  testeada en Vitest.
- Borrado = `activo=false` (soft delete; las asignaciones históricas conservan el nombre).

### 4.3 `ofrenda_plano_asignaciones` — quién lleva cada saco (por servicio)

```sql
create table ofrenda_plano_asignaciones (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references ofrenda_servicios(id) on delete cascade,
  bloque smallint not null check (bloque between 1 and 8),
  rol text not null check (rol in ('ofrendario','apoyo')),
  persona_id uuid references ofrenda_plano_personas(id) on delete set null,
  nombre_snapshot text,                  -- copia del nombre al asignar (histórico estable)
  unique (servicio_id, bloque, rol)
);
```

**RLS** (las 3 tablas): mismas políticas que el resto de `ofrenda_*` — lectura autenticados,
escritura `profiles.rol IN ('ADMIN','EDITOR')`. **Server actions** con `requireEditor()`.

### 4.4 Flujo del combobox de nombres (UX clave, mobile-first)

```
escribe "mar" ──► búsqueda con debounce 200 ms sobre nombre_normalizado
   ├─ hay coincidencias ──► lista de sugerencias (resalta el fragmento) ──► tap = seleccionar
   └─ sin coincidencia exacta ──► fila destacada: [+ Añadir «María…» a la lista]
            └─ tap ──► createPersona() ──► seleccionada + toast liquid «Añadida a la lista»
```

- Desktop/tablet: popover anclado al input (máx. 6 resultados, teclado ↑/↓/Enter).
- **Móvil (uso principal)**: al tocar el input se abre sheet liquid a pantalla casi completa
  con input arriba (autofocus, `inputmode` correcto), lista grande táctil y el botón «Añadir»
  fijo abajo — patrón ya existente en `PersonaPicker`/`OfrendaLiquidShell`.
- Anti-duplicados en el cliente (aviso si la normalización coincide) y en BD (constraint).

La migración inicial siembra `sacos_8` con las posiciones del JSON del v34 (corrigiendo las
inconsistencias H5) y `sacos_4` con un layout derivado (se recalibra con la herramienta de
la Fase 1).

## 5. Sistema de diseño (premium enterprise)

Se respeta al 100 % el lenguaje **Liquid Glass** del módulo:

- **Modales y confirmaciones**: `OfrendaLiquidShell` (backdrop navy `rgba(21,31,92,.58)` +
  blur, marco dorado `#b8964a`). Nada de `prompt/alert/confirm` nativos (hallazgo H6).
- **Notificaciones**: `useOfrendaToast()` (`planSuccess`, `planError`…) — éxito auto-cierre
  ~6 s, errores con botón «Entendido». Igual que guardar plan/sacos hoy.
- **Acentos por turno** ya existentes: jueves emerald, dom. mañana sky, dom. tarde violet —
  se reutilizan en el selector de servicio del plano.
- **Colores de bloque**: los 8 del prototipo (`#ec2f87`, `#14b8b8`, `#f97316`, `#1688ff`,
  `#7e22ce`, `#13843d`, `#f4b000`, `#0b4bb3`) como tokens en `planoTypes.ts`, consistentes
  entre SVG, tarjetas, muñequitos y export.
- **Dark mode**: la página usa tokens `dark:`; el lienzo del plano mantiene fondo claro
  controlado (como `ofrenda-liquid-surface` con `color-scheme: light`) para fidelidad de la
  imagen/SVG, con marco y chrome adaptados al tema.
- **Responsive**:
  - Desktop ≥1280: lienzo + editor lateral fijo (grid 2 columnas, como el v34).
  - Tablet 768–1279: lienzo a todo ancho, editor como panel deslizante lateral.
  - Móvil <768: lienzo fullscreen, editor bottom-sheet con asa y drag-to-dismiss
    (portando la física del v34), toolbar táctil ≥44 px, `safe-area-inset`.

## 6. Permisos

| Rol | Plano |
|---|---|
| ADMIN / EDITOR | Ver + editar (drag, nombres, números, guardar, reset) |
| USER / MIEMBRO / SONIDO | Solo ver (pan/zoom y export sí; sin drag ni inputs) |

Triple capa como el resto del módulo: RLS + `requireEditor()` en actions + prop `canEdit` en UI.
