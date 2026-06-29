-- =============================================================================
-- PLANO TEMPLO - Parejas de personas (Labor Ofrenda)
-- =============================================================================
-- Registra matrimonios entre personas del plano para poder filtrar casados y,
-- en la generacion del plan mensual, priorizar parejas juntas en ofrenda/apoyo.

CREATE TABLE IF NOT EXISTS public.ofrenda_plano_parejas (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    mujer_persona_id   uuid        NOT NULL REFERENCES public.ofrenda_plano_personas(id) ON DELETE CASCADE,
    hombre_persona_id  uuid        NOT NULL REFERENCES public.ofrenda_plano_personas(id) ON DELETE CASCADE,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CHECK (mujer_persona_id <> hombre_persona_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ofrenda_plano_parejas_mujer
    ON public.ofrenda_plano_parejas (mujer_persona_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ofrenda_plano_parejas_hombre
    ON public.ofrenda_plano_parejas (hombre_persona_id);

CREATE INDEX IF NOT EXISTS idx_ofrenda_plano_parejas_hombre_lookup
    ON public.ofrenda_plano_parejas (hombre_persona_id, mujer_persona_id);

ALTER TABLE public.ofrenda_plano_parejas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ofrenda_plano_parejas_select" ON public.ofrenda_plano_parejas;
CREATE POLICY "ofrenda_plano_parejas_select" ON public.ofrenda_plano_parejas
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ofrenda_plano_parejas_write" ON public.ofrenda_plano_parejas;
CREATE POLICY "ofrenda_plano_parejas_write" ON public.ofrenda_plano_parejas
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('ADMIN', 'EDITOR'))
    );

WITH parejas(mujer_nombre, hombre_nombre) AS (
    VALUES
        ('maria jose vera', 'camilo solorzano'),
        ('alicia montes', 'edgar agaton'),
        ('esperanza sandoval', 'sebastian lopez'),
        ('liliana benitez', 'cristian morales'),
        ('noemy ramirez', 'carlos galvis'),
        ('eliana moreno', 'juan camilo carrillo'),
        ('lia aranda', 'leo mantilla'),
        ('maria edilma aricapa', 'daniel bonilla'),
        ('mayela campos', 'jorge pichardo'),
        ('marleny quintero', 'luis collazos'),
        ('dayhana sanchez', 'juan david castano'),
        ('eymy arana', 'martin a. castaneda'),
        ('nallivi diaz', 'paolo simoes'),
        ('viviana gil', 'edwin castiblanco'),
        ('edith leonel', 'elkin mendez'),
        ('sandra alcaraz', 'joan ruiz bosch')
)
INSERT INTO public.ofrenda_plano_parejas (mujer_persona_id, hombre_persona_id)
SELECT mujer.id, hombre.id
FROM parejas p
JOIN public.ofrenda_plano_personas mujer
    ON mujer.nombre_normalizado = p.mujer_nombre
JOIN public.ofrenda_plano_personas hombre
    ON hombre.nombre_normalizado = p.hombre_nombre
ON CONFLICT DO NOTHING;
