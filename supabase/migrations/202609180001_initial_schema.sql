-- VARIS initial relational data layer.
-- Passwords are never stored in plaintext. When local password auth is used,
-- password_hash must contain an Argon2id or scrypt hash. With Supabase Auth, this column
-- remains NULL because Supabase owns the credential hash in auth.users.

create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.message_role as enum ('system', 'user', 'assistant', 'tool');
create type public.record_status as enum ('active', 'inactive', 'pending', 'revoked', 'deleted');
create type public.run_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_normalized check (email = lower(trim(email))),
  constraint users_password_hash_format check (
    password_hash is null or password_hash ~ '^\$(argon2id|scrypt)\$'
  )
);

create unique index users_email_unique on public.users (lower(email));

create table public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (length(trim(provider)) between 1 and 80),
  provider_voice_id text not null check (length(trim(provider_voice_id)) between 1 and 255),
  name text not null check (length(trim(name)) between 1 and 120),
  status public.record_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_voice_id)
);

create index voice_profiles_user_id_idx on public.voice_profiles(user_id);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  voice_profile_id uuid references public.voice_profiles(id) on delete set null,
  speaking_speed numeric(4,2) not null default 1.00 check (speaking_speed between 0.50 and 2.00),
  voice_style jsonb not null default '{}'::jsonb,
  language varchar(16) not null default 'id-ID',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_preferences_voice_profile_idx on public.user_preferences(voice_profile_id);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  system_prompt text not null default '',
  model_id text not null default 'gpt-5.6-terra',
  prompt_version integer not null default 1 check (prompt_version > 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index agents_user_id_idx on public.agents(user_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  title text not null default 'New conversation' check (length(trim(title)) between 1 and 200),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index conversations_agent_id_idx on public.conversations(agent_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.message_role not null,
  content text not null check (length(content) <= 200000),
  content_json jsonb,
  sequence_no bigint generated always as identity,
  created_at timestamptz not null default now(),
  unique (conversation_id, sequence_no)
);

create index messages_conversation_created_idx on public.messages(conversation_id, created_at, id);
create index messages_user_id_idx on public.messages(user_id);

create table public.agent_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '^[a-z][a-z0-9_.-]{1,127}$'),
  description text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

create table public.agent_tool_bindings (
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_tool_id uuid not null references public.agent_tools(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (agent_id, agent_tool_id)
);

create index agent_tool_bindings_tool_idx on public.agent_tool_bindings(agent_tool_id);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  model_id text not null,
  prompt_version integer not null default 1,
  status public.run_status not null default 'queued',
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index agent_runs_conversation_created_idx on public.agent_runs(conversation_id, created_at desc);
create index agent_runs_user_status_idx on public.agent_runs(user_id, status);

create table public.run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  sequence_no integer not null check (sequence_no >= 0),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, sequence_no)
);

create index run_events_run_created_idx on public.run_events(run_id, created_at, sequence_no);

create table public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  agent_tool_id uuid references public.agent_tools(id) on delete set null,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb,
  status public.run_status not null default 'queued',
  approval_required boolean not null default false,
  approved_at timestamptz,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index tool_calls_run_created_idx on public.tool_calls(run_id, created_at);

create table public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scope text not null default 'user',
  kind text not null default 'fact',
  text text not null check (length(trim(text)) between 1 and 10000),
  embedding vector(1536),
  source_message_id uuid references public.messages(id) on delete set null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  sensitivity text not null default 'normal' check (sensitivity in ('normal', 'sensitive', 'restricted')),
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memory_items_user_active_idx on public.memory_items(user_id, created_at desc) where deleted_at is null;
create index memory_items_embedding_hnsw_idx on public.memory_items using hnsw (embedding vector_cosine_ops) where deleted_at is null;

create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  provider text not null,
  model text not null,
  input_units integer not null default 0 check (input_units >= 0),
  output_units integer not null default 0 check (output_units >= 0),
  audio_seconds numeric(12,3) not null default 0 check (audio_seconds >= 0),
  cost_estimate numeric(14,6) check (cost_estimate is null or cost_estimate >= 0),
  created_at timestamptz not null default now()
);

create index usage_records_user_created_idx on public.usage_records(user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  actor text not null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger voice_profiles_set_updated_at before update on public.voice_profiles for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger agents_set_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger memory_items_set_updated_at before update on public.memory_items for each row execute function public.set_updated_at();

-- Keep message ownership consistent with the conversation owner.
create or replace function public.assert_message_owner()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.conversations c where c.id = new.conversation_id and c.user_id = new.user_id) then
    raise exception 'message user_id must match conversation owner';
  end if;
  return new;
end;
$$;

create trigger messages_owner_check before insert or update on public.messages
for each row execute function public.assert_message_owner();

-- RLS is enabled now so future API exposure cannot accidentally be world-readable.
alter table public.users enable row level security;
alter table public.voice_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.agents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_tools enable row level security;
alter table public.agent_tool_bindings enable row level security;
alter table public.agent_runs enable row level security;
alter table public.run_events enable row level security;
alter table public.tool_calls enable row level security;
alter table public.memory_items enable row level security;
alter table public.usage_records enable row level security;
alter table public.audit_logs enable row level security;

-- These policies are intentionally based on a JWT subject matching users.id.
-- The backend service role bypasses RLS for orchestration writes.
create policy users_self_select on public.users for select using (id = auth.uid());
create policy users_self_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy voice_profiles_owner_all on public.voice_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy preferences_owner_all on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy agents_owner_all on public.agents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversations_owner_all on public.conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_owner_all on public.messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tools_authenticated_read on public.agent_tools for select to authenticated using (enabled = true);
create policy bindings_owner_all on public.agent_tool_bindings for all using (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())) with check (exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid()));
create policy runs_owner_all on public.agent_runs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy events_owner_read on public.run_events for select using (exists (select 1 from public.agent_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy calls_owner_read on public.tool_calls for select using (exists (select 1 from public.agent_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy memory_owner_all on public.memory_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy usage_owner_read on public.usage_records for select using (user_id = auth.uid());
create policy audit_owner_read on public.audit_logs for select using (user_id = auth.uid());
