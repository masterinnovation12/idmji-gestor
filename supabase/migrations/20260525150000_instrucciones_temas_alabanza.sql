-- Separa los 6 temas de alabanza del rol "introduccion" → nuevo rol "temas_alabanza".
-- Introducción y finalización de Alabanza quedan como placeholders (Próximamente).

ALTER TABLE public.instrucciones_culto
  ADD COLUMN IF NOT EXISTS publicado boolean NOT NULL DEFAULT false;

ALTER TABLE public.instrucciones_culto
  DROP CONSTRAINT IF EXISTS instrucciones_culto_rol_check;

ALTER TABLE public.instrucciones_culto
  ADD CONSTRAINT instrucciones_culto_rol_check
  CHECK (rol IN (
    'introduccion',
    'ensenanza',
    'testimonios',
    'finalizacion',
    'temas_alabanza'
  ));

-- Copiar contenido actual de introducción (Alabanza) → temas_alabanza
INSERT INTO public.instrucciones_culto (
  culto_type_id,
  rol,
  titulo_es,
  titulo_ca,
  contenido_es,
  contenido_ca,
  publicado,
  updated_at
)
SELECT
  ic.culto_type_id,
  'temas_alabanza',
  'Temas para preparar la alabanza',
  'Temes per preparar l''alabança',
  ic.contenido_es,
  ic.contenido_ca,
  true,
  now()
FROM public.instrucciones_culto ic
INNER JOIN public.culto_types ct ON ct.id = ic.culto_type_id
WHERE ct.nombre ILIKE '%Alabanza%'
  AND ic.rol = 'introduccion'
  AND length(trim(ic.contenido_es)) > 0
ON CONFLICT (culto_type_id, rol) DO UPDATE SET
  titulo_es = EXCLUDED.titulo_es,
  titulo_ca = EXCLUDED.titulo_ca,
  contenido_es = EXCLUDED.contenido_es,
  contenido_ca = EXCLUDED.contenido_ca,
  publicado = EXCLUDED.publicado,
  updated_at = EXCLUDED.updated_at;

-- Introducción Alabanza: vacía, no publicada (Próximamente en la UI)
UPDATE public.instrucciones_culto ic
SET
  titulo_es = 'Introducción — Culto de Alabanza',
  titulo_ca = 'Introducció — Culte d''Alabança',
  contenido_es = '',
  contenido_ca = '',
  publicado = false,
  updated_at = now()
FROM public.culto_types ct
WHERE ic.culto_type_id = ct.id
  AND ct.nombre ILIKE '%Alabanza%'
  AND ic.rol = 'introduccion';

-- Finalización Alabanza: placeholder Próximamente si no existe
INSERT INTO public.instrucciones_culto (
  culto_type_id,
  rol,
  titulo_es,
  titulo_ca,
  contenido_es,
  contenido_ca,
  publicado,
  updated_at
)
SELECT
  ct.id,
  'finalizacion',
  'Finalización — Culto de Alabanza',
  'Finalització — Culte d''Alabança',
  '',
  '',
  false,
  now()
FROM public.culto_types ct
WHERE ct.nombre ILIKE '%Alabanza%'
ON CONFLICT (culto_type_id, rol) DO NOTHING;
