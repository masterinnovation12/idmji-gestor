# IDMJI Gestor de Púlpito — Instrucciones del proyecto

App Next.js 14 (App Router) + Supabase + Tailwind v4. **Bilingüe: castellano (`es-ES`) y catalán (`ca-ES`).**

## 🌐 Regla de internacionalización (i18n) — OBLIGATORIA

**Todo texto visible para el usuario DEBE pasar por i18n. Nunca se hardcodea texto en un componente.**

Esto aplica a **cualquier** texto que pueda leer una persona o un lector de pantalla:
- Texto visible en JSX (`<p>Hola</p>`, encabezados, botones, etiquetas, badges, estados vacíos…)
- `aria-label`, `placeholder`, `title`, `alt`
- Mensajes de `toast`, errores, textos de carga ("Cargando…"), confirmaciones
- Textos cortos y abreviaturas ("Ant", "Sig", "Total")

> Si creas una página, un componente o un modal nuevo con texto, **traducir es parte de la tarea, no un extra.** No entregues una pantalla con cadenas en español hardcodeadas.

### Cómo hacerlo

1. Las traducciones viven en `src/lib/i18n/translations.ts` (dos objetos: `'es-ES'` y `'ca-ES'`).
   Las claves de la sección *Ofrenda* están en `src/lib/i18n/ofrendaKeys.ts` (`ofrendaKeysEs` / `ofrendaKeysCa`).
2. Añade **la misma clave en AMBOS idiomas** (el test de paridad falla si falta en uno).
3. En el componente: `const { t } = useI18n()` (desde `@/lib/i18n/I18nProvider`) y usa `{t('mi.clave')}`.
   - Si el componente aún no tiene el hook, añádelo. Si el texto está en un **subcomponente**, ese subcomponente necesita su propio `useI18n()` (o recibir `t` por props, como hace `AssignmentSection`).
   - En texto SSR/hidratado añade `suppressHydrationWarning` al elemento (patrón ya usado en el repo).
4. Reutiliza claves genéricas de `common.*` antes de crear nuevas: `common.close`, `common.delete`, `common.edit`, `common.save`, `common.cancel`, `common.search`, `common.clearSearch`, `common.previous`, `common.next`, `common.previousPage`, `common.nextPage`, `common.add`, `common.confirm`, `common.apply`, `common.update`, `common.total`, `common.date`, `common.error`, `common.loading`…
5. Nomenclatura de claves: `namespace.descripcion` en camelCase (p. ej. `lecturas.closeFilters`, `himnoCoro.saveList`).
6. Interpolación: usa marcadores `{n}`, `{name}`, `{count}` y reemplázalos en el componente (`t('clave').replace('{n}', String(x))`). No concatenes fragmentos traducidos.

### Calidad del catalán — debe ser PERFECTO (normativa DIEC2 / IEC)

No traduzcas de forma literal desde el castellano. Usa catalán normativo real. Castellanismes que **están prohibidos** en este proyecto (con su forma correcta):

| ❌ Castellanismo | ✅ Catalán correcto |
|---|---|
| alabança / alabanza | **lloança** (verb *lloar*, no *alabar*) |
| coro / coros | **cor / cors** |
| ofrenda / ofrendario | **ofrena / ofrenador** |
| (cualquier) `ñ` | `ny` |
| terminación `-ción` / `-ciones` | `-ció` / `-cions` |

Cuida la **elisió**: davant de vocal o *h* → `d'`, `l'` (ex. `l'estudi`, `d'introducció`); davant de consonant (inclòs el dígraf `Ll`) → `de`, `la` (ex. `de Lloança`, `la lloança`). Apòstrof també a `per a` → `per`, etc. quan correspongui.

### Verificación (ejecútala siempre tras tocar textos)

```bash
npx vitest run src/lib/i18n/            # paridad de claves + guarda anti-castellanismes
node scripts/check-i18n-hardcoded.mjs   # detecta texto hardcodeado sin traducir
```

- `src/lib/i18n/translations.parity.test.ts` — mismas claves en ES/CA, ningún valor vacío.
- `src/lib/i18n/translations.catalan-quality.test.ts` — sin castellanismes, términos de dominio correctos, y **guarda de cadenas sin traducir** (si añades una clave cuyo valor CA coincide legítimamente con ES —marca, cognado, abreviatura— añádela a `ALLOWED_IDENTICAL`).
- `scripts/check-i18n-hardcoded.mjs` — escanea `src/` y falla si encuentra `aria-label`/`placeholder`/`title` o texto JSX con cadenas literales en castellano.

### Límite conocido
Los **Server Components** (sin `'use client'`) no pueden usar `useI18n()` (el idioma vive en `localStorage`, lado cliente). Si necesitas texto traducido ahí, extrae la parte con texto a un componente cliente (patrón `PlanoLoadingSkeleton` en `OfrendaPageClient.tsx`). El fallback de error de `src/app/dashboard/page.tsx` es la única excepción aceptada por ahora.

## 🔐 Autorización: sedes + permisos granulares

La app es **multi-sede** (tabla `sedes`; todo dato operativo lleva `sede_id`) y tiene **permisos granulares por usuario** (`profiles.permisos`, jsonb de overrides). Defensa en 3 capas:

1. **RLS** (migración `20260711120000_sedes_y_permisos.sql`): aislamiento por sede (`user_sede_id()`) + gate por permiso (`user_can('clave')`). ADMIN ve todas las sedes.
2. **Guards en server actions** (`src/lib/auth/guards.ts`): `requireUser` / `requireAdmin` / `requirePermission` / `requireAnyPermission`. **Nunca** dupliques un `requireEditor` local ni un cliente service-role: usa estos guards y `createAdminClient()` de `src/lib/supabase/admin.ts`.
3. **UI**: `useAccess()` (`src/lib/auth/AccessProvider.tsx`) en cliente, o `can(profile, 'clave')` de `src/lib/auth/permissions.ts` en server pages.

Reglas:
- El catálogo de permisos vive en `src/lib/auth/permissions.ts` (`PERMISSION_KEYS`) y debe mantenerse **en sintonía con `public.user_can()`** en BD. Resolución: ADMIN siempre; override en `permisos` gana; sin override EDITOR permite y el resto deniega.
- Los roles válidos salen de `src/lib/auth/roles.ts` (enum `user_role` en BD: ADMIN, EDITOR, MIEMBRO, SONIDO). No derivar roles con SELECT DISTINCT.
- La sede efectiva de una consulta se resuelve con `resolveActiveSedeId(ctx)` (`src/lib/sede/activeSede.ts`): los no-admin siempre operan en su sede; el ADMIN elige con el selector del sidebar (cookie `idmji-sede-activa`). Todo INSERT en tablas con `sede_id` debe fijarlo explícitamente con la sede resuelta.
- Constraints únicos por sede: `ofrenda_planes (sede_id, anio, mes)`, `ofrenda_plano_personas (sede_id, nombre_normalizado)`, `ofrenda_plano_layouts (sede_id, modo, vista)`, `festivos (sede_id, fecha)`, `culto_schedules (sede_id, day_of_week, default_time)` — usa estos `onConflict`.
- Administración: hub en `/dashboard/admin` (usuarios+permisos, sedes, stats, auditoría). La matriz de permisos se edita en el modal de usuario (`PermisosEditor`).

## Otros comandos útiles

```bash
npm run dev        # dev server (puerto 3004)
npm run build      # build de producción
npx tsc --noEmit   # typecheck
npx vitest run     # toda la suite de tests
node scripts/db-query.mjs "select 1"   # SQL contra la BD (Management API, token en .env.local)
```

Despliegue: Vercel despliega desde `main`. No hacer push a `main` sin que el usuario lo pida.
La base de datos de Supabase es **compartida con producción**: aplicar migraciones (`node scripts/db-query.mjs --file supabase/migrations/...`) requiere confirmación explícita del usuario.
