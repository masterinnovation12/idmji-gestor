-- =============================================================================
-- PLANO TEMPLO — Capacidad de la persona (ofrendario | apoyo | ambos)
-- =============================================================================
-- Distingue quién puede hacer ofrendario, quién solo hace sobres (apoyo) y quién
-- ambas cosas. La app avisa al asignar una persona a un rol que no es el suyo.
-- Por defecto 'ofrendario' (la mayoría); el seed posterior marcará los de 'apoyo'.

ALTER TABLE public.ofrenda_plano_personas
    ADD COLUMN IF NOT EXISTS capacidad text NOT NULL DEFAULT 'ofrendario'
    CHECK (capacidad IN ('ofrendario', 'apoyo', 'ambos'));
