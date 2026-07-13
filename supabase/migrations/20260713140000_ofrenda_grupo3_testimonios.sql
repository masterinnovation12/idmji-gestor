-- =============================================================================
-- LABOR OFRENDA (Labores Generales) — Grupo 3 · Testimonios
-- =============================================================================
-- Personas que solo hacen testimonios (no son ni Grupo 1 ni Grupo 2).
-- Se suman al pool de testimonios junto a G1 y G2, pero nunca entran en los
-- roles operativos de G1 ni en los colaboradores de G2.

ALTER TABLE public.ofrenda_miembros DROP CONSTRAINT IF EXISTS ofrenda_miembros_grupo_check;

ALTER TABLE public.ofrenda_miembros
    ADD CONSTRAINT ofrenda_miembros_grupo_check CHECK (grupo IN (1, 2, 3));
