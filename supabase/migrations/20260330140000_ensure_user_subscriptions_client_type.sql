-- Asegura client_type en proyectos donde solo existía la tabla base (sin migración previa).
-- Idempotente: no falla si la columna o el índice ya existen.

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'browser';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_client_type_check'
  ) THEN
    ALTER TABLE user_subscriptions
      ADD CONSTRAINT user_subscriptions_client_type_check
      CHECK (client_type IN ('browser', 'pwa'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_client
  ON user_subscriptions (user_id, client_type);
