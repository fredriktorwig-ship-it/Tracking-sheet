-- ══════════════════════════════════════════════════════════════
-- FULL MIGRATION — run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════

-- ── SALES ─────────────────────────────────────────────────────
alter table sales add column if not exists workspace_id       uuid references workspaces(id) on delete cascade;
alter table sales add column if not exists lead_email         text;
alter table sales add column if not exists utm_content        text;
alter table sales add column if not exists financially_qualified text;
alter table sales add column if not exists payment_notes      text;
alter table sales add column if not exists date_payment_2     date;
alter table sales add column if not exists payment_2          numeric default 0;
alter table sales add column if not exists date_payment_3     date;
alter table sales add column if not exists payment_3          numeric default 0;
alter table sales add column if not exists date_payment_4     date;
alter table sales add column if not exists payment_4          numeric default 0;
alter table sales add column if not exists call_recording_link text;

-- Drop old user_id-only policy and replace with workspace policy
drop policy if exists "own sales" on sales;
create policy "workspace sales" on sales for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── PAYMENTS ──────────────────────────────────────────────────
alter table payments add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table payments add column if not exists utm          text;

drop policy if exists "own payments" on payments;
create policy "workspace payments" on payments for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── DM SETTING ────────────────────────────────────────────────
alter table dm_setting add column if not exists workspace_id   uuid references workspaces(id) on delete cascade;
alter table dm_setting add column if not exists setting_type   text;

drop policy if exists "own dm_setting" on dm_setting;
create policy "workspace dm_setting" on dm_setting for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── ADS ───────────────────────────────────────────────────────
alter table ads add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

drop policy if exists "own ads" on ads;
create policy "workspace ads" on ads for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── VSL ───────────────────────────────────────────────────────
alter table vsl add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

drop policy if exists "own vsl" on vsl;
create policy "workspace vsl" on vsl for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── ORGANIC (new table) ───────────────────────────────────────
create table if not exists organic (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  workspace_id uuid references workspaces(id) on delete cascade,
  date         date,
  total_followers int default 0,
  icp_followers   int default 0,
  notes        text
);
alter table organic enable row level security;
drop policy if exists "workspace organic" on organic;
create policy "workspace organic" on organic for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── FU TRACKER (new table) ────────────────────────────────────
create table if not exists fu_tracker (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz default now(),
  workspace_id       uuid references workspaces(id) on delete cascade,
  lead_name          text,
  contact_person     text,
  lead_ig            text,
  lead_pn            text,
  lead_email         text,
  lead_quality       int,
  date_last_contact  date,
  date_next_followup date,
  next_step          text,
  notes              text
);
alter table fu_tracker enable row level security;
drop policy if exists "workspace fu_tracker" on fu_tracker;
create policy "workspace fu_tracker" on fu_tracker for all using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);

-- ── Refresh schema cache ───────────────────────────────────────
notify pgrst, 'reload schema';
