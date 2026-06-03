-- ══════════════════════════════════════════
-- Workspace Setup — run this in Supabase SQL Editor
-- Run AFTER setup.sql
-- ══════════════════════════════════════════

-- Workspaces table
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_data text,          -- base64 image for workspace logo
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id) default auth.uid()
);

-- If workspaces table already exists, just add the logo_data column
alter table workspaces add column if not exists logo_data text;

-- User ↔ workspace membership
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member', -- 'admin' or 'member'
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Add workspace_id column to all data tables
alter table sales      add column if not exists workspace_id uuid references workspaces(id);
alter table payments   add column if not exists workspace_id uuid references workspaces(id);
alter table dm_setting add column if not exists workspace_id uuid references workspaces(id);
alter table ads        add column if not exists workspace_id uuid references workspaces(id);
alter table vsl        add column if not exists workspace_id uuid references workspaces(id);

-- ── RLS ──
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;

-- Workspace: see if member, create if owner
create policy "see member workspaces" on workspaces for select using (
  id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "create workspace" on workspaces for insert with check (auth.uid() = owner_id);
create policy "owner update"     on workspaces for update using (auth.uid() = owner_id);
create policy "owner delete"     on workspaces for delete using (auth.uid() = owner_id);

-- Members: see your own, admins see workspace members
create policy "see own membership" on workspace_members for select using (
  user_id = auth.uid() or
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'admin')
);
create policy "admin insert member" on workspace_members for insert with check (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'admin')
);
create policy "admin delete member" on workspace_members for delete using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'admin')
);

-- Drop old user_id-based policies, replace with workspace-based
drop policy if exists "own sales"      on sales;
drop policy if exists "own payments"   on payments;
drop policy if exists "own dm_setting" on dm_setting;
drop policy if exists "own ads"        on ads;
drop policy if exists "own vsl"        on vsl;

create policy "workspace sales" on sales for all using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspace payments" on payments for all using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspace dm_setting" on dm_setting for all using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspace ads" on ads for all using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspace vsl" on vsl for all using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- Helper function to look up user ID by email (used by admin page)
create or replace function get_user_id_by_email(email_input text)
returns uuid
language sql security definer
as $$
  select id from auth.users where email = email_input limit 1;
$$;
