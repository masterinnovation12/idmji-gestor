-- =============================================================================
-- ASISTENCIA POR CULTO (registro de aforo desde administración)
-- =============================================================================
-- Aditiva y retrocompatible: columna nullable; NULL = sin registrar.
-- La RLS existente de cultos ya cubre la escritura (ADMIN siempre; editores
-- con permiso solo en su sede).

ALTER TABLE public.cultos
    ADD COLUMN IF NOT EXISTS asistencia integer
    CONSTRAINT cultos_asistencia_no_negativa CHECK (asistencia >= 0);

COMMENT ON COLUMN public.cultos.asistencia IS 'Personas asistentes al culto (null = sin registrar)';
