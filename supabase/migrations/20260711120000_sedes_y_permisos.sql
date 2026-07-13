-- =============================================================================
-- MULTI-SEDE + PERMISOS GRANULARES
-- =============================================================================
-- 1) Tabla `sedes` (Sabadell como sede principal, backfill de todo lo existente)
-- 2) Columna `sede_id` en tablas operativas + índices + constraints por sede
-- 3) Columna `profiles.permisos` (jsonb) con overrides por usuario
-- 4) Funciones RLS: is_admin(), user_sede_id(), default_sede_id(), user_can()
-- 5) Políticas RLS con aislamiento por sede + permisos granulares
--
-- Retrocompatible: todos los datos existentes quedan en la sede principal y
-- los defaults rellenan sede_id en inserts del código ya desplegado.
-- =============================================================================

-- Las funciones de la sección 2 referencian profiles.sede_id, que se crea en la
-- sección 3: desactivar la validación de cuerpos durante esta migración.
SET check_function_bodies = off;

-- 0. Rol SONIDO (la migración 20260311200000 nunca llegó a aplicarse en BD) ────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SONIDO';

-- 1. Tabla sedes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sedes (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        text        NOT NULL,
    slug          text        NOT NULL UNIQUE,
    ciudad        text,
    direccion     text,
    email_dominio text,
    activo        boolean     NOT NULL DEFAULT true,
    es_principal  boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Solo puede haber una sede principal
CREATE UNIQUE INDEX IF NOT EXISTS idx_sedes_unica_principal
    ON public.sedes (es_principal) WHERE es_principal;

DROP TRIGGER IF EXISTS trg_sedes_updated_at ON public.sedes;
CREATE TRIGGER trg_sedes_updated_at
    BEFORE UPDATE ON public.sedes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.sedes (nombre, slug, ciudad, email_dominio, es_principal)
VALUES ('Sabadell', 'sabadell', 'Sabadell', '@idmjisabadell.org', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Funciones auxiliares (SECURITY DEFINER: evitan recursión RLS) ─────────────
CREATE OR REPLACE FUNCTION public.get_sede_principal_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.sedes WHERE es_principal LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_sede_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT sede_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.default_sede_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(public.user_sede_id(), public.get_sede_principal_id());
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND rol = 'ADMIN'
    );
$$;

-- Permiso efectivo: ADMIN siempre; override en profiles.permisos si existe;
-- si no, EDITOR permite por defecto y el resto de roles deniega.
-- (Debe mantenerse en sintonía con src/lib/auth/permissions.ts)
CREATE OR REPLACE FUNCTION public.user_can(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE
        WHEN p.rol = 'ADMIN' THEN true
        WHEN p.permisos ? perm THEN COALESCE((p.permisos ->> perm)::boolean, false)
        WHEN p.rol = 'EDITOR' THEN true
        ELSE false
    END
    FROM public.profiles p
    WHERE p.id = auth.uid();
$$;

-- 3. profiles: sede + permisos ─────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS sede_id uuid REFERENCES public.sedes(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS permisos jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.profiles SET sede_id = public.get_sede_principal_id() WHERE sede_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN sede_id SET DEFAULT public.get_sede_principal_id();
ALTER TABLE public.profiles ALTER COLUMN sede_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_sede ON public.profiles (sede_id);

-- 4. sede_id en tablas operativas ─────────────────────────────────────────────
-- (las tablas hija heredan la sede vía FK: ofrenda_servicios/asignaciones,
--  ofrenda_plano_asignaciones, lecturas_biblicas, plan_himnos_coros)
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'cultos', 'culto_schedules', 'festivos', 'movimientos',
        'ofrenda_miembros', 'ofrenda_planes',
        'ofrenda_plano_personas', 'ofrenda_plano_parejas', 'ofrenda_plano_layouts'
    ] LOOP
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sede_id uuid REFERENCES public.sedes(id) ON DELETE RESTRICT',
            t
        );
        EXECUTE format(
            'UPDATE public.%I SET sede_id = public.get_sede_principal_id() WHERE sede_id IS NULL',
            t
        );
        EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN sede_id SET DEFAULT public.default_sede_id()',
            t
        );
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN sede_id SET NOT NULL', t);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_sede ON public.%I (sede_id)', t, t);
    END LOOP;
END $$;

-- 5. Constraints únicos que pasan a ser por sede ──────────────────────────────
ALTER TABLE public.ofrenda_planes
    DROP CONSTRAINT IF EXISTS ofrenda_planes_anio_mes_key,
    ADD CONSTRAINT ofrenda_planes_sede_anio_mes_key UNIQUE (sede_id, anio, mes);

ALTER TABLE public.ofrenda_plano_personas
    DROP CONSTRAINT IF EXISTS ofrenda_plano_personas_nombre_normalizado_key,
    ADD CONSTRAINT ofrenda_plano_personas_sede_nombre_key UNIQUE (sede_id, nombre_normalizado);

ALTER TABLE public.ofrenda_plano_layouts
    DROP CONSTRAINT IF EXISTS ofrenda_plano_layouts_modo_vista_key,
    ADD CONSTRAINT ofrenda_plano_layouts_sede_modo_vista_key UNIQUE (sede_id, modo, vista);

ALTER TABLE public.culto_schedules
    DROP CONSTRAINT IF EXISTS culto_schedules_day_of_week_time_key,
    ADD CONSTRAINT culto_schedules_sede_day_time_key UNIQUE (sede_id, day_of_week, default_time);

ALTER TABLE public.festivos
    DROP CONSTRAINT IF EXISTS festivos_fecha_key,
    ADD CONSTRAINT festivos_sede_fecha_key UNIQUE (sede_id, fecha);

-- 6. RLS: sedes ────────────────────────────────────────────────────────────────
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sedes_select" ON public.sedes;
CREATE POLICY "sedes_select" ON public.sedes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sedes_write" ON public.sedes;
CREATE POLICY "sedes_write" ON public.sedes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. RLS: profiles (aislamiento por sede en lectura) ──────────────────────────
DROP POLICY IF EXISTS "Ver perfiles públicos" ON public.profiles;
CREATE POLICY "profiles_select_sede" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR sede_id = public.user_sede_id()
    );

-- 8. RLS: cultos ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Ver cultos" ON public.cultos;
CREATE POLICY "cultos_select_sede" ON public.cultos
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "Crear cultos" ON public.cultos;
CREATE POLICY "cultos_insert" ON public.cultos
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (public.user_can('cultos.gestionar') AND sede_id = public.user_sede_id())
    );

DROP POLICY IF EXISTS "Editar cultos" ON public.cultos;
CREATE POLICY "cultos_update" ON public.cultos
    FOR UPDATE TO authenticated
    USING (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (
                public.user_can('cultos.gestionar')
                OR public.user_can('cultos.editarDetalle')
                OR public.user_can('cultos.asignarHermanos')
                OR public.user_can('himnos.gestionar')
            )
        )
    );

DROP POLICY IF EXISTS "Eliminar cultos" ON public.cultos;
CREATE POLICY "cultos_delete" ON public.cultos
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 9. RLS: festivos (EDITOR con permiso también puede gestionarlos) ─────────────
DROP POLICY IF EXISTS "Festivos públicos para lectura" ON public.festivos;
CREATE POLICY "festivos_select_sede" ON public.festivos
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "Solo ADMIN puede modificar festivos" ON public.festivos;
CREATE POLICY "festivos_write" ON public.festivos
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (public.user_can('cultos.gestionar') AND sede_id = public.user_sede_id())
    )
    WITH CHECK (
        public.is_admin()
        OR (public.user_can('cultos.gestionar') AND sede_id = public.user_sede_id())
    );

-- 10. RLS: culto_schedules ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read" ON public.culto_schedules;
CREATE POLICY "culto_schedules_select_sede" ON public.culto_schedules
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "culto_schedules_write" ON public.culto_schedules;
CREATE POLICY "culto_schedules_write" ON public.culto_schedules
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 11. RLS: lecturas_biblicas (por sede vía culto padre + permiso) ──────────────
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.lecturas_biblicas;
CREATE POLICY "lecturas_select_sede" ON public.lecturas_biblicas
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.cultos c
            WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
        )
    );

DROP POLICY IF EXISTS "Permitir inserción a usuarios autenticados" ON public.lecturas_biblicas;
CREATE POLICY "lecturas_insert" ON public.lecturas_biblicas
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.user_can('lecturas.gestionar')
            AND EXISTS (
                SELECT 1 FROM public.cultos c
                WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
            )
        )
    );

DROP POLICY IF EXISTS "Permitir actualización a usuarios autenticados" ON public.lecturas_biblicas;
CREATE POLICY "lecturas_update" ON public.lecturas_biblicas
    FOR UPDATE TO authenticated
    USING (
        public.is_admin()
        OR (
            public.user_can('lecturas.gestionar')
            AND EXISTS (
                SELECT 1 FROM public.cultos c
                WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
            )
        )
    );

DROP POLICY IF EXISTS "Permitir eliminación a usuarios autenticados" ON public.lecturas_biblicas;
CREATE POLICY "lecturas_delete" ON public.lecturas_biblicas
    FOR DELETE TO authenticated
    USING (
        public.is_admin()
        OR (
            public.user_can('lecturas.gestionar')
            AND EXISTS (
                SELECT 1 FROM public.cultos c
                WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
            )
        )
    );

-- 12. RLS: plan_himnos_coros (por sede vía culto padre + permiso) ──────────────
DROP POLICY IF EXISTS "Acceso total para autenticados" ON public.plan_himnos_coros;
CREATE POLICY "plan_himnos_select_sede" ON public.plan_himnos_coros
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.cultos c
            WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
        )
    );

CREATE POLICY "plan_himnos_write" ON public.plan_himnos_coros
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.user_can('himnos.gestionar')
            AND EXISTS (
                SELECT 1 FROM public.cultos c
                WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.user_can('himnos.gestionar')
            AND EXISTS (
                SELECT 1 FROM public.cultos c
                WHERE c.id = culto_id AND c.sede_id = public.user_sede_id()
            )
        )
    );

-- 13. RLS: app_config (corrige bug latente: EDITOR no podía mover secuencias) ──
DROP POLICY IF EXISTS "Solo ADMIN puede modificar configuración" ON public.app_config;
CREATE POLICY "app_config_write" ON public.app_config
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.user_can('himnos.gestionar'))
    WITH CHECK (public.is_admin() OR public.user_can('himnos.gestionar'));

-- 14. RLS: labor general (miembros / planes / servicios / asignaciones) ────────
DROP POLICY IF EXISTS "ofrenda_miembros_select" ON public.ofrenda_miembros;
CREATE POLICY "ofrenda_miembros_select" ON public.ofrenda_miembros
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "ofrenda_miembros_write" ON public.ofrenda_miembros;
CREATE POLICY "ofrenda_miembros_write" ON public.ofrenda_miembros
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (public.user_can('hermanos.gestionar') OR public.user_can('laborGeneral.gestionar'))
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (public.user_can('hermanos.gestionar') OR public.user_can('laborGeneral.gestionar'))
        )
    );

DROP POLICY IF EXISTS "ofrenda_planes_select" ON public.ofrenda_planes;
CREATE POLICY "ofrenda_planes_select" ON public.ofrenda_planes
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "ofrenda_planes_write" ON public.ofrenda_planes;
CREATE POLICY "ofrenda_planes_write" ON public.ofrenda_planes
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (sede_id = public.user_sede_id() AND public.user_can('laborGeneral.gestionar'))
    )
    WITH CHECK (
        public.is_admin()
        OR (sede_id = public.user_sede_id() AND public.user_can('laborGeneral.gestionar'))
    );

DROP POLICY IF EXISTS "ofrenda_servicios_select" ON public.ofrenda_servicios;
CREATE POLICY "ofrenda_servicios_select" ON public.ofrenda_servicios
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.ofrenda_planes p
            WHERE p.id = plan_id AND p.sede_id = public.user_sede_id()
        )
    );

DROP POLICY IF EXISTS "ofrenda_servicios_write" ON public.ofrenda_servicios;
CREATE POLICY "ofrenda_servicios_write" ON public.ofrenda_servicios
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            (public.user_can('laborGeneral.gestionar') OR public.user_can('laborPlano.gestionar'))
            AND EXISTS (
                SELECT 1 FROM public.ofrenda_planes p
                WHERE p.id = plan_id AND p.sede_id = public.user_sede_id()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            (public.user_can('laborGeneral.gestionar') OR public.user_can('laborPlano.gestionar'))
            AND EXISTS (
                SELECT 1 FROM public.ofrenda_planes p
                WHERE p.id = plan_id AND p.sede_id = public.user_sede_id()
            )
        )
    );

DROP POLICY IF EXISTS "ofrenda_asignaciones_select" ON public.ofrenda_asignaciones;
CREATE POLICY "ofrenda_asignaciones_select" ON public.ofrenda_asignaciones
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.ofrenda_servicios s
            JOIN public.ofrenda_planes p ON p.id = s.plan_id
            WHERE s.id = servicio_id AND p.sede_id = public.user_sede_id()
        )
    );

DROP POLICY IF EXISTS "ofrenda_asignaciones_write" ON public.ofrenda_asignaciones;
CREATE POLICY "ofrenda_asignaciones_write" ON public.ofrenda_asignaciones
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.user_can('laborGeneral.gestionar')
            AND EXISTS (
                SELECT 1
                FROM public.ofrenda_servicios s
                JOIN public.ofrenda_planes p ON p.id = s.plan_id
                WHERE s.id = servicio_id AND p.sede_id = public.user_sede_id()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.user_can('laborGeneral.gestionar')
            AND EXISTS (
                SELECT 1
                FROM public.ofrenda_servicios s
                JOIN public.ofrenda_planes p ON p.id = s.plan_id
                WHERE s.id = servicio_id AND p.sede_id = public.user_sede_id()
            )
        )
    );

-- 15. RLS: plano (layouts / personas / parejas / asignaciones) ─────────────────
DROP POLICY IF EXISTS "ofrenda_plano_layouts_select" ON public.ofrenda_plano_layouts;
CREATE POLICY "ofrenda_plano_layouts_select" ON public.ofrenda_plano_layouts
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "ofrenda_plano_layouts_write" ON public.ofrenda_plano_layouts;
CREATE POLICY "ofrenda_plano_layouts_write" ON public.ofrenda_plano_layouts
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (sede_id = public.user_sede_id() AND public.user_can('laborPlano.gestionar'))
    )
    WITH CHECK (
        public.is_admin()
        OR (sede_id = public.user_sede_id() AND public.user_can('laborPlano.gestionar'))
    );

DROP POLICY IF EXISTS "ofrenda_plano_personas_select" ON public.ofrenda_plano_personas;
CREATE POLICY "ofrenda_plano_personas_select" ON public.ofrenda_plano_personas
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "ofrenda_plano_personas_write" ON public.ofrenda_plano_personas;
CREATE POLICY "ofrenda_plano_personas_write" ON public.ofrenda_plano_personas
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (public.user_can('hermanos.gestionar') OR public.user_can('laborPlano.gestionar'))
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (public.user_can('hermanos.gestionar') OR public.user_can('laborPlano.gestionar'))
        )
    );

-- ofrenda_plano_parejas: políticas previas de la migración 20260627120000
DROP POLICY IF EXISTS "ofrenda_plano_parejas_select" ON public.ofrenda_plano_parejas;
CREATE POLICY "ofrenda_plano_parejas_select" ON public.ofrenda_plano_parejas
    FOR SELECT TO authenticated
    USING (public.is_admin() OR sede_id = public.user_sede_id());

DROP POLICY IF EXISTS "ofrenda_plano_parejas_write" ON public.ofrenda_plano_parejas;
CREATE POLICY "ofrenda_plano_parejas_write" ON public.ofrenda_plano_parejas
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (public.user_can('hermanos.gestionar') OR public.user_can('laborPlano.gestionar'))
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            sede_id = public.user_sede_id()
            AND (public.user_can('hermanos.gestionar') OR public.user_can('laborPlano.gestionar'))
        )
    );

DROP POLICY IF EXISTS "ofrenda_plano_asignaciones_select" ON public.ofrenda_plano_asignaciones;
CREATE POLICY "ofrenda_plano_asignaciones_select" ON public.ofrenda_plano_asignaciones
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.ofrenda_servicios s
            JOIN public.ofrenda_planes p ON p.id = s.plan_id
            WHERE s.id = servicio_id AND p.sede_id = public.user_sede_id()
        )
    );

DROP POLICY IF EXISTS "ofrenda_plano_asignaciones_write" ON public.ofrenda_plano_asignaciones;
CREATE POLICY "ofrenda_plano_asignaciones_write" ON public.ofrenda_plano_asignaciones
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.user_can('laborPlano.gestionar')
            AND EXISTS (
                SELECT 1
                FROM public.ofrenda_servicios s
                JOIN public.ofrenda_planes p ON p.id = s.plan_id
                WHERE s.id = servicio_id AND p.sede_id = public.user_sede_id()
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.user_can('laborPlano.gestionar')
            AND EXISTS (
                SELECT 1
                FROM public.ofrenda_servicios s
                JOIN public.ofrenda_planes p ON p.id = s.plan_id
                WHERE s.id = servicio_id AND p.sede_id = public.user_sede_id()
            )
        )
    );

-- 16. RLS: movimientos (antes sin RLS: cualquier autenticado podía leerlo todo) ─
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_select" ON public.movimientos;
CREATE POLICY "movimientos_select" ON public.movimientos
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "movimientos_insert" ON public.movimientos;
CREATE POLICY "movimientos_insert" ON public.movimientos
    FOR INSERT TO authenticated
    WITH CHECK (true);
