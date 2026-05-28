-- ============================================================================
-- Migración: Añadir servicio Domingo Tarde al módulo Labor Ofrenda
-- ============================================================================

-- 1. Añadir columnas de sacos configurables por tipo a ofrenda_planes
ALTER TABLE public.ofrenda_planes
    ADD COLUMN IF NOT EXISTS sacos_jueves        smallint NOT NULL DEFAULT 4 CHECK (sacos_jueves BETWEEN 1 AND 20),
    ADD COLUMN IF NOT EXISTS sacos_domingo        smallint NOT NULL DEFAULT 8 CHECK (sacos_domingo BETWEEN 1 AND 20),
    ADD COLUMN IF NOT EXISTS sacos_domingo_tarde  smallint NOT NULL DEFAULT 4 CHECK (sacos_domingo_tarde BETWEEN 1 AND 20);

-- 2. Cambiar CHECK constraint de dia_tipo para aceptar 'domingo_tarde'
ALTER TABLE public.ofrenda_servicios
    DROP CONSTRAINT IF EXISTS ofrenda_servicios_dia_tipo_check;

ALTER TABLE public.ofrenda_servicios
    ADD CONSTRAINT ofrenda_servicios_dia_tipo_check
    CHECK (dia_tipo IN ('jueves', 'domingo', 'domingo_tarde'));

-- 3. Reemplazar UNIQUE (plan_id, fecha) por UNIQUE (plan_id, fecha, dia_tipo)
--    para permitir Dom Mañana y Dom Tarde en la misma fecha
ALTER TABLE public.ofrenda_servicios
    DROP CONSTRAINT IF EXISTS ofrenda_servicios_plan_id_fecha_key;

ALTER TABLE public.ofrenda_servicios
    ADD CONSTRAINT ofrenda_servicios_plan_id_fecha_tipo_key
    UNIQUE (plan_id, fecha, dia_tipo);

-- 4. Limpiar planes existentes (CASCADE) para regenerar con la nueva estructura
TRUNCATE public.ofrenda_planes CASCADE;
