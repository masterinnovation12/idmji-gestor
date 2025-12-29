-- Migration to add availability column to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.availability IS 'Stores user availability for assignments by day of week and role';
