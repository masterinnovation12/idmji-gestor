-- =============================================================================
-- LABOR OFRENDA — Puestos fijos por miembro (coordinador/apoyo por día_tipo)
-- =============================================================================
-- Un miembro con fijo_dia_tipo + fijo_rol queda "clavado" a ese hueco en cada
-- generación del plan (siempre esa persona ese día). El resto se sigue asignando
-- aleatoriamente. Solo aplica a roles de Grupo 1 (realiza/apoyo).

ALTER TABLE public.ofrenda_miembros
    ADD COLUMN IF NOT EXISTS fijo_dia_tipo text CHECK (fijo_dia_tipo IN ('jueves','domingo','domingo_tarde')),
    ADD COLUMN IF NOT EXISTS fijo_rol      text CHECK (fijo_rol IN ('realiza','apoyo'));
