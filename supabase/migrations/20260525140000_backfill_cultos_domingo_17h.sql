-- Backfill de cultos para el domingo a las 17:00:00 a partir del 31 de mayo de 2026
-- Este script inserta registros para todos los domingos que tengan un culto de Enseñanza a las 10:00:00
-- pero que carezcan de un culto correspondiente a las 17:00:00.

INSERT INTO public.cultos (fecha, hora_inicio, tipo_culto_id, estado, es_festivo, es_laborable_festivo)
SELECT 
    fecha, 
    '17:00:00'::time, 
    tipo_culto_id, 
    'planeado', 
    false, 
    false
FROM public.cultos c1
WHERE 
    fecha >= '2026-05-31' 
    AND EXTRACT(DOW FROM fecha) = 0 -- 0 es Domingo
    AND hora_inicio = '10:00:00'
    AND NOT EXISTS (
        SELECT 1 FROM public.cultos c2 
        WHERE c2.fecha = c1.fecha AND c2.hora_inicio = '17:00:00'
    );
