-- Alinear punteros de secuencia con secuencia_maximo (1..99).
-- Antes: secuencia_puntero(_fin) solo 1..20 → fallo al guardar ciclo > 20.

ALTER TABLE public.ofrenda_planes
    DROP CONSTRAINT IF EXISTS ofrenda_planes_secuencia_puntero_check;

ALTER TABLE public.ofrenda_planes
    DROP CONSTRAINT IF EXISTS ofrenda_planes_secuencia_puntero_fin_check;

ALTER TABLE public.ofrenda_planes
    ADD CONSTRAINT ofrenda_planes_secuencia_puntero_check
        CHECK (secuencia_puntero BETWEEN 1 AND 99);

ALTER TABLE public.ofrenda_planes
    ADD CONSTRAINT ofrenda_planes_secuencia_puntero_fin_check
        CHECK (secuencia_puntero_fin BETWEEN 1 AND 99);

COMMENT ON COLUMN public.ofrenda_planes.secuencia_puntero IS
    'Saco inicial del plan (1..secuencia_maximo, máx. 99 en BD).';

COMMENT ON COLUMN public.ofrenda_planes.secuencia_puntero_fin IS
    'Saco tras el último servicio del mes (1..secuencia_maximo, máx. 99 en BD).';
