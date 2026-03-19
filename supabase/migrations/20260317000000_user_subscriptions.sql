-- Tabla user_subscriptions para notificaciones push
-- Requerida para que funcione Perfil → Notificaciones → Activar

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas idempotentes (por si se re-ejecuta)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role has full access" ON user_subscriptions;

-- Usuarios gestionan solo sus propias suscripciones
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON user_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Service role para enviar notificaciones desde el servidor
CREATE POLICY "Service role has full access" ON user_subscriptions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');
