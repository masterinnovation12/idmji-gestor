-- =============================================================================
-- LABOR OFRENDA — Módulo de planificación mensual de ofrenda
-- =============================================================================
-- Tablas:
--   ofrenda_miembros    — personas asignables (Grupo 1: roles / Grupo 2: colaboradores)
--   ofrenda_planes      — un plan por mes/año (incluye puntero de secuencia de sacos)
--   ofrenda_servicios   — cada jueves y domingo dentro del plan
--   ofrenda_asignaciones — asignación de un miembro a un rol en un servicio
-- =============================================================================

-- 1. Miembros ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ofrenda_miembros (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text        NOT NULL,
    grupo       smallint    NOT NULL CHECK (grupo IN (1, 2)),
    orden       smallint    NOT NULL DEFAULT 0,
    activo      boolean     NOT NULL DEFAULT true,
    -- Enlace opcional al perfil del hermano en el sistema
    profile_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ofrenda_miembros_grupo   ON public.ofrenda_miembros (grupo, orden);
CREATE INDEX IF NOT EXISTS idx_ofrenda_miembros_activo  ON public.ofrenda_miembros (activo);

-- 2. Planes (un registro por mes/año) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ofrenda_planes (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    anio                smallint    NOT NULL,
    mes                 smallint    NOT NULL CHECK (mes BETWEEN 1 AND 12),
    -- Número de saco desde donde arranca la secuencia del primer servicio del mes
    secuencia_puntero   smallint    NOT NULL DEFAULT 1 CHECK (secuencia_puntero BETWEEN 1 AND 20),
    -- Puntero que quedará para el mes siguiente tras generar todos los servicios
    secuencia_puntero_fin smallint  NOT NULL DEFAULT 1 CHECK (secuencia_puntero_fin BETWEEN 1 AND 20),
    created_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (anio, mes)
);

-- 3. Servicios (cada jueves/domingo del plan) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ofrenda_servicios (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             uuid        NOT NULL REFERENCES public.ofrenda_planes(id) ON DELETE CASCADE,
    fecha               date        NOT NULL,
    dia_tipo            text        NOT NULL CHECK (dia_tipo IN ('jueves', 'domingo')),
    semana_iso          smallint    NOT NULL,
    secuencia_desde     smallint    NOT NULL,
    secuencia_hasta     smallint    NOT NULL,
    secuencia_texto     text        NOT NULL,  -- cache "09 al 12"
    posicion            smallint    NOT NULL,  -- orden 0,1,2... dentro del plan
    UNIQUE (plan_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_ofrenda_servicios_plan   ON public.ofrenda_servicios (plan_id, posicion);

-- 4. Asignaciones (un registro por servicio × rol) ────────────────────────────
-- Roles: realiza | apoyo | vigilancia  → Grupo 1
--        colaborador_1 | colaborador_2 | colaborador_3 → Grupo 2
CREATE TABLE IF NOT EXISTS public.ofrenda_asignaciones (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id uuid        NOT NULL REFERENCES public.ofrenda_servicios(id) ON DELETE CASCADE,
    rol         text        NOT NULL CHECK (rol IN ('realiza','apoyo','vigilancia','colaborador_1','colaborador_2','colaborador_3')),
    miembro_id  uuid        REFERENCES public.ofrenda_miembros(id) ON DELETE SET NULL,
    es_override boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (servicio_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_ofrenda_asignaciones_srv ON public.ofrenda_asignaciones (servicio_id);
CREATE INDEX IF NOT EXISTS idx_ofrenda_asignaciones_mbr ON public.ofrenda_asignaciones (miembro_id);

-- 5. Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.ofrenda_miembros    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofrenda_planes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofrenda_servicios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofrenda_asignaciones ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
CREATE POLICY "ofrenda_miembros_select"    ON public.ofrenda_miembros    FOR SELECT TO authenticated USING (true);
CREATE POLICY "ofrenda_planes_select"      ON public.ofrenda_planes      FOR SELECT TO authenticated USING (true);
CREATE POLICY "ofrenda_servicios_select"   ON public.ofrenda_servicios   FOR SELECT TO authenticated USING (true);
CREATE POLICY "ofrenda_asignaciones_select" ON public.ofrenda_asignaciones FOR SELECT TO authenticated USING (true);

-- Escritura: solo ADMIN y EDITOR
CREATE POLICY "ofrenda_miembros_write" ON public.ofrenda_miembros
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    );

CREATE POLICY "ofrenda_planes_write" ON public.ofrenda_planes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    );

CREATE POLICY "ofrenda_servicios_write" ON public.ofrenda_servicios
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    );

CREATE POLICY "ofrenda_asignaciones_write" ON public.ofrenda_asignaciones
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND rol IN ('ADMIN','EDITOR')
        )
    );

-- 6. Función updated_at automático ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_ofrenda_miembros_updated_at
    BEFORE UPDATE ON public.ofrenda_miembros
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ofrenda_planes_updated_at
    BEFORE UPDATE ON public.ofrenda_planes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ofrenda_asignaciones_updated_at
    BEFORE UPDATE ON public.ofrenda_asignaciones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Datos iniciales — Grupo 1 (roles) y Grupo 2 (colaboradores) ──────────────
INSERT INTO public.ofrenda_miembros (nombre, grupo, orden) VALUES
    ('Alejandro Perez',    1, 0),
    ('Rafael Quer',        1, 1),
    ('Hugo Bolaños',       1, 2),
    ('Jeffrey Bolaños',    1, 3),
    ('Andrés Zapata',      1, 4),
    ('Oscar Montoya',      1, 5),
    ('Edwin Wilches',      2, 0),
    ('Milton Castiblanco', 2, 1),
    ('Yesid Payares',      2, 2),
    ('Camilo Solorzano',   2, 3),
    ('Álvaro Tangarife',   2, 4),
    ('Elkin Méndez',       2, 5)
ON CONFLICT DO NOTHING;
