# 04 — Personas del plano: turnos, parejas y género

## Estado actual en Supabase (2026-06-29)

| Métrica | Valor |
|---------|-------|
| Personas activas | 64 |
| Con pareja | 32 (16 parejas) |
| Sin pareja | 32 |
| Capacidad | Todas `ambos` (pendiente aplicar clasificación) |
| Turnos | ❌ No definidos |

## ¿Tenemos las personas de cada grupo (turno)?

**No en base de datos ni en código.**

Lo que sí existe:

- **Lista completa** de 64 personas en `ofrenda_plano_personas`.
- **16 parejas** en `ofrenda_plano_parejas` (seed de migración).
- **Clasificación M/H** en `docs/plano-templo/clasificacion-ofrendario-sobres.md` (61 nombres; faltan Gleidis, Yicely, María Edilma Moreno que están en BD).
- **Patrón de turnos** en `ofrenda_miembros` (referencia de UI, no datos del plano).

**Acción requerida:** el usuario debe confirmar o pasar la asignación de cada persona a:

- `puede_jueves`
- `puede_domingo_manana`
- `puede_domingo_tarde`

(o equivalente con presets `solo jueves` / `solo domingo` / `todos` como en miembros).

## Migración propuesta: disponibilidad por turno

Reutilizar el mismo modelo que `20260604120000_ofrenda_miembro_disponibilidad.sql`:

```sql
ALTER TABLE public.ofrenda_plano_personas
    ADD COLUMN IF NOT EXISTS puede_jueves boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS puede_domingo_manana boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS puede_domingo_tarde boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ofrenda_plano_personas.puede_jueves IS
    'Pool labor ofrenda: puede asignarse en servicios de jueves';
-- idem domingo mañana / tarde
```

**Seed inicial:** pendiente de confirmación del usuario. Opciones:

1. Usuario pasa 3 listas (jueves / dom AM / dom PM).
2. Importar desde hoja manual (como parejas).
3. Default `true` en los tres hasta que se configure.

## Migración propuesta: género

Necesario para reglas hombre+hombre / mujer+mujer sin depender solo de parejas.

```sql
ALTER TABLE public.ofrenda_plano_personas
    ADD COLUMN IF NOT EXISTS genero text CHECK (genero IN ('mujer', 'hombre'));

COMMENT ON COLUMN public.ofrenda_plano_personas.genero IS
    'Género para emparejar ofrendario+apoyo en el mismo bloque';
```

**Seed desde clasificación existente:**

| Fuente | Mujeres | Hombres |
|--------|---------|---------|
| `clasificacion-ofrendario-sobres.md` | 34 | 27 |
| BD actual (extra) | Gleidis, Yicely, María Edilma Moreno | — |

Total esperado: **~37 mujeres + 27 hombres = 64** (verificar conteo exacto).

Las 16 mujeres y 16 hombres de parejas ya tienen género implícito en `ofrenda_plano_parejas`.

## Gestión de parejas — UI

Tabla ya existe. Falta CRUD en `planoActions.ts`:

| Acción | Regla |
|--------|-------|
| Listar parejas | JOIN nombres mujer/hombre |
| Crear pareja | Una mujer + un hombre; ambos sin pareja previa |
| Cambiar pareja | UPDATE con validación unicidad |
| Quitar pareja | DELETE fila |
| Desde tarjeta persona | «Asignar pareja» abre picker filtrado por género opuesto |

**Validaciones BD ya activas:**

- `mujer_persona_id <> hombre_persona_id`
- Índice único por mujer y por hombre (máximo 1 pareja cada uno)

## Capacidad (ofrendario / apoyo / ambos)

Columna existente. Pendiente aplicar seed de `clasificacion-ofrendario-sobres.md`:

| Capacidad BD | Significado papel |
|--------------|-------------------|
| `ofrendario` | Puede hacer ofrendario |
| `apoyo` | Solo sobres/apoyo |
| `ambos` | Cualquier rol |

Personas marcadas «Solo sobres» en el doc:

- Eymy Arana
- Maria del Mar Ortiz
- Georgina Cruz
- Leni Cabrera

El motor de asignación debe respetar `capacidadEncajaRol()` (ya existe en plano).

## Personas sin pareja (32) — referencia

Alba Angulo, Alicia Escobar, Álvaro Tangarife, Ana Vargas, Andrea Murillo, Aroa Castiblanco, Beatriz Anzola, Carmen Muñoz, Edison Arenas, Edwin Wilches, Fanny Zúñiga, Georgina Cruz, Gleidis Amador, Leni Cabrera, Liliana Mompotes, Lorena Arteaga, Maria del Mar Ortiz, María Edilma Moreno, Maria Peralta, Milton Castiblanco, Nelson Mompotes, Nicolas Caballero, Nubia Mosquera, Oscar Biedma, Ramiro Zapata, Rosalba Gutiérrez, Sebastián Canal, Solandi Sánchez, Sulmira Rosales, Yesid Payares, Yicely Ruiz, Yuli Henao.

## Componentes UI a crear/extender

| Archivo | Cambio |
|---------|--------|
| `PlanoPersonasManager.tsx` | Secciones por turno, tarjetas estilo `MiembrosManager` |
| `PlanoParejaPicker.tsx` | Nuevo — elegir pareja |
| `planoActions.ts` | CRUD parejas + `setPlanoPersonaTurnos` + `setPlanoPersonaGenero` |
| `ofrendaMemberAvailability.ts` | Reutilizar presets `all` / `jueves` / `domingo` |

## Migración pendiente en Supabase

`20260629120000_ofrenda_plano_personas_faltantes.sql` no está en el historial de migraciones remoto, pero los 3 registros ya existen. Al aplicarla solo formaliza el estado.
