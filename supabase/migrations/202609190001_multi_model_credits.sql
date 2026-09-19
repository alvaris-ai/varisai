-- ==========================================================
-- VARIS AI Multi-Model Platform & Credit System Schema
-- ==========================================================

-- 1. AI Providers
create table if not exists public.ai_providers (
    id text primary key,
    name text not null,
    description text,
    status text not null default 'available', -- 'available', 'limited', 'maintenance'
    is_enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. AI Models Registry
create table if not exists public.ai_models (
    id text primary key,
    provider_id text not null references public.ai_providers(id) on delete cascade,
    display_name text not null,
    description text,
    badge text default 'Standard',
    speed text not null default 'Fast', -- 'Lightning', 'Fast', 'Standard'
    reasoning text not null default 'Standard', -- 'Basic', 'Standard', 'Advanced', 'Expert'
    context_window text not null default '128k',
    tier_required text not null default 'free', -- 'free', 'pro', 'ultra'
    credit_cost_per_request integer not null default 5,
    input_token_cost_per_1k numeric not null default 0.1,
    output_token_cost_per_1k numeric not null default 0.2,
    status text not null default 'available', -- 'available', 'limited', 'maintenance'
    is_enabled boolean not null default true,
    is_default boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Subscription Plans
create table if not exists public.subscription_plans (
    id text primary key, -- 'free', 'pro', 'ultra'
    name text not null,
    description text,
    monthly_credits integer not null default 100,
    daily_credit_limit integer not null default 50,
    rate_limit_rpm integer not null default 10,
    can_use_comparison boolean not null default false,
    allowed_tiers jsonb not null default '["free"]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. User Subscriptions
create table if not exists public.user_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    plan_id text not null references public.subscription_plans(id),
    current_period_start timestamptz not null default now(),
    current_period_end timestamptz not null default (now() + interval '30 days'),
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id)
);

-- 5. User Credits
create table if not exists public.user_credits (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    balance integer not null default 100,
    allocated_monthly integer not null default 100,
    reserved integer not null default 0,
    last_reset_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id)
);

-- 6. Credit Transactions Audit Log
create table if not exists public.credit_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    conversation_id uuid references public.conversations(id) on delete set null,
    message_id uuid references public.messages(id) on delete set null,
    model_id text not null,
    provider text not null,
    type text not null default 'deduct', -- 'deduct', 'reserve', 'refund', 'monthly_grant', 'topup'
    credits integer not null,
    balance_after integer not null,
    input_tokens integer not null default 0,
    output_tokens integer not null default 0,
    details jsonb,
    created_at timestamptz not null default now()
);

-- 7. Usage Logs
create table if not exists public.usage_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    model_id text not null,
    provider text not null,
    credits_used integer not null,
    input_tokens integer default 0,
    output_tokens integer default 0,
    tools_used jsonb default '[]'::jsonb,
    duration_ms integer default 0,
    created_at timestamptz not null default now()
);

-- Indexes for fast lookup
create index if not exists idx_ai_models_provider on public.ai_models(provider_id);
create index if not exists idx_ai_models_tier on public.ai_models(tier_required);
create index if not exists idx_credit_transactions_user on public.credit_transactions(user_id, created_at desc);
create index if not exists idx_usage_logs_user on public.usage_logs(user_id, created_at desc);

-- Seed Initial Default Data
insert into public.ai_providers (id, name, description, status, is_enabled) values
('google', 'Google Gemini', 'State-of-the-art multimodal AI by Google DeepMind with massive context window.', 'available', true),
('openai', 'OpenAI ChatGPT', 'Industry-leading LLMs and reasoning models by OpenAI.', 'available', true),
('groq', 'Groq LPU', 'Ultra low-latency accelerated open models.', 'available', true),
('system', 'VARIS Smart Engine', 'High-speed resilient local fallback engine.', 'available', true)
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.subscription_plans (id, name, description, monthly_credits, daily_credit_limit, rate_limit_rpm, can_use_comparison, allowed_tiers) values
('free', 'Free Starter', 'Akses model dasar untuk mencoba kemampuan VARIS.', 100, 50, 10, false, '["free"]'::jsonb),
('pro', 'Pro Developer', 'Akses model profesional untuk coding, reasoning, dan percakapan cerdas.', 5000, 2000, 30, true, '["free", "pro"]'::jsonb),
('ultra', 'Ultra AI Power', 'Akses prioritas penuh ke seluruh model advanced reasoning & multi-model comparison.', 20000, 10000, 60, true, '["free", "pro", "ultra"]'::jsonb)
on conflict (id) do update set name = excluded.name, monthly_credits = excluded.monthly_credits, allowed_tiers = excluded.allowed_tiers;

insert into public.ai_models (id, provider_id, display_name, description, badge, speed, reasoning, context_window, tier_required, credit_cost_per_request, status, is_enabled, is_default, sort_order) values
('auto', 'system', 'VARIS Auto Router', 'Otomatis memilih model tercepat dan paling cerdas sesuai tingkat kesulitan pertanyaan.', 'Smart', 'Lightning', 'Expert', '1M tokens', 'free', 3, 'available', true, true, 0),
('gemini-2.0-flash', 'google', 'Gemini 2.0 Flash', 'Model generasi terbaru Google dengan kecepatan ultra-tinggi dan penalaran tajam.', 'Speed', 'Lightning', 'Advanced', '1M tokens', 'free', 3, 'available', true, false, 1),
('gemini-1.5-pro', 'google', 'Gemini 1.5 Pro', 'Model reasoning mendalam Google untuk pemecahan masalah kompleks dan analisis dokumen.', 'Deep Think', 'Standard', 'Expert', '2M tokens', 'pro', 12, 'available', true, false, 2),
('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'Model efisien dan cerdas dari OpenAI untuk percakapan lisan dan coding cepat.', 'Fast', 'Fast', 'Advanced', '128k tokens', 'free', 4, 'available', true, false, 3),
('gpt-4o', 'openai', 'GPT-4o Omnimodel', 'Model unggulan flagship OpenAI dengan kapabilitas analitis dan coding kelas dunia.', 'Flagship', 'Fast', 'Expert', '128k tokens', 'pro', 15, 'available', true, false, 4),
('o3-mini', 'openai', 'o3-mini Reasoning', 'Model penalaran bertahap (reasoning/thinking) khusus untuk logika matematika dan arsitektur kode.', 'Reasoning', 'Standard', 'Expert', '200k tokens', 'ultra', 25, 'available', true, false, 5),
('llama-3.3-70b', 'groq', 'Llama 3.3 70B', 'Model open-weights performa tinggi dengan inferensi kilat di infrastruktur Groq LPU.', 'Groq Speed', 'Lightning', 'Advanced', '128k tokens', 'pro', 5, 'available', true, false, 6)
on conflict (id) do update set display_name = excluded.display_name, credit_cost_per_request = excluded.credit_cost_per_request, tier_required = excluded.tier_required;
