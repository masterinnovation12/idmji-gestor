-- Añadir el valor 'SONIDO' al enum user_role
-- Este rol es para el técnico de sonido: puede ver cultos, lecturas, himnario y hermanos
-- pero no puede asignar personas a cultos ni aparece como candidato al púlpito.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SONIDO';
