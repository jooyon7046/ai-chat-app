-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- chat sessions
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 채팅',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc);

alter table public.chat_sessions enable row level security;

create policy "chat_sessions_select_own"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "chat_sessions_insert_own"
  on public.chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "chat_sessions_update_own"
  on public.chat_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "chat_sessions_delete_own"
  on public.chat_sessions for delete
  using (auth.uid() = user_id);

create trigger chat_sessions_set_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

-- mcp servers
create table public.mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  transport text not null check (transport in ('stdio', 'sse', 'http')),
  command text,
  args jsonb not null default '[]'::jsonb,
  env jsonb not null default '{}'::jsonb,
  url text,
  headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mcp_servers_user_updated_idx
  on public.mcp_servers (user_id, updated_at desc);

alter table public.mcp_servers enable row level security;

create policy "mcp_servers_select_own"
  on public.mcp_servers for select
  using (auth.uid() = user_id);

create policy "mcp_servers_insert_own"
  on public.mcp_servers for insert
  with check (auth.uid() = user_id);

create policy "mcp_servers_update_own"
  on public.mcp_servers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mcp_servers_delete_own"
  on public.mcp_servers for delete
  using (auth.uid() = user_id);

create trigger mcp_servers_set_updated_at
  before update on public.mcp_servers
  for each row execute function public.set_updated_at();

-- mcp live sessions
create table public.mcp_live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  server_id uuid not null references public.mcp_servers(id) on delete cascade,
  live_session_id text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, server_id)
);

create index mcp_live_sessions_user_idx
  on public.mcp_live_sessions (user_id);

create index mcp_live_sessions_live_session_idx
  on public.mcp_live_sessions (live_session_id);

alter table public.mcp_live_sessions enable row level security;

create policy "mcp_live_sessions_select_own"
  on public.mcp_live_sessions for select
  using (auth.uid() = user_id);

create policy "mcp_live_sessions_insert_own"
  on public.mcp_live_sessions for insert
  with check (auth.uid() = user_id);

create policy "mcp_live_sessions_update_own"
  on public.mcp_live_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mcp_live_sessions_delete_own"
  on public.mcp_live_sessions for delete
  using (auth.uid() = user_id);

create trigger mcp_live_sessions_set_updated_at
  before update on public.mcp_live_sessions
  for each row execute function public.set_updated_at();

-- user settings
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  local_storage_migrated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (auth.uid() = user_id);
