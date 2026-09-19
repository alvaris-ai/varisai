-- Opaque, revocable application sessions. Only SHA-256 token digests are stored.
create table public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index auth_sessions_user_idx on public.auth_sessions(user_id);
create index auth_sessions_active_idx on public.auth_sessions(token_hash, expires_at) where revoked_at is null;
alter table public.auth_sessions enable row level security;
create policy auth_sessions_owner_read on public.auth_sessions for select using (user_id = auth.uid());

