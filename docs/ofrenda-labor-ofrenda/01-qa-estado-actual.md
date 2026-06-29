# 01 — QA: estado actual de `/dashboard/ofrenda`

## Alcance del análisis

Página única en `src/app/dashboard/ofrenda/` con **4 pestañas cliente** (sin sub-rutas). Orquestador: `OfrendaPageClient.tsx`.

## Mapa de pestañas actual

| # | Pestaña | i18n | Pertenece a | Requiere plan |
|---|---------|------|-------------|---------------|
| 1 | Plan | `ofrenda.tabs.plan` | **Labores generales** | — |
| 2 | Personas | `ofrenda.tabs.people` | **Ambos** (sub-vistas) | No |
| 3 | Exportar | `ofrenda.tabs.export` | **Labores generales** | Sí |
| 4 | Plano Ofrenda | `ofrenda.tabs.plano` | **Labor ofrenda** | Sí |

## Hallazgos QA — Críticos

### QA-01: Dos productos bajo un mismo paraguas

**Severidad:** Alta (confusión de producto)

El título de página es `ofrenda.title` («Labores») y las 4 pestañas están al mismo nivel visual. Un usuario no distingue:

- Lo que se **genera automáticamente** (tabla mensual).
- Lo que se **asigna en el mapa del templo** (ofrendario/apoyo por bloque).

**Evidencia:** pestañas planas en `TAB_DEFS` (`OfrendaPageClient.tsx` líneas 27–32).

---

### QA-02: Dos exportaciones PNG con el mismo verbo «Exportar»

**Severidad:** Alta

| Exportación | Ubicación | Contenido | Cabecera premium |
|-------------|-----------|-----------|------------------|
| Plan mensual/semanal | Pestaña **Exportar** → `ExportPanel.tsx` | Tabla roles G1/G2, vigilancia… | ✅ `ExportHeaderBlock` |
| Plano del templo | Pestaña **Plano** → `planoExportPng.ts` | Lienzo 2D/3D, muñequitos, tarjetas | ❌ Sin cabecera |

El usuario pide una **tercera necesidad**: export PNG del plano **con** cabecera premium, distinta de la exportación de labores generales.

---

### QA-03: Personas — dos universos con nombres ambiguos

**Severidad:** Media-Alta

Sub-pestañas en Personas (`personasView`):

| Sub-vista | Etiqueta UI | Tabla BD | Personas |
|-----------|-------------|----------|----------|
| `miembros` | «Coordinación y apoyo» | `ofrenda_miembros` | ~G1+G2 del plan |
| `plano` | «Ofrendario y apoyo» | `ofrenda_plano_personas` | 64 del plano |

No queda claro que son **listas independientes** (documentado en `01-arquitectura-integracion.md`: sin FK entre tablas).

---

### QA-04: Plano sin generación automática

**Severidad:** Alta (gap funcional)

- Asignación **100 % manual** vía `PlanoPersonaCombobox` por servicio × bloque × rol.
- `ofrenda_plano_parejas` existe en BD (16 parejas) pero **cero código** en `src/`.
- No hay motor equivalente a `ofrendaEngine.ts` para el plano.

---

### QA-05: Sin agrupación por turno en plano personas

**Severidad:** Alta (requisito nuevo)

`ofrenda_miembros` tiene `puede_jueves`, `puede_domingo_manana`, `puede_domingo_tarde` + UI en `MiembrosManager` / `MemberTurnAvailability`.

`ofrenda_plano_personas` **no tiene** esas columnas ni UI equivalente.

---

### QA-06: Sin género explícito en plano personas

**Severidad:** Media (bloqueante para reglas de asignación)

Regla de negocio pedida:

- Hombre + hombre (ofrendario + apoyo)
- Mujer + mujer
- Mixto **solo si son pareja**

Hoy el género solo se infiere indirectamente de `ofrenda_plano_parejas` (mujer_persona_id / hombre_persona_id). Las 32 personas sin pareja no tienen género en BD.

---

### QA-07: Capacidad no aplicada en BD

**Severidad:** Media

Documento `docs/plano-templo/clasificacion-ofrendario-sobres.md` define quién es solo apoyo (Eymy, Maria del Mar, Georgina, Leni…). En Supabase las **64 personas tienen `capacidad = ambos`**. La UI permite cambiar capacidad pero no se ha aplicado el seed de clasificación.

---

### QA-08: Orden de pestañas no sigue el flujo mental

**Severidad:** Baja-Media

Orden actual: **Plan → Personas → Exportar → Plano**

Flujo natural labor ofrenda: **Personas plano → Generar plano → Plano → Exportar PNG**

Flujo natural labores generales: **Personas miembros → Plan → Exportar**

El plano interactivo queda al final, separado de su exportación.

---

### QA-09: Navegación de mes solo en pestaña Plan

**Severidad:** Media

`PlanMonthNavigator` solo visible en `activeTab === 'plan'`. Plano y Exportar muestran `tituloMes` pero no permiten cambiar mes sin volver a Plan.

---

### QA-10: Sin deep linking de pestañas

**Severidad:** Baja

Al recargar siempre vuelve a pestaña Plan. No hay `?tab=plano` ni hash.

---

### QA-11: Inconsistencia de copy

**Severidad:** Baja

`ofrenda.export.empty.desc` menciona «pestaña Plan Mensual» pero la pestaña se llama «Plan».

---

### QA-12: Ancho de layout desalineado

**Severidad:** Baja (visual)

Cabecera/tabs: `max-w-5xl`. Contenido Plan/Plano: `xl:max-w-7xl`.

---

## Hallazgos QA — Lo que funciona bien

| Área | Estado | Notas |
|------|--------|-------|
| Generación plan mensual G1/G2 | ✅ | `ofrendaEngine.ts`, turnos, puestos fijos, anti-repetición |
| Config sacos 4/8 por turno | ✅ | `SacosConfigPanel`, `sacosParaDia()` |
| Plano 2D/3D calibrado | ✅ | Modos `sacos_4` / `sacos_8` según día |
| Export PNG plano (sin header) | ✅ | Canvas 2×, muñequitos, tarjetas |
| Export PNG/PDF labores | ✅ | Cabecera premium, alcance mes/semana |
| Rescate asignaciones plano al regenerar | ✅ | `planoRescue.ts` |
| i18n ES/CA | ✅ | Claves en `ofrendaKeys.ts` |
| RLS parejas | ✅ | Lectura auth, escritura ADMIN/EDITOR |
| Tests plano personas | ✅ | `PlanoPersonasManager.test.tsx` |

---

## Matriz de cobertura vs. requisitos nuevos

| Requisito usuario | Existe | Gap |
|-------------------|--------|-----|
| Diferenciar labores generales vs labor ofrenda | Parcial | Solo sub-vistas en Personas |
| 3 grupos turno plano personas | ❌ | Migración + UI |
| Generar plano semanal/mensual auto | ❌ | Motor nuevo |
| Reglas género/pareja en asignación | ❌ | `genero` + leer parejas |
| UI gestión parejas | ❌ | CRUD nuevo |
| Export PNG plano con cabecera premium | ❌ | Extender `planoExportPng` |
| Export semanal/mensual plano | Parcial | Solo 1 servicio por PNG hoy |
| Deshabilitar persona plano | ✅ | `activo` en `PlanoPersonasManager` |
| Diseño homogéneo con MiembrosManager | Parcial | Falta turnos + parejas |

---

## Archivos clave revisados

```
src/app/dashboard/ofrenda/
├── OfrendaPageClient.tsx      # Shell pestañas
├── PlanTable.tsx              # Labores generales
├── ExportPanel.tsx            # Export tabla
├── MiembrosManager.tsx        # Personas G1/G2 (referencia diseño)
└── plano/
    ├── PlanoTab.tsx           # Lienzo + export PNG
    ├── PlanoPersonasManager.tsx
    ├── planoExportPng.ts
    └── planoActions.ts

supabase/migrations/
├── 20260627120000_ofrenda_plano_parejas.sql
└── 20260629120000_ofrenda_plano_personas_faltantes.sql
```
