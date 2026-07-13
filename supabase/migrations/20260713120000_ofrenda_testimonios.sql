-- =============================================================================
-- LABOR OFRENDA (Labores Generales) — Roles de Testimonios
-- =============================================================================
-- Testimonios 1 y Testimonios 2: labor que pueden realizar personas tanto del
-- Grupo 1 como del Grupo 2. Se asignan por rotación sobre el pool combinado.

ALTER TABLE public.ofrenda_asignaciones DROP CONSTRAINT IF EXISTS ofrenda_asignaciones_rol_check;

ALTER TABLE public.ofrenda_asignaciones
    ADD CONSTRAINT ofrenda_asignaciones_rol_check CHECK (
        rol IN (
            'realiza', 'apoyo', 'vigilancia',
            'primera_vez', 'segunda_tercera_vez', 'imposicion_manos',
            'colaborador_1', 'colaborador_2', 'colaborador_3',
            'testimonio_1', 'testimonio_2'
        )
    );
