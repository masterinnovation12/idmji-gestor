-- 1. Quitar la restricción única que impedía tener más de un culto base por día
ALTER TABLE public.culto_schedules DROP CONSTRAINT IF EXISTS culto_schedules_day_of_week_key;

-- 2. Crear una nueva restricción única compuesta por (day_of_week, default_time)
ALTER TABLE public.culto_schedules ADD CONSTRAINT culto_schedules_day_of_week_time_key UNIQUE (day_of_week, default_time);

-- 3. Insertar el horario base para el culto de Enseñanza de los domingos a las 17:00
-- Asumimos id del tipo de culto de Enseñanza es 6 (según lo verificado en culto_types)
INSERT INTO public.culto_schedules (day_of_week, tipo_culto_id, default_time, affected_by_laborable_festivo)
VALUES (0, 6, '17:00:00', false)
ON CONFLICT (day_of_week, default_time) DO NOTHING;
