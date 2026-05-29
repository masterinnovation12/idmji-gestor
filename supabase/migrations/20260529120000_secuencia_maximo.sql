-- Máximo del ciclo de sacos (1..N) configurable por plan; antes fijo en 20.
ALTER TABLE public.ofrenda_planes
    ADD COLUMN IF NOT EXISTS secuencia_maximo smallint NOT NULL DEFAULT 20
        CHECK (secuencia_maximo BETWEEN 1 AND 99);

COMMENT ON COLUMN public.ofrenda_planes.secuencia_maximo IS
    'Tamaño del ciclo de numeración de sacos (ej. 20 → sacos 01–20 con wrap).';
