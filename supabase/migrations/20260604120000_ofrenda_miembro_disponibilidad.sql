-- Disponibilidad por turno (jueves / domingo mañana / domingo tarde)
ALTER TABLE public.ofrenda_miembros
    ADD COLUMN IF NOT EXISTS puede_jueves boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS puede_domingo_manana boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS puede_domingo_tarde boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ofrenda_miembros.puede_jueves IS 'Puede asignarse en servicios de jueves (generación automática)';
COMMENT ON COLUMN public.ofrenda_miembros.puede_domingo_manana IS 'Puede asignarse en domingo mañana';
COMMENT ON COLUMN public.ofrenda_miembros.puede_domingo_tarde IS 'Puede asignarse en domingo tarde';
