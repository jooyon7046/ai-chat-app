-- Shared workspace: all authenticated users (including anonymous) share the same data.

-- chat_sessions
drop policy if exists "chat_sessions_select_own" on public.chat_sessions;
drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
drop policy if exists "chat_sessions_update_own" on public.chat_sessions;
drop policy if exists "chat_sessions_delete_own" on public.chat_sessions;

create policy "chat_sessions_select_shared"
  on public.chat_sessions for select
  to authenticated
  using (true);

create policy "chat_sessions_insert_shared"
  on public.chat_sessions for insert
  to authenticated
  with check (true);

create policy "chat_sessions_update_shared"
  on public.chat_sessions for update
  to authenticated
  using (true)
  with check (true);

create policy "chat_sessions_delete_shared"
  on public.chat_sessions for delete
  to authenticated
  using (true);

-- mcp_servers
drop policy if exists "mcp_servers_select_own" on public.mcp_servers;
drop policy if exists "mcp_servers_insert_own" on public.mcp_servers;
drop policy if exists "mcp_servers_update_own" on public.mcp_servers;
drop policy if exists "mcp_servers_delete_own" on public.mcp_servers;

create policy "mcp_servers_select_shared"
  on public.mcp_servers for select
  to authenticated
  using (true);

create policy "mcp_servers_insert_shared"
  on public.mcp_servers for insert
  to authenticated
  with check (true);

create policy "mcp_servers_update_shared"
  on public.mcp_servers for update
  to authenticated
  using (true)
  with check (true);

create policy "mcp_servers_delete_shared"
  on public.mcp_servers for delete
  to authenticated
  using (true);

-- mcp_live_sessions: one live mapping per server across the workspace
delete from public.mcp_live_sessions a
using public.mcp_live_sessions b
where a.id <> b.id
  and a.server_id = b.server_id
  and a.updated_at <= b.updated_at;

alter table public.mcp_live_sessions
  drop constraint if exists mcp_live_sessions_user_id_server_id_key;

alter table public.mcp_live_sessions
  add constraint mcp_live_sessions_server_id_key unique (server_id);

drop policy if exists "mcp_live_sessions_select_own" on public.mcp_live_sessions;
drop policy if exists "mcp_live_sessions_insert_own" on public.mcp_live_sessions;
drop policy if exists "mcp_live_sessions_update_own" on public.mcp_live_sessions;
drop policy if exists "mcp_live_sessions_delete_own" on public.mcp_live_sessions;

create policy "mcp_live_sessions_select_shared"
  on public.mcp_live_sessions for select
  to authenticated
  using (true);

create policy "mcp_live_sessions_insert_shared"
  on public.mcp_live_sessions for insert
  to authenticated
  with check (true);

create policy "mcp_live_sessions_update_shared"
  on public.mcp_live_sessions for update
  to authenticated
  using (true)
  with check (true);

create policy "mcp_live_sessions_delete_shared"
  on public.mcp_live_sessions for delete
  to authenticated
  using (true);

-- user_settings (migration flag only; still keyed by user_id)
drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "user_settings_delete_own" on public.user_settings;

create policy "user_settings_select_shared"
  on public.user_settings for select
  to authenticated
  using (true);

create policy "user_settings_insert_shared"
  on public.user_settings for insert
  to authenticated
  with check (true);

create policy "user_settings_update_shared"
  on public.user_settings for update
  to authenticated
  using (true)
  with check (true);

create policy "user_settings_delete_shared"
  on public.user_settings for delete
  to authenticated
  using (true);
