-- =============================================================================
-- PLANO TEMPLO - Personas faltantes de hojas manuales (Labor Ofrenda)
-- =============================================================================
-- Mantiene en version control las altas que ya fueron aplicadas en Supabase.

INSERT INTO public.ofrenda_plano_personas (
    nombre,
    nombre_normalizado,
    activo,
    capacidad
)
VALUES
    ('Gleidis Amador', 'gleidis amador', true, 'ambos'),
    ('Yicely Ruiz', 'yicely ruiz', true, 'ambos'),
    (U&'Mar\00EDa Edilma Moreno', 'maria edilma moreno', true, 'ambos')
ON CONFLICT (nombre_normalizado) DO UPDATE
SET
    nombre = EXCLUDED.nombre,
    activo = true,
    capacidad = EXCLUDED.capacidad;
