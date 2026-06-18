-- =============================================================================
-- LABOR OFRENDA — Nuevos roles de Grupo 1 (aleatorios, usan disponibilidad)
-- =============================================================================
-- Colaborador 1ª vez, Colaborador 2ª y 3ª vez, Imposición de manos.
-- Se asignan por sorteo entre los miembros de Grupo 1 disponibles ese día.

ALTER TABLE public.ofrenda_asignaciones DROP CONSTRAINT IF EXISTS ofrenda_asignaciones_rol_check;

ALTER TABLE public.ofrenda_asignaciones
    ADD CONSTRAINT ofrenda_asignaciones_rol_check CHECK (
        rol IN (
            'realiza', 'apoyo', 'vigilancia',
            'primera_vez', 'segunda_tercera_vez', 'imposicion_manos',
            'colaborador_1', 'colaborador_2', 'colaborador_3'
        )
    );
