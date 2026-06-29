# 11 — P1: turnos por grupo (confirmado)

> Fuente: imágenes usuario 27/06/2026. Cruzado con `ofrenda_plano_personas` activas (64).

## Resumen

| Turno | Grupo | En lista | Coordinadores (referencia) |
|-------|-------|----------|----------------------------|
| **Jueves** | A | 16 personas | Sebastián Villegas / Jeffrey Bolaños |
| **Domingo mañana** | B | 21 personas | Alejandro Pérez / Andrés Zapata |
| **Domingo tarde** | C | 12 personas | Rafael Quer / Hugo Bolaños |
| **Total asignados** | | **49** | |
| **Sin ningún turno** | | **15** | ver abajo |

## Jueves — Grupo A (16)

| # | Nombre | En BD |
|---|--------|-------|
| 1 | Martin A. Castañeda | ✅ |
| 2 | Eymy Arana | ✅ |
| 3 | Leo Mantilla | ✅ |
| 4 | Alicia Escobar | ✅ |
| 5 | Alba Angulo | ✅ |
| 6 | Nubia Mosquera | ✅ |
| 7 | Leni Cabrera | ✅ |
| 8 | Beatriz Anzola | ✅ |
| 9 | Rosalba Gutiérrez | ✅ |
| 10 | Camilo Solorzano | ✅ |
| 11 | Edison Arenas | ✅ |
| 12 | Eliana Moreno | ✅ |
| 13 | Juan Camilo Carrillo | ✅ |
| 14 | Maria Peralta | ✅ |
| 15 | Nelson Mompotes | ✅ |
| 16 | María Edilma Moreno | ✅ (imagen decía «no en base» — **ya está en BD**) |

## Domingo mañana — Grupo B (21)

| # | Nombre | En BD |
|---|--------|-------|
| 1 | Aroa Castiblanco | ✅ |
| 2 | Milton Castiblanco | ✅ |
| 3 | Fanny Zúñiga | ✅ |
| 4 | Sebastián Canal | ✅ |
| 5 | Luis Collazos | ✅ |
| 6 | Marleny Quintero | ✅ |
| 7 | Paolo Simoes | ✅ |
| 8 | Nallivi Diaz | ✅ |
| 9 | Ramiro Zapata | ✅ |
| 10 | Oscar Biedma | ✅ |
| 11 | Viviana Gil | ✅ |
| 12 | Edwin Castiblanco | ✅ |
| 13 | Georgina Cruz | ✅ |
| 14 | Noemy Ramírez | ✅ |
| 15 | Carlos Galvis | ✅ |
| 16 | Álvaro Tangarife | ✅ |
| 17 | Mayela Campos | ✅ |
| 18 | Jorge Pichardo | ✅ |
| 19 | Edith Leonel | ✅ |
| 20 | Elkin Méndez | ✅ |
| 21 | Gleidis Amador | ✅ (imagen decía «no en base» — **ya está en BD**) |

## Domingo tarde — Grupo C (12)

| # | Nombre | En BD |
|---|--------|-------|
| 1 | Carmen Muñoz | ✅ |
| 2 | Liliana Mompotes | ✅ |
| 3 | Andrea Murillo | ✅ |
| 4 | Lorena Arteaga | ✅ |
| 5 | Yesid Payares | ✅ |
| 6 | Nicolas Caballero | ✅ |
| 7 | Daniel Bonilla | ✅ |
| 8 | Maria Edilma Aricapa | ✅ |
| 9 | Sulmira Rosales | ✅ |
| 10 | Esperanza Sandoval | ✅ |
| 11 | Sebastián López | ✅ |
| 12 | Yicely Ruiz | ✅ (imagen decía «no en base» — **ya está en BD**) |

---

## Personas en BD sin ningún turno asignado (15)

Están activas en `ofrenda_plano_personas` pero **no aparecen** en ninguno de los tres grupos:

| # | Nombre | Notas |
|---|--------|-------|
| 1 | Alicia Montes | Pareja seed: Edgar Agatón (tampoco en grupo) |
| 2 | Ana Vargas | |
| 3 | Cristian Morales | Pareja seed: Liliana Benítez |
| 4 | Dayhana Sánchez | Pareja seed: Juan David Castaño |
| 5 | Edgar Agaton | Pareja seed: Alicia Montes |
| 6 | Edwin Wilches | |
| 7 | Joan Ruiz Bosch | Pareja seed: Sandra Alcaraz |
| 8 | Juan David Castaño | Pareja seed: Dayhana Sánchez |
| 9 | Lía Aranda | Pareja seed: Leo Mantilla (Leo → jueves) |
| 10 | Liliana Benítez | Pareja seed: Cristian Morales |
| 11 | Maria del Mar Ortiz | |
| 12 | Maria José Vera | Pareja seed: Camilo Solorzano (Camilo → jueves) |
| 13 | Sandra Alcaraz | Pareja seed: Joan Ruiz Bosch |
| 14 | Solandi Sánchez | |
| 15 | Yuli Henao | |

### Observación parejas

Varias personas sin turno tienen **cónyuge sí asignado** a otro día (ej. Maria José Vera / Camilo jueves; Lía Aranda / Leo jueves). El motor deberá decidir si:

- se permiten parejas en turnos distintos (hoy parece intencional), o
- se fuerza mismo turno para parejas (regla futura — **no pedida aún**).

---

## Migración seed turnos (borrador)

```sql
-- Default: nadie en ningún turno hasta asignar
-- Luego UPDATE por grupo:

-- Jueves
UPDATE ofrenda_plano_personas SET
  puede_jueves = true,
  puede_domingo_manana = false,
  puede_domingo_tarde = false
WHERE nombre_normalizado IN (
  'martin a. castaneda', 'eymy arana', 'leo mantilla', ...
);

-- Domingo mañana: puede_domingo_manana = true, resto false
-- Domingo tarde: puede_domingo_tarde = true, resto false
-- Sin turno: los tres false (o excluir de generación)
```

Los 15 sin grupo quedan con **los tres flags en false** hasta que se asignen manualmente en UI.

---

| **Sin turno (15)** | Quedan sin asignar; el usuario las asignará **desde la app** (toggles turno). |
