# Implementación: Instrucción «Introducción» — Culto de Alabanza

## Resumen

Se incorpora en la base de datos la **primera instrucción oficial** para quien hace la introducción en los **cultos de Alabanza**. El contenido proviene del documento base `docs/instrucciones/alabanza-introduccion.md`, reestructurado y pasado a texto plano para su almacenamiento y visualización en la app.

---

## Cómo se implementa

### 1. Base de datos (Supabase)

- **Tabla:** `instrucciones_culto`
- **Fila afectada:** la que cumple:
  - `culto_type_id` = id del tipo «Alabanza» (resuelto por nombre en la migración)
  - `rol` = `'introduccion'`
- **Columnas que se rellenan:**
  - `titulo_es` / `titulo_ca`: título que verá el usuario (p. ej. «Introducción — Culto de Alabanza»).
  - `contenido_es` / `contenido_ca`: texto completo de la instrucción (por ahora solo español; catalán puede rellenarse después).

La migración usa `INSERT ... ON CONFLICT (culto_type_id, rol) DO UPDATE`, de modo que:
- Si ya existe la fila (por ejemplo, un placeholder anterior), se **actualiza**.
- Si no existe, se **inserta**.

Así la migración es segura y repetible.

### 2. Dónde se guarda el contenido

- **Origen:** `docs/instrucciones/alabanza-introduccion.md` (documento de referencia y futuras ediciones).
- **Uso en BD:** el contenido se ha pasado a **texto plano** con saltos de línea y guiones para listas, sin markdown. La UI muestra ese texto con `whitespace-pre-wrap`, de modo que se respetan párrafos y listas.

### 3. Cómo lo ve el usuario en la app

- En **detalle de culto** (Alabanza), en la sección «Introducción del culto», el hermano asignado ve el botón **«Ver instrucciones»**.
- Al pulsarlo se abre el **modal** con:
  - **Título:** el de la fila (`titulo_es` o `titulo_ca` según idioma).
  - **Cuerpo:** el contenido completo, con buena legibilidad (tipografía, contraste, scroll si es largo).

El mismo contenido se puede exponer desde **Dashboard → Mis asignaciones** si el usuario tiene ese culto y rol.

---

## Cómo queda (resultado esperado)

- **Backend:** `getInstruccionCulto(cultoTypeId, 'introduccion', 'es-ES')` devuelve título y el texto completo para Alabanza.
- **Frontend:** el modal muestra la instrucción con secciones claras, listas y párrafo final, listo para leer en móvil o desktop. Todo el flujo de instrucciones está adaptado a **móvil y desktop** (modal responsive, botones con zona táctil ≥44px, scroll del contenido, tipografía escalable).
- **Base de datos:** una sola fila actualizada/insertada para (Alabanza, introducción), sin tocar el resto de tipos ni roles.

---

## Archivos implicados

| Archivo | Rol |
|--------|-----|
| `docs/instrucciones/alabanza-introduccion.md` | Fuente del contenido (referencia) |
| `supabase/migrations/20260311100000_seed_instruccion_alabanza_introduccion.sql` | Migración que escribe en `instrucciones_culto` |
| `src/components/InstruccionesCultoModal.tsx` | Modal que muestra título y contenido (mejorado para textos largos) |
| `src/app/dashboard/instrucciones/actions.ts` | Server action que lee de la BD (sin cambios de contrato) |

---

## Tests que validan la implementación

- **Backend (Vitest):** `src/app/dashboard/instrucciones/actions.test.ts` — `getInstruccionCulto` con distintos idiomas y casos.
- **E2E (Playwright):** `e2e/instrucciones-culto.spec.ts` — flujo: login → culto → «Ver instrucciones» → modal visible.
- **E2E con MCP (cursor-ide-browser):** flujo manual documentado en `docs/E2E_INSTRUCCIONES_CULTO_MCP.md` — mismo flujo y comprobación de que el contenido se ve bien y el modal cierra correctamente.

Todos estos tests siguen siendo válidos; la única diferencia es que el contenido mostrado en el modal pasa a ser el texto real de la introducción de Alabanza en lugar del placeholder.

---

## Cómo aplicar la migración en Supabase

Para que el contenido aparezca en la app:

1. **Supabase CLI** (recomendado): desde la raíz del proyecto, `npx supabase db push` (o `supabase migration up`) para aplicar `20260311100000_seed_instruccion_alabanza_introduccion.sql`.
2. **Dashboard de Supabase:** en SQL Editor, pegar y ejecutar el contenido del archivo de migración anterior.

Tras aplicarla, al abrir «Ver instrucciones» en un culto de Alabanza (sección Introducción) se mostrará el texto completo de la instrucción.
