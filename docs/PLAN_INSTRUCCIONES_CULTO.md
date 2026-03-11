# Plan: Instrucciones de culto (base de datos + UI + tests)

Instrucciones por tipo de culto y rol, almacenadas en Supabase, con modal en dashboard y detalle de culto. Incluye tests (unitarios/integración + E2E).

---

## Resumen de roles por tipo de culto

| Tipo de culto   | Roles con instrucciones |
|-----------------|--------------------------|
| **Estudio Bíblico** | 2: Introducción, Finalización |
| **Alabanza**        | 2: Introducción, Finalización |
| **Enseñanza**       | 3: Introducción, Enseñanza, Testimonios |

*(En la UI de asignación ya existen Intro, Enseñanza, Testimonios, Finalización según `tiene_lectura_introduccion`, `tiene_ensenanza`, `tiene_testimonios`, `tiene_lectura_finalizacion`.)*

---

## Checklist de implementación

### 1. Base de datos (Supabase)

- [x] **1.1** Crear tabla `instrucciones_culto`: `id`, `culto_type_id` (FK), `rol`, `titulo_es`, `titulo_ca`, `contenido_es`, `contenido_ca`, `created_at`, `updated_at`. Índice único `(culto_type_id, rol)`.
- [x] **1.2** Habilitar RLS y política de lectura (SELECT) para usuarios autenticados.
- [x] **1.3** Crear migración SQL en proyecto (reproducible): `supabase/migrations/20260311000000_create_instrucciones_culto.sql`.
- [x] **1.4** Insertar filas placeholder para Estudio Bíblico (2), Alabanza (2), Enseñanza (3).

### 2. Backend (Server Actions / API)

- [x] **2.1** Crear server action `getInstruccionCulto(cultoTypeId, rol, language)` que devuelva instrucción según idioma. (`src/app/dashboard/instrucciones/actions.ts`)
- [x] **2.2** (Opcional omitido) Listar instrucciones disponibles.
- [x] **2.3** Tipos TypeScript en `src/types/database.ts`: `InstruccionCulto`, `RolInstruccionCulto`, `InstruccionCultoParaUI`.

### 3. Frontend – componente modal

- [x] **3.1** Crear `InstruccionesCultoModal` en `src/components/InstruccionesCultoModal.tsx`.
- [x] **3.2** Estilo: glass, responsive, `data-testid="instrucciones-culto-modal"` para E2E.
- [x] **3.3** Claves i18n en `translations.ts`: `culto.instrucciones.title`, `culto.instrucciones.ver`, `culto.instrucciones.empty` (ES/CA).

### 4. Integración en UI

- [x] **4.1** **Detalle de culto** (`CultoDetailClient`): en cada `AssignmentSection` botón "Ver instrucciones" (icono Info + texto en sm); modal con `culto.tipo_culto_id` y rol.
- [ ] **4.2** **Dashboard – card del culto**: (opcional) pasar `currentUserId` y mostrar "Ver instrucciones" solo al asignado.
- [x] **4.3** **Dashboard – Mis asignaciones**: en cada ítem, botón "Ver instrucciones" que abre el modal con tipo + primer rol del usuario.

### 5. Tests

- [x] **5.1** **Backend**: `src/app/dashboard/instrucciones/actions.test.ts` (Vitest, mock Supabase): es-ES/ca-ES, sin fila, culto_type_id inválido, string numérico.
- [ ] **5.2** **Frontend/lógica**: test del modal (opcional, con RTL).
- [x] **5.3** Scripts: `npm run test`, `npm run test:e2e`.
- [x] **5.4** **E2E (Playwright)**: `e2e/instrucciones-culto.spec.ts` — usa credenciales de `.env.e2e.local`. Helper `e2e/auth.helper.ts` hace login si redirige a /login. Plantilla: `.env.e2e.example`.
- [x] **5.5** **E2E con MCP (cursor-ide-browser)**: flujo ejecutado y documentado en `docs/E2E_INSTRUCCIONES_CULTO_MCP.md`. Ajustes: `pointer-events-none` en Card decorativo, `data-testid="ver-instrucciones-btn"`, `aria-label="Cerrar"` en Modal.

### 6. Documentación y cierre

- [x] **6.1** Actualizar este MD marcando ítems completados.
- [x] **6.2** Instrucciones editables en Supabase: tabla `instrucciones_culto`, columnas `titulo_es`, `titulo_ca`, `contenido_es`, `contenido_ca` por (culto_type_id, rol).
- [x] **6.3** Doc E2E con MCP: `docs/E2E_INSTRUCCIONES_CULTO_MCP.md`.
- [x] **6.4** Primera instrucción oficial: **Introducción Alabanza**. Contenido en `docs/instrucciones/alabanza-introduccion.md`; migración `20260311100000_seed_instruccion_alabanza_introduccion.sql`; implementación descrita en `docs/IMPLEMENTACION_INSTRUCCION_ALABANZA_INTRO.md`. Modal mejorado (tipografía, accesibilidad).

---

## Notas técnicas

- **Rol** en BD: `introduccion` | `ensenanza` | `testimonios` | `finalizacion` (igual que en asignaciones).
- **culto_type_id**: FK a `culto_types.id` (4=Estudio Bíblico, 5=Alabanza, 6=Enseñanza).
- Idioma: `titulo_es`/`contenido_es` y `titulo_ca`/`contenido_ca`; la app elige según `language` del usuario o i18n.
