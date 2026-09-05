-- Lumen — complete database setup.
--
-- Paste this whole file into the Supabase SQL editor and press Run. It is every
-- migration in supabase/migrations/ concatenated in order, with idempotency
-- guards added, so running it twice is safe.
--
-- After it succeeds, reload the app: /setup will show "Tables installed".

-- ==========================================================
-- 0001_init.sql
-- ==========================================================

-- Lumen — initial schema.
-- Row-Level Security is enabled on every user-owned table in this same migration,
-- never retrofitted (spec Section 14).

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------- users ----

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  onboarding_business_type text,
  default_model text,
  voice_storage_enabled boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Mirror auth.users on signup so app code only ever reads public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- projects ----

do $$ begin
  create type public.project_status as enum ('draft', 'generating', 'ready', 'failed');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.generation_input_mode as enum ('prompt', 'screenshot', 'voice', 'template');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.version_source as enum ('initial', 'chat', 'visual_edit', 'screenshot', 'voice', 'template');
exception when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  slug text not null,
  business_type text,
  description text,
  status public.project_status not null default 'draft',
  model text,
  design_system jsonb,
  current_version_id uuid,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects (user_id, created_at desc);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_number integer not null,
  label text,
  source public.version_source not null default 'initial',
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists project_versions_number_idx on public.project_versions (project_id, version_number);

do $$ begin
  alter table public.projects add constraint projects_current_version_fk foreign key (current_version_id) references public.project_versions (id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'queued',
  stage text,
  input_mode public.generation_input_mode not null default 'prompt',
  prompt_text text,
  screenshot_url text,
  model_used text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists generation_jobs_project_idx on public.generation_jobs (project_id, created_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  version_id uuid references public.project_versions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_project_idx on public.chat_messages (project_id, created_at);

-- ------------------------------------------------------------- chatbots ----

create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null default 'Assistant',
  greeting text not null default 'Hi! Ask me anything about us.',
  tone text not null default 'friendly' check (tone in ('friendly', 'professional', 'concise')),
  accent_color text not null default '#111111',
  embed_key text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists chatbots_project_idx on public.chatbots (project_id);

create table if not exists public.chatbot_documents (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  source_type text not null check (source_type in ('site', 'faq', 'connector')),
  title text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.chatbot_documents (id) on delete cascade,
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists chatbot_embeddings_chatbot_idx on public.chatbot_embeddings (chatbot_id);

create table if not exists public.chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  visitor_session_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Cosine-similarity retrieval for the chatbot RAG loop.
create or replace function public.match_chatbot_chunks(
  p_chatbot_id uuid,
  p_embedding vector(1536),
  p_limit integer default 6
)
returns table (chunk_text text, similarity float)
language sql
stable
as $$
  select e.chunk_text, 1 - (e.embedding <=> p_embedding) as similarity
  from public.chatbot_embeddings e
  where e.chatbot_id = p_chatbot_id and e.embedding is not null
  order by e.embedding <=> p_embedding
  limit p_limit;
$$;

-- ------------------------------------------- credentials, usage, billing ----

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null default 'openai',
  encrypted_key text not null,
  last4 text not null,
  is_active boolean not null default true,
  validated_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists api_keys_user_provider_idx on public.api_keys (user_id, provider) where is_active;

create table if not exists public.connectors_account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null,
  encrypted_credentials text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'connected',
  connected_at timestamptz not null default now()
);
create unique index if not exists connectors_account_idx on public.connectors_account (user_id, provider);

create table if not exists public.connectors_project (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'enabled',
  created_at timestamptz not null default now()
);
create unique index if not exists connectors_project_idx on public.connectors_project (project_id, provider);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  event_type text not null,
  model text,
  key_source text not null default 'platform' check (key_source in ('platform', 'byok')),
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_idx on public.usage_events (user_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  razorpay_subscription_id text unique,
  razorpay_customer_id text,
  plan text not null default 'lumen_monthly_inr',
  status text not null default 'created',
  gstin text,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscriptions_user_idx on public.subscriptions (user_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  razorpay_invoice_id text unique,
  razorpay_payment_id text,
  amount_paise integer not null,
  currency text not null default 'INR',
  gstin text,
  pdf_url text,
  status text not null default 'paid',
  issued_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  description text,
  project_id uuid references public.projects (id) on delete set null,
  preview_url text,
  sort_order integer not null default 0,
  is_published boolean not null default true
);

-- Sliding-window rate limiting, Postgres-backed so there is no Redis dependency.
create table if not exists public.rate_limit_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_bucket_idx on public.rate_limit_events (bucket, created_at desc);

create table if not exists public.flagged_content (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  reason text not null,
  detail text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ RLS ----

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chatbots enable row level security;
alter table public.chatbot_documents enable row level security;
alter table public.chatbot_embeddings enable row level security;
alter table public.chatbot_conversations enable row level security;
alter table public.chatbot_messages enable row level security;
alter table public.api_keys enable row level security;
alter table public.connectors_account enable row level security;
alter table public.connectors_project enable row level security;
alter table public.usage_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.templates enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.flagged_content enable row level security;

drop policy if exists "users read self" on public.users;
create policy "users read self"
  on public.users
  for select using (auth.uid() = id);
drop policy if exists "users update self" on public.users;
create policy "users update self"
  on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "projects owner all" on public.projects;
create policy "projects owner all"
  on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "projects public templates readable" on public.projects;
create policy "projects public templates readable"
  on public.projects
  for select using (is_template);

drop policy if exists "versions via project" on public.project_versions;
create policy "versions via project"
  on public.project_versions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "jobs owner all" on public.generation_jobs;
create policy "jobs owner all"
  on public.generation_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat via project" on public.chat_messages;
create policy "chat via project"
  on public.chat_messages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "chatbots via project" on public.chatbots;
create policy "chatbots via project"
  on public.chatbots
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "chatbot docs via chatbot" on public.chatbot_documents;
create policy "chatbot docs via chatbot"
  on public.chatbot_documents
  for all using (
    exists (
      select 1 from public.chatbots c
      join public.projects p on p.id = c.project_id
      where c.id = chatbot_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.chatbots c
      join public.projects p on p.id = c.project_id
      where c.id = chatbot_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "chatbot embeddings via chatbot" on public.chatbot_embeddings;
create policy "chatbot embeddings via chatbot"
  on public.chatbot_embeddings
  for all using (
    exists (
      select 1 from public.chatbots c
      join public.projects p on p.id = c.project_id
      where c.id = chatbot_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.chatbots c
      join public.projects p on p.id = c.project_id
      where c.id = chatbot_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "chatbot conversations via chatbot" on public.chatbot_conversations;
create policy "chatbot conversations via chatbot"
  on public.chatbot_conversations
  for select using (
    exists (
      select 1 from public.chatbots c
      join public.projects p on p.id = c.project_id
      where c.id = chatbot_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "chatbot messages via conversation" on public.chatbot_messages;
create policy "chatbot messages via conversation"
  on public.chatbot_messages
  for select using (
    exists (
      select 1 from public.chatbot_conversations cv
      join public.chatbots c on c.id = cv.chatbot_id
      join public.projects p on p.id = c.project_id
      where cv.id = conversation_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "api keys owner all" on public.api_keys;
create policy "api keys owner all"
  on public.api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "account connectors owner all" on public.connectors_account;
create policy "account connectors owner all"
  on public.connectors_account
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "project connectors via project" on public.connectors_project;
create policy "project connectors via project"
  on public.connectors_project
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "usage owner read" on public.usage_events;
create policy "usage owner read"
  on public.usage_events
  for select using (auth.uid() = user_id);

drop policy if exists "subscription owner read" on public.subscriptions;
create policy "subscription owner read"
  on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "invoices via subscription" on public.invoices;
create policy "invoices via subscription"
  on public.invoices
  for select using (
    exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
  );

drop policy if exists "templates public read" on public.templates;
create policy "templates public read"
  on public.templates
  for select using (is_published);

-- rate_limit_events and flagged_content are written only by the service role,
-- which bypasses RLS; no policy is granted to end users on purpose.

-- ==========================================================
-- 0002_storage.sql
-- ==========================================================

-- Storage for the blob-shaped things: uploaded reference screenshots and any
-- images a user swaps into a generated site. Generated *code* lives in
-- project_versions.files so a version is written as a single transactional row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Objects are namespaced by project id; owners write, everyone reads (generated
-- sites are public by nature and reference these URLs directly).
drop policy if exists "project assets are publicly readable" on storage.objects;
create policy "project assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-assets');

drop policy if exists "owners upload project assets" on storage.objects;
create policy "owners upload project assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.projects p
      where p.user_id = auth.uid()
        and p.id::text = split_part(name, '/', 1)
    )
  );

drop policy if exists "owners delete project assets" on storage.objects;
create policy "owners delete project assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.projects p
      where p.user_id = auth.uid()
        and p.id::text = split_part(name, '/', 1)
    )
  );

-- ==========================================================
-- 0003_admin_and_trial.sql
-- ==========================================================

-- Grants the founding admin and shortens the free trial to one day.
--
-- Safe to re-run: every statement is idempotent.

-- ------------------------------------------------------------ admin ----

-- The account that owns this deployment. LUMEN_ADMIN_EMAILS does the same job
-- at runtime for a fresh signup; this covers a row that already exists.
update public.users
set is_admin = true
where lower(email) = 'socialsprouts1@gmail.com';

-- Admins read the whole user table from the admin panel. The panel itself
-- goes through the service role, but this keeps the policy honest for anything
-- that queries as the signed-in user.
drop policy if exists "admins read all users" on public.users;
create policy "admins read all users"
  on public.users
  for select using (
    exists (select 1 from public.users me where me.id = auth.uid() and me.is_admin)
  );

-- ------------------------------------------------------------ trial ----

-- New signups get one day; see TRIAL_DAYS in src/lib/razorpay.ts.
-- Existing trials are clamped to one day from when they started, so the policy
-- applies to everyone rather than only to accounts created from now on.
update public.subscriptions
set current_period_end = created_at + interval '1 day'
where status = 'trialing'
  and current_period_end > created_at + interval '1 day';

-- ==========================================================
-- 0004_freemium.sql
-- ==========================================================

-- Freemium: the free tier is permanent rather than a trial that expires.
--
-- Accounts previously on a countdown move to 'free' with no end date. Paid
-- subscriptions are untouched — only the ceiling differs between the two, and
-- neither one gates access to the product.

update public.subscriptions
set status = 'free',
    current_period_end = null,
    updated_at = now()
where status in ('trialing', 'expired')
  and razorpay_subscription_id is null;

-- ==========================================================
-- 0005_backfill_profiles.sql
-- ==========================================================

-- Backfill profile rows for accounts that registered before the trigger existed.
--
-- handle_new_user mirrors auth.users into public.users on insert, so it only
-- covers signups after it was installed. Six tables carry a foreign key to
-- public.users, which means an account without a profile row cannot create
-- anything at all. Safe to re-run.

insert into public.users (id, email, full_name, avatar_url, created_at)
select
  au.id,
  coalesce(au.email, ''),
  au.raw_user_meta_data ->> 'full_name',
  au.raw_user_meta_data ->> 'avatar_url',
  coalesce(au.created_at, now())
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- Anyone listed as a bootstrap admin keeps that flag after the backfill.
update public.users
set is_admin = true
where lower(email) = 'socialsprouts1@gmail.com';
