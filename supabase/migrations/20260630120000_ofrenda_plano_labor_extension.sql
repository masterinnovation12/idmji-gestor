-- =============================================================================
-- LABOR OFRENDA — Turnos, género, prioridad ofrendario (⭐), punteros plano
-- =============================================================================

ALTER TABLE public.ofrenda_plano_personas
    ADD COLUMN IF NOT EXISTS puede_jueves boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS puede_domingo_manana boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS puede_domingo_tarde boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS genero text CHECK (genero IS NULL OR genero IN ('mujer', 'hombre')),
    ADD COLUMN IF NOT EXISTS prioridad_ofrendario boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ofrenda_plano_personas.puede_jueves IS 'Pool labor ofrenda: jueves';
COMMENT ON COLUMN public.ofrenda_plano_personas.puede_domingo_manana IS 'Pool labor ofrenda: domingo mañana';
COMMENT ON COLUMN public.ofrenda_plano_personas.puede_domingo_tarde IS 'Pool labor ofrenda: domingo tarde';
COMMENT ON COLUMN public.ofrenda_plano_personas.genero IS 'Género para reglas de emparejamiento en el plano';
COMMENT ON COLUMN public.ofrenda_plano_personas.prioridad_ofrendario IS 'Prioridad como ofrendario en parejas H+H / M+M';

ALTER TABLE public.ofrenda_planes
    ADD COLUMN IF NOT EXISTS plano_puntero_jueves smallint NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS plano_puntero_domingo_manana smallint NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS plano_puntero_domingo_tarde smallint NOT NULL DEFAULT 1;

-- Capacidad solo apoyo
UPDATE public.ofrenda_plano_personas SET capacidad = 'apoyo'
WHERE nombre_normalizado IN ('maria edilma moreno', 'gleidis amador');

-- Género mujer (clasificación + altas)
UPDATE public.ofrenda_plano_personas SET genero = 'mujer'
WHERE nombre_normalizado IN (
    'maria jose vera', 'alicia montes', 'esperanza sandoval', 'liliana benitez', 'noemy ramirez',
    'eliana moreno', 'lia aranda', 'maria edilma aricapa', 'mayela campos', 'marleny quintero',
    'dayhana sanchez', 'eymy arana', 'nallivi diaz', 'viviana gil', 'edith leonel', 'sandra alcaraz',
    'aroa castiblanco', 'fanny zuniga', 'liliana mompotes', 'solandi sanchez', 'alba angulo',
    'sulmira rosales', 'maria peralta', 'carmen munoz', 'ana vargas', 'andrea murillo',
    'nubia mosquera', 'beatriz anzola', 'yuli henao', 'rosalba gutierrez', 'maria del mar ortiz',
    'alicia escobar', 'lorena arteaga', 'georgina cruz', 'gleidis amador', 'yicely ruiz',
    'maria edilma moreno'
);

UPDATE public.ofrenda_plano_personas SET genero = 'hombre'
WHERE genero IS NULL AND activo = true;

-- Turnos: jueves (Grupo A)
UPDATE public.ofrenda_plano_personas SET
    puede_jueves = true,
    puede_domingo_manana = false,
    puede_domingo_tarde = false
WHERE nombre_normalizado IN (
    'martin a. castaneda', 'eymy arana', 'leo mantilla', 'alicia escobar', 'alba angulo',
    'nubia mosquera', 'leni cabrera', 'beatriz anzola', 'rosalba gutierrez', 'camilo solorzano',
    'edison arenas', 'eliana moreno', 'juan camilo carrillo', 'maria peralta', 'nelson mompotes',
    'maria edilma moreno'
);

-- Turnos: domingo mañana (Grupo B)
UPDATE public.ofrenda_plano_personas SET
    puede_jueves = false,
    puede_domingo_manana = true,
    puede_domingo_tarde = false
WHERE nombre_normalizado IN (
    'aroa castiblanco', 'milton castiblanco', 'fanny zuniga', 'sebastian canal', 'luis collazos',
    'marleny quintero', 'paolo simoes', 'nallivi diaz', 'ramiro zapata', 'oscar biedma',
    'viviana gil', 'edwin castiblanco', 'georgina cruz', 'noemy ramirez', 'carlos galvis',
    'alvaro tangarife', 'mayela campos', 'jorge pichardo', 'edith leonel', 'elkin mendez',
    'gleidis amador'
);

-- Turnos: domingo tarde (Grupo C)
UPDATE public.ofrenda_plano_personas SET
    puede_jueves = false,
    puede_domingo_manana = false,
    puede_domingo_tarde = true
WHERE nombre_normalizado IN (
    'carmen munoz', 'liliana mompotes', 'andrea murillo', 'lorena arteaga', 'yesid payares',
    'nicolas caballero', 'daniel bonilla', 'maria edilma aricapa', 'sulmira rosales',
    'esperanza sandoval', 'sebastian lopez', 'yicely ruiz'
);

-- Pareja Gleidis ↔ Ramiro
INSERT INTO public.ofrenda_plano_parejas (mujer_persona_id, hombre_persona_id)
SELECT m.id, h.id
FROM public.ofrenda_plano_personas m, public.ofrenda_plano_personas h
WHERE m.nombre_normalizado = 'gleidis amador'
  AND h.nombre_normalizado = 'ramiro zapata'
ON CONFLICT DO NOTHING;
