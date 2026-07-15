-- =============================================================================
-- COORDENADAS DE SEDES (mapa interactivo de administración)
-- =============================================================================
-- Aditiva y retrocompatible: columnas nullable, sin backfill obligatorio.
-- El ADMIN las edita desde /dashboard/admin/sedes.

ALTER TABLE public.sedes
    ADD COLUMN IF NOT EXISTS lat double precision,
    ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.sedes.lat IS 'Latitud para el mapa de sedes (admin)';
COMMENT ON COLUMN public.sedes.lng IS 'Longitud para el mapa de sedes (admin)';
