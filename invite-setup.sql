-- ══════════════════════════════════════════
-- Invite System — run this in Supabase SQL Editor
-- Run AFTER workspace-setup.sql
-- ══════════════════════════════════════════

-- Pending invites table
create table if not exists pending_invites (
  id         uuid primary key default gen_random_uuid(),
  token      uuid default gen_random_uuid() unique,
  workspace_id uuid references workspaces(id) on delete cascade,
  email      text not null,
  role       text default 'member',
  invited_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table pending_invites enable row level security;

-- Workspace owners/admins can create and delete invites
drop policy if exists "admin manage invites" on pending_invites;
create policy "admin manage invites" on pending_invites for all using (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);

-- Anyone can read an invite (token is a UUID secret — hard to guess)
drop policy if exists "read invite by token" on pending_invites;
create policy "read invite by token" on pending_invites for select using (true);

-- Authenticated users can claim (delete) an invite
drop policy if exists "claim invite" on pending_invites;
create policy "claim invite" on pending_invites for delete using (auth.uid() is not null);
