-- =============================================================================
-- PLANO TEMPLO — Layouts, personas y asignaciones (Labor Ofrenda)
-- =============================================================================

-- 1. Layouts globales por (modo, vista) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ofrenda_plano_layouts (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    modo        text        NOT NULL CHECK (modo IN ('sacos_4', 'sacos_8')),
    vista       text        NOT NULL CHECK (vista IN ('2d', '3d')),
    fondo       text        NOT NULL DEFAULT 'svg' CHECK (fondo IN ('svg', 'jpg')),
    elementos   jsonb       NOT NULL,
    updated_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (modo, vista)
);

-- 2. Directorio de personas del plano (independiente de ofrenda_miembros) ─────
CREATE TABLE IF NOT EXISTS public.ofrenda_plano_personas (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              text        NOT NULL,
    nombre_normalizado  text        NOT NULL,
    activo              boolean     NOT NULL DEFAULT true,
    created_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (nombre_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_ofrenda_plano_personas_busqueda
    ON public.ofrenda_plano_personas (nombre_normalizado text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_ofrenda_plano_personas_activo
    ON public.ofrenda_plano_personas (activo) WHERE activo = true;

-- 3. Asignaciones por servicio × bloque × rol ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ofrenda_plano_asignaciones (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id     uuid        NOT NULL REFERENCES public.ofrenda_servicios(id) ON DELETE CASCADE,
    bloque          smallint    NOT NULL CHECK (bloque BETWEEN 1 AND 8),
    rol             text        NOT NULL CHECK (rol IN ('ofrendario', 'apoyo')),
    persona_id      uuid        REFERENCES public.ofrenda_plano_personas(id) ON DELETE SET NULL,
    nombre_snapshot text,
    UNIQUE (servicio_id, bloque, rol)
);

CREATE INDEX IF NOT EXISTS idx_ofrenda_plano_asignaciones_srv
    ON public.ofrenda_plano_asignaciones (servicio_id);

-- 4. Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.ofrenda_plano_layouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofrenda_plano_personas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofrenda_plano_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ofrenda_plano_layouts_select" ON public.ofrenda_plano_layouts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ofrenda_plano_personas_select" ON public.ofrenda_plano_personas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ofrenda_plano_asignaciones_select" ON public.ofrenda_plano_asignaciones
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ofrenda_plano_layouts_write" ON public.ofrenda_plano_layouts
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    );

CREATE POLICY "ofrenda_plano_personas_write" ON public.ofrenda_plano_personas
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    );

CREATE POLICY "ofrenda_plano_asignaciones_write" ON public.ofrenda_plano_asignaciones
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    );
