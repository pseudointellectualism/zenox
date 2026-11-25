-- Zenox: run this once in the Supabase SQL editor.
-- Row level security is on for every table, so the public anon key cannot read
-- or write anything it should not.

-- ---------------------------------------------------------------- profiles
create table if not exists public.library (
  user_id     uuid  not null references auth.users on delete cascade,
  media_type  text  not null check (media_type in ('movie','tv')),
  media_id    integer not null,
  kind        text  not null check (kind in ('watchlist','history')),
  title       text,
  poster_path text,
  genre_ids   integer[] default '{}',
  progress    real    default 0,
  position_seconds real default 0,
  duration_seconds real default 0,
  season      integer,
  episode     integer,
  updated_at  timestamptz not null default now(),
  primary key (user_id, kind, media_type, media_id)
);

alter table public.library enable row level security;

-- A signed-in viewer can only ever touch their own rows.
create policy "library is private to its owner"
  on public.library for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------- notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  kind       text not null default 'notice' check (kind in ('changelog','notice','maintenance')),
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Everyone reads notifications; nobody writes them from the client.
-- Post new entries from the Supabase dashboard or with the service role key.
create policy "notifications are world readable"
  on public.notifications for select
  using (true);

-- Sample entry so the bell has something to show.
insert into public.notifications (title, body, kind)
values ('Welcome to Zenox', 'Sign in to sync your list and progress across devices.', 'notice')
on conflict do nothing;

-- ------------------------------------------------------ analytics_sessions
-- Synchronizes live viewers across users and serverless instances in real time.
create table if not exists public.analytics_sessions (
  session_id   text primary key,
  route        text not null default '/',
  title        text,
  device       text not null default 'desktop',
  last_ping    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists idx_analytics_sessions_last_ping 
  on public.analytics_sessions(last_ping);

alter table public.analytics_sessions enable row level security;

-- Allow reading and writing sessions (server uses service role, anon allowed for direct pings)
create policy "analytics_sessions anon select" on public.analytics_sessions for select using (true);
create policy "analytics_sessions anon insert" on public.analytics_sessions for insert with check (true);
create policy "analytics_sessions anon update" on public.analytics_sessions for update using (true);
create policy "analytics_sessions anon delete" on public.analytics_sessions for delete using (true);

-- --------------------------------------------------------- analytics_stats
-- Persists all-time peaks, daily history, and hourly charts so data is never deleted on restarts/deploys.
create table if not exists public.analytics_stats (
  id           text primary key,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.analytics_stats enable row level security;

create policy "analytics_stats world read" on public.analytics_stats for select using (true);
create policy "analytics_stats world write" on public.analytics_stats for all using (true);

-- Seed default global analytics record if not already present
insert into public.analytics_stats (id, data)
values (
  'global_analytics',
  jsonb_build_object(
    'allTimePeak', 0,
    'allTimePeakDate', to_char(now(), 'YYYY-MM-DD'),
    'dailyHistory', '{}'::jsonb,
    'hourlyToday', '{}'::jsonb,
    'hourlyTodayDate', to_char(now(), 'YYYY-MM-DD')
  )
)
on conflict (id) do nothing;

