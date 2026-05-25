# Estado de las instrucciones por tipo de culto

Resumen de lo implementado y lo pendiente para cada tipo de culto y rol.

---

## Resumen por tipo de culto

| Tipo           | Rol            | Estado | Contenido / Migración |
|----------------|----------------|--------|------------------------|
| **Alabanza**   | Temas alabanza | ✅ Hecho | Contenido de los 6 temas; `20260525150000_instrucciones_temas_alabanza.sql` (`rol = temas_alabanza`) |
| **Alabanza**   | Introducción   | ⏳ Próximamente | Placeholder en BD (`publicado = false`); doc pendiente |
| **Alabanza**   | Finalización   | ⏳ Próximamente | Placeholder en BD (`publicado = false`); doc pendiente |
| **Estudio Bíblico** | Introducción   | ⏳ Pendiente | Falta doc + migración |
| **Estudio Bíblico** | Finalización   | ⏳ Pendiente | Falta doc + migración |
| **Enseñanza**  | Introducción   | ⏳ Pendiente | Falta doc + migración |
| **Enseñanza**  | Enseñanza      | ⏳ Pendiente | Falta doc + migración |
| **Enseñanza**  | Testimonios    | ⏳ Pendiente | Falta doc + migración |

---

## Lo que ya está implementado

1. **Tabla** `instrucciones_culto`: creada en `supabase/migrations/20260311000000_create_instrucciones_culto.sql` (culto_type_id, rol, titulo_es/ca, contenido_es/ca).
2. **Backend**: `getInstruccionCulto(cultoTypeId, rol, language)` en `src/app/dashboard/instrucciones/actions.ts` — lee por tipo de culto y rol.
3. **Modal**: `InstruccionesCultoModal` en detalle de culto y en Dashboard (Mis asignaciones); botón «Ver instrucciones» por cada rol (Intro, Enseñanza, Testimonios, Finalización) según el tipo de culto.
4. **Temas de alabanza (6 temas)**: **Alabanza – Temas alabanza**. Texto en BD bajo `rol = temas_alabanza`; migración de separación: `20260525150000_instrucciones_temas_alabanza.sql`. Doc: `docs/instrucciones/alabanza-temas.md`.
5. **Seed histórico**: `20260311100000_seed_instruccion_alabanza_introduccion.sql` (cargó el texto en `introduccion`; la migración 20260525150000 lo mueve a `temas_alabanza`).

IDs de tipo de culto (según el plan): **4** = Estudio Bíblico, **5** = Alabanza, **6** = Enseñanza (resolver por nombre en migraciones si puede variar).

---

## Cómo añadir una nueva instrucción

1. Crear (o editar) el archivo en `docs/instrucciones/`, por ejemplo `alabanza-finalizacion.md`, con el texto en español (y opcionalmente catalán).
2. Crear una migración SQL que haga `INSERT INTO instrucciones_culto (...) SELECT ct.id, 'finalizacion', ... FROM culto_types ct WHERE ct.nombre ILIKE '%Alabanza%' ... ON CONFLICT (culto_type_id, rol) DO UPDATE SET ...`.
3. Aplicar la migración (`npx supabase db push` o pegar en SQL Editor de Supabase).

No hace falta cambiar código de la app: el modal y la action ya sirven cualquier (culto_type_id, rol) que exista en la tabla.

---

## Plantillas de documentos

En `docs/instrucciones/` hay (o se pueden añadir) plantillas para rellenar:

- `alabanza-temas.md` ✅ (contenido en BD como `temas_alabanza`)
- `alabanza-introduccion.md` (referencia histórica; rol intro pendiente de redactar)
- `alabanza-finalizacion.md` (pendiente)
- `estudio-biblico-introduccion.md` (pendiente)
- `estudio-biblico-finalizacion.md` (pendiente)
- `ensenanza-introduccion.md` (pendiente)
- `ensenanza-ensenanza.md` (pendiente)
- `ensenanza-testimonios.md` (pendiente)

Mismo formato que `alabanza-introduccion.md`: título, secciones con `##`, listas con `-` o `•`, texto plano o markdown ligero. Luego se pasa a texto plano en la migración si se desea (como en la intro de Alabanza).
