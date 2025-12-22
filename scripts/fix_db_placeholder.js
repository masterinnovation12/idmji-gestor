const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Faltan credenciales en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const sql = `
-- 1. Asegurar que public.profiles borre en cascada cuando se borra el usuario de Auth
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Asegurar que user_subscriptions borre en cascada (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_subscriptions') THEN
        ALTER TABLE public.user_subscriptions
        DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
        
        ALTER TABLE public.user_subscriptions
        ADD CONSTRAINT user_subscriptions_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Trigger robusto para creación
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellidos, email, rol)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', 'Nuevo'),
    COALESCE(new.raw_user_meta_data->>'apellidos', 'Usuario'),
    new.email,
    'MIEMBRO'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reiniciar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Permisos
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO authenticated;
`

async function runFix() {
    console.log('Iniciando reparación de integridad de base de datos...')
    // Lamentablemente supabase-js no tiene metodo directo para raw SQL en cliente publico
    // Pero si estamos usando service_role podemos intentar trucos o usar Postgres.js si estuviera.
    // Como no tenemos pg driver a mano configurado, usaremos la RPC 'exec_sql' si existe, o tendremos que 
    // confiar en que el usuario corra esto en el SQL Editor de Supabase si falla.

    // INTENTO 1: Usar una función RPC si existe (poca probabilidad si no la creamos antes)
    // INTENTO 2: Instruiremos al usuario o usaremos un workaround. 

    // ALTERNATIVA: Puesto que no puedo ejecutar DDL (ALTER TABLE) desde supabase-js client estándar...
    // Voy a intentar usar el REST API de Postgres si estoy en un entorno que lo permita, pero no.

    // ESPERA: Tengo acceso al servidor MCP, solo falló la conexión. Voy a reintentar la herramienta MCP first.
    console.log('Este script es solo informativo. Por favor, usa la herramienta MCP o el Editor SQL de Supabase.')
}

runFix()
