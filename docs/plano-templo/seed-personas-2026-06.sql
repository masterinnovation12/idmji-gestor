-- =============================================================================
-- PLANO TEMPLO — Limpieza + seed de personas según el papel oficial (junio 2026)
-- Ejecutado una vez vía Management API. Idempotente (re-ejecutable sin daño).
-- capacidad = 'ofrendario' por defecto; las marcas de 'solo sobres' (apoyo) se
-- aplicarán cuando el usuario devuelva la clasificación corregida.
-- =============================================================================

BEGIN;

-- 0. Esquema: columna capacidad (idempotente)
ALTER TABLE public.ofrenda_plano_personas
    ADD COLUMN IF NOT EXISTS capacidad text NOT NULL DEFAULT 'ofrendario'
    CHECK (capacidad IN ('ofrendario', 'apoyo', 'ambos'));

-- 1. Completar apellidos faltantes + correcciones de escritura
UPDATE public.ofrenda_plano_personas SET nombre='Edith Leonel',         nombre_normalizado='edith leonel'          WHERE nombre_normalizado='edith';
UPDATE public.ofrenda_plano_personas SET nombre='Maria Edilma Aricapa', nombre_normalizado='maria edilma aricapa' WHERE nombre_normalizado='maria edilma';
UPDATE public.ofrenda_plano_personas SET nombre='Marleny Quintero',     nombre_normalizado='marleny quintero'      WHERE nombre_normalizado='marleny';
UPDATE public.ofrenda_plano_personas SET nombre='Mayela Campos',        nombre_normalizado='mayela campos'         WHERE nombre_normalizado='mayela';
UPDATE public.ofrenda_plano_personas SET nombre='Sandra Alcaraz',       nombre_normalizado='sandra alcaraz'        WHERE nombre_normalizado='sandra';
UPDATE public.ofrenda_plano_personas SET nombre='Joan Ruiz Bosch',      nombre_normalizado='joan ruiz bosch'       WHERE nombre_normalizado='joan ruiz';
UPDATE public.ofrenda_plano_personas SET nombre='Martin A. Castañeda',  nombre_normalizado='martin a. castaneda'   WHERE nombre_normalizado='martin castaneda';
UPDATE public.ofrenda_plano_personas SET nombre='Noemy Ramírez',        nombre_normalizado='noemy ramirez'         WHERE nombre_normalizado='nohemy';
UPDATE public.ofrenda_plano_personas SET nombre='Luis Collazos',        nombre_normalizado='luis collazos'         WHERE nombre_normalizado='jose luis collazos';

-- 2. Fusionar duplicados (solo nombre) en su versión completa, repuntando asignaciones
UPDATE public.ofrenda_plano_asignaciones a
    SET persona_id = f.id
    FROM public.ofrenda_plano_personas f, public.ofrenda_plano_personas d
    WHERE f.nombre_normalizado='eliana moreno' AND d.nombre_normalizado='eliana' AND a.persona_id=d.id;
DELETE FROM public.ofrenda_plano_personas WHERE nombre_normalizado='eliana';

UPDATE public.ofrenda_plano_asignaciones a
    SET persona_id = f.id
    FROM public.ofrenda_plano_personas f, public.ofrenda_plano_personas d
    WHERE f.nombre_normalizado='eymy arana' AND d.nombre_normalizado='eymy' AND a.persona_id=d.id;
DELETE FROM public.ofrenda_plano_personas WHERE nombre_normalizado='eymy';

-- 3. Borrar personas que no están en el papel (y sus asignaciones)
DELETE FROM public.ofrenda_plano_asignaciones
    WHERE persona_id IN (SELECT id FROM public.ofrenda_plano_personas
                         WHERE nombre_normalizado IN ('jeffrey bolanos','jefffrey bolanos','glaidys'));
DELETE FROM public.ofrenda_plano_personas
    WHERE nombre_normalizado IN ('jeffrey bolanos','jefffrey bolanos','glaidys');

-- 4. Insertar los 38 hermanos que faltan del papel
INSERT INTO public.ofrenda_plano_personas (nombre, nombre_normalizado) VALUES
    ('Maria José Vera','maria jose vera'),
    ('Alicia Montes','alicia montes'),
    ('Liliana Benítez','liliana benitez'),
    ('Lía Aranda','lia aranda'),
    ('Dayhana Sánchez','dayhana sanchez'),
    ('Nallivi Diaz','nallivi diaz'),
    ('Aroa Castiblanco','aroa castiblanco'),
    ('Fanny Zúñiga','fanny zuniga'),
    ('Liliana Mompotes','liliana mompotes'),
    ('Solandi Sánchez','solandi sanchez'),
    ('Alba Angulo','alba angulo'),
    ('Sulmira Rosales','sulmira rosales'),
    ('Carmen Muñoz','carmen munoz'),
    ('Ana Vargas','ana vargas'),
    ('Andrea Murillo','andrea murillo'),
    ('Nubia Mosquera','nubia mosquera'),
    ('Beatriz Anzola','beatriz anzola'),
    ('Yuli Henao','yuli henao'),
    ('Rosalba Gutiérrez','rosalba gutierrez'),
    ('Maria del Mar Ortiz','maria del mar ortiz'),
    ('Alicia Escobar','alicia escobar'),
    ('Georgina Cruz','georgina cruz'),
    ('Camilo Solorzano','camilo solorzano'),
    ('Edgar Agaton','edgar agaton'),
    ('Álvaro Tangarife','alvaro tangarife'),
    ('Cristian Morales','cristian morales'),
    ('Leo Mantilla','leo mantilla'),
    ('Juan David Castaño','juan david castano'),
    ('Paolo Simoes','paolo simoes'),
    ('Edison Arenas','edison arenas'),
    ('Milton Castiblanco','milton castiblanco'),
    ('Sebastián Canal','sebastian canal'),
    ('Nelson Mompotes','nelson mompotes'),
    ('Nicolas Caballero','nicolas caballero'),
    ('Yesid Payares','yesid payares'),
    ('Oscar Biedma','oscar biedma'),
    ('Leni Cabrera','leni cabrera'),
    ('Edwin Wilches','edwin wilches')
ON CONFLICT (nombre_normalizado) DO NOTHING;

-- 5. Sincronizar el nombre mostrado en las asignaciones con el nombre corregido
UPDATE public.ofrenda_plano_asignaciones a
    SET nombre_snapshot = p.nombre
    FROM public.ofrenda_plano_personas p
    WHERE a.persona_id = p.id;

COMMIT;
