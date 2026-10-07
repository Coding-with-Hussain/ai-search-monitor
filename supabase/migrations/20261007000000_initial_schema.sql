-- =============================================================================
-- AI Search Visibility Monitor — initial schema
--
-- Conventions
--   * Every table lives in `public` and has Row Level Security enabled.
--   * The Next.js server talks to Postgres directly (DATABASE_URL) and enforces
--     ownership in its data-access layer. RLS is defence-in-depth for anything
--     that reaches the database through the Supabase Data API with a user JWT.
--   * Enumerations are `text` + CHECK constraints so values can evolve with a
--     simple migration (Postgres enums are awkward to change).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  is_admin boolean not null default false,
  onboarding_completed_at timestamptz,
  tour_completed_at timestamptz,
  notification_preferences jsonb not null default jsonb_build_object(
    'weeklyReport', true,
    'scanCompleted', true,
    'scoreChanges', true,
    'visibilityDrops', true,
    'competitorOvertakes', true
  ),
  monitoring_defaults jsonb not null default jsonb_build_object(
    'frequency', 'weekly',
    'queryCount', 20,
    'providers', jsonb_build_array('chatgpt', 'gemini', 'perplexity')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Organizations (future agency workspaces — not yet used by the UI)
-- -----------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index organizations_owner_id_idx on public.organizations (owner_id);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

-- -----------------------------------------------------------------------------
-- Subscriptions (one row per user; Stripe is the source of truth when enabled)
-- -----------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'pro', 'agency')),
  status text not null default 'trialing' check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')
  ),
  billing_interval text check (billing_interval in ('month', 'year')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Projects (a monitored business)
-- -----------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  website text,
  domain text,
  industry text not null,
  business_type text not null default 'local' check (business_type in ('local', 'saas', 'ecommerce', 'services')),
  country text,
  city text,
  description text,
  services text[] not null default '{}',
  aliases text[] not null default '{}',
  providers text[] not null default array['chatgpt', 'gemini', 'perplexity'],
  monitoring_frequency text not null default 'weekly' check (monitoring_frequency in ('daily', 'weekly', 'monthly', 'manual')),
  monitoring_enabled boolean not null default true,
  last_scan_at timestamptz,
  next_scan_at timestamptz,
  latest_scan_id uuid,
  latest_score numeric(5, 2),
  previous_score numeric(5, 2),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);
create index projects_organization_id_idx on public.projects (organization_id);
create index projects_next_scan_at_idx on public.projects (next_scan_at) where monitoring_enabled;
create index projects_created_at_idx on public.projects (created_at);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Ownership check used by RLS policies. SECURITY DEFINER so it can read
-- projects/memberships regardless of the caller's own policies.
create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.user_id = auth.uid()
        or (
          p.organization_id is not null
          and exists (
            select 1 from public.organization_members m
            where m.organization_id = p.organization_id and m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- Competitors
-- -----------------------------------------------------------------------------

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  website text,
  domain text,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index competitors_project_id_idx on public.competitors (project_id);
create unique index competitors_project_name_unique on public.competitors (project_id, lower(name));

-- -----------------------------------------------------------------------------
-- Queries (buyer-intent questions)
-- -----------------------------------------------------------------------------

create table public.queries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  text text not null check (char_length(text) between 5 and 300),
  normalized_text text not null,
  category text not null check (
    category in ('best_of', 'recommendation', 'local', 'comparison', 'product_service', 'problem_based', 'purchase_intent', 'brand_comparison')
  ),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'active' check (status in ('active', 'paused')),
  source text not null default 'generated' check (source in ('generated', 'manual')),
  service text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, normalized_text)
);

create index queries_project_id_idx on public.queries (project_id);
create index queries_project_status_idx on public.queries (project_id, status);
create index queries_created_at_idx on public.queries (created_at);

create trigger queries_updated_at before update on public.queries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Scans (one monitoring run across queries × providers)
-- -----------------------------------------------------------------------------

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  trigger text not null default 'manual' check (trigger in ('manual', 'scheduled', 'onboarding', 'demo', 'seed')),
  mode text not null default 'mock' check (mode in ('live', 'mock')),
  providers text[] not null default '{}',
  query_count integer not null default 0,
  total_items integer not null default 0,
  completed_items integer not null default 0,
  failed_items integer not null default 0,
  current_provider text,
  current_query text,
  score numeric(5, 2),
  metrics jsonb,
  notes text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  heartbeat_at timestamptz,
  finalizing_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index scans_project_id_created_at_idx on public.scans (project_id, created_at desc);
create index scans_status_idx on public.scans (status) where status in ('queued', 'running');
create index scans_created_at_idx on public.scans (created_at);

alter table public.projects
  add constraint projects_latest_scan_id_fkey
  foreign key (latest_scan_id) references public.scans (id) on delete set null;

-- -----------------------------------------------------------------------------
-- AI runs (one provider call for one query within a scan) — raw results
-- -----------------------------------------------------------------------------

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  query_id uuid references public.queries (id) on delete set null,
  provider text not null,
  model text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'unavailable')),
  query_text text not null,
  response_text text,
  citations jsonb not null default '[]'::jsonb,
  raw_response jsonb,
  is_mock boolean not null default false,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6) not null default 0,
  attempts integer not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index ai_runs_scan_id_status_idx on public.ai_runs (scan_id, status);
create index ai_runs_project_id_idx on public.ai_runs (project_id);
create index ai_runs_query_id_idx on public.ai_runs (query_id);
create index ai_runs_provider_idx on public.ai_runs (provider);
create index ai_runs_created_at_idx on public.ai_runs (created_at);

-- -----------------------------------------------------------------------------
-- AI analysis (structured interpretation of one AI run)
-- -----------------------------------------------------------------------------

create table public.ai_analysis (
  id uuid primary key default gen_random_uuid(),
  ai_run_id uuid not null unique references public.ai_runs (id) on delete cascade,
  scan_id uuid not null references public.scans (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  query_id uuid references public.queries (id) on delete set null,
  provider text not null,
  mentioned boolean not null,
  recommended boolean not null,
  position integer check (position is null or position > 0),
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  citation boolean not null default false,
  confidence numeric(4, 3) not null default 0,
  evidence text,
  explanation text,
  competitors jsonb not null default '[]'::jsonb,
  other_businesses jsonb not null default '[]'::jsonb,
  analyzer text not null default 'heuristic' check (analyzer in ('heuristic', 'llm')),
  analyzer_model text,
  score numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index ai_analysis_scan_id_idx on public.ai_analysis (scan_id);
create index ai_analysis_project_id_idx on public.ai_analysis (project_id);
create index ai_analysis_query_id_idx on public.ai_analysis (query_id);
create index ai_analysis_provider_idx on public.ai_analysis (provider);
create index ai_analysis_created_at_idx on public.ai_analysis (created_at);

-- -----------------------------------------------------------------------------
-- Sources (citations returned by providers)
-- -----------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  ai_run_id uuid not null references public.ai_runs (id) on delete cascade,
  scan_id uuid not null references public.scans (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  url text not null,
  domain text not null,
  title text,
  is_own_domain boolean not null default false,
  competitor_id uuid references public.competitors (id) on delete set null,
  created_at timestamptz not null default now()
);

create index sources_scan_id_idx on public.sources (scan_id);
create index sources_project_domain_idx on public.sources (project_id, domain);
create index sources_ai_run_id_idx on public.sources (ai_run_id);

-- -----------------------------------------------------------------------------
-- Recommendations
-- -----------------------------------------------------------------------------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scan_id uuid references public.scans (id) on delete set null,
  key text not null,
  title text not null,
  description text not null,
  reason text not null,
  evidence text,
  action text not null,
  category text not null check (category in ('website', 'content', 'authority', 'local_seo', 'brand', 'reviews', 'citations', 'services')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  impact text not null check (impact in ('low', 'medium', 'high')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
  source text not null default 'rules' check (source in ('rules', 'ai')),
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

create index recommendations_project_status_idx on public.recommendations (project_id, status);

create trigger recommendations_updated_at before update on public.recommendations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Reports (point-in-time snapshots)
-- -----------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scan_id uuid references public.scans (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  title text not null,
  period_start timestamptz,
  period_end timestamptz,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index reports_project_id_idx on public.reports (project_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Usage accounting (plan limits + cost tracking)
-- -----------------------------------------------------------------------------

create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  scan_id uuid references public.scans (id) on delete set null,
  kind text not null check (kind in ('query_run', 'provider_call', 'report_generated', 'query_generation', 'analysis_call')),
  quantity integer not null default 1,
  estimated_cost_usd numeric(12, 6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index usage_records_user_kind_created_idx on public.usage_records (user_id, kind, created_at);
create index usage_records_project_id_idx on public.usage_records (project_id);

-- -----------------------------------------------------------------------------
-- In-app notifications / alerts
-- -----------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  type text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Free (anonymous) visibility checks — lead generation
-- -----------------------------------------------------------------------------

create table public.free_checks (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  business_name text not null,
  website text,
  industry text not null,
  location text,
  mode text not null check (mode in ('live', 'mock')),
  result jsonb not null,
  estimated_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index free_checks_ip_created_idx on public.free_checks (ip_hash, created_at);
create index free_checks_created_at_idx on public.free_checks (created_at);

-- -----------------------------------------------------------------------------
-- Infrastructure tables (server-only)
-- -----------------------------------------------------------------------------

create table public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- New user bootstrap: profile + trial subscription
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'starter', 'trialing', now() + interval '14 days')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.competitors enable row level security;
alter table public.queries enable row level security;
alter table public.scans enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.sources enable row level security;
alter table public.recommendations enable row level security;
alter table public.reports enable row level security;
alter table public.usage_records enable row level security;
alter table public.notifications enable row level security;
alter table public.free_checks enable row level security;
alter table public.rate_limits enable row level security;
alter table public.stripe_events enable row level security;

-- Profiles: a user can read and update only their own profile.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Organizations: members can read.
create policy "organizations_select_member" on public.organizations
  for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id and m.user_id = auth.uid()
    )
  );
create policy "organization_members_select_self" on public.organization_members
  for select to authenticated using (user_id = auth.uid());

-- Subscriptions / usage / notifications: read-only for the owner.
-- Writes happen exclusively on the server (Stripe webhooks, scan pipeline).
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "usage_records_select_own" on public.usage_records
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Projects: owner (or organization member) has full access.
create policy "projects_select" on public.projects
  for select to authenticated using (public.can_access_project(id));
create policy "projects_insert" on public.projects
  for insert to authenticated with check (user_id = auth.uid());
create policy "projects_update" on public.projects
  for update to authenticated using (public.can_access_project(id)) with check (public.can_access_project(id));
create policy "projects_delete" on public.projects
  for delete to authenticated using (user_id = auth.uid());

-- Project-scoped tables: access follows the parent project.
create policy "competitors_all" on public.competitors
  for all to authenticated using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));
create policy "queries_all" on public.queries
  for all to authenticated using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));
create policy "recommendations_all" on public.recommendations
  for all to authenticated using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));

-- Scan output is produced by the server; users may read it.
create policy "scans_select" on public.scans
  for select to authenticated using (public.can_access_project(project_id));
create policy "ai_runs_select" on public.ai_runs
  for select to authenticated using (public.can_access_project(project_id));
create policy "ai_analysis_select" on public.ai_analysis
  for select to authenticated using (public.can_access_project(project_id));
create policy "sources_select" on public.sources
  for select to authenticated using (public.can_access_project(project_id));
create policy "reports_select" on public.reports
  for select to authenticated using (public.can_access_project(project_id));

-- free_checks, rate_limits, stripe_events: no policies => no access via the Data API.

-- The anonymous role never needs table access in this application.
revoke all on all tables in schema public from anon;
