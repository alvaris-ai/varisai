-- Migration: 202609190002_google_oauth.sql
-- Add Google OAuth and Profile attributes to public.users table

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_id TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Ensure google_id is unique when not null
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON public.users (google_id) WHERE google_id IS NOT NULL;

-- Index on auth_provider for administrative filtering
CREATE INDEX IF NOT EXISTS users_auth_provider_idx ON public.users (auth_provider);
