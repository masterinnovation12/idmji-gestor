-- =============================================================================
-- SEGURIDAD DE CATÁLOGOS + PERMISO himnario.gestionar
-- =============================================================================
-- Problema detectado: himnos, coros, culto_types y biblia tenían RLS
-- DESACTIVADO: cualquier usuario autenticado podía escribir en los catálogos
-- a través de la API. Se activa RLS con lectura para autenticados y escritura
-- solo para ADMIN o usuarios con el permiso granular `himnario.gestionar`
-- (catálogo de himnos/coros). culto_types y biblia: escritura solo ADMIN.
-- plan_himnos_coros_old es una tabla legada: RLS sin políticas (solo service role).
-- =============================================================================

-- 1. Himnos ────────────────────────────────────────────────────────────────────
ALTER TABLE public.himnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "himnos_select" ON public.himnos;
CREATE POLICY "himnos_select" ON public.himnos
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "himnos_write" ON public.himnos;
CREATE POLICY "himnos_write" ON public.himnos
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.user_can('himnario.gestionar'))
    WITH CHECK (public.is_admin() OR public.user_can('himnario.gestionar'));

-- 2. Coros ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.coros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coros_select" ON public.coros;
CREATE POLICY "coros_select" ON public.coros
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "coros_write" ON public.coros;
CREATE POLICY "coros_write" ON public.coros
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.user_can('himnario.gestionar'))
    WITH CHECK (public.is_admin() OR public.user_can('himnario.gestionar'));

-- 3. Tipos de culto (catálogo global; escritura solo ADMIN) ────────────────────
ALTER TABLE public.culto_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "culto_types_select" ON public.culto_types;
CREATE POLICY "culto_types_select" ON public.culto_types
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "culto_types_write" ON public.culto_types;
CREATE POLICY "culto_types_write" ON public.culto_types
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Biblia (solo lectura para la app) ─────────────────────────────────────────
ALTER TABLE public.biblia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblia_select" ON public.biblia;
CREATE POLICY "biblia_select" ON public.biblia
    FOR SELECT TO authenticated USING (true);

-- 5. Tabla legada: bloquear todo acceso vía API (solo service role) ────────────
ALTER TABLE public.plan_himnos_coros_old ENABLE ROW LEVEL SECURITY;
