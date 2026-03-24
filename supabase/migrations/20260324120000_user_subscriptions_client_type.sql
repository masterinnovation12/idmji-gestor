-- Origen de la suscripción push: navegador (pestaña) vs PWA (standalone).
-- Filas existentes quedan como 'browser' (DEFAULT).

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'browser'
  CHECK (client_type IN ('browser', 'pwa'));

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_client
  ON user_subscriptions (user_id, client_type);
