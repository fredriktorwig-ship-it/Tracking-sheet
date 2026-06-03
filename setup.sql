-- ══════════════════════════════════════════
-- CRM Database Setup — run this in Supabase SQL Editor
-- ══════════════════════════════════════════

-- SALES (call tracking)
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_name text,
  closer text,
  lead_ig text,
  occupation text,
  date_booked date,
  date_of_call date,
  call_type text,
  call_info text,
  closed text,
  deal_size numeric default 0,
  cash_on_call numeric default 0,
  payment_type text,
  utm_source text,
  notes text,
  user_id uuid references auth.users(id) default auth.uid()
);

-- PAYMENTS
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date,
  customer_name text,
  amount numeric default 0,
  type text,
  payment_type text,
  setter text,
  closer text,
  notes text,
  user_id uuid references auth.users(id) default auth.uid()
);

-- DM SETTING
create table if not exists dm_setting (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date,
  setter text,
  outbounds int default 0,
  inbounds int default 0,
  follow_ups_first int default 0,
  follow_ups_convo int default 0,
  replies int default 0,
  qualified_convos int default 0,
  pitched_calls int default 0,
  booking_links_sent int default 0,
  qualified_bookings int default 0,
  dq_bookings int default 0,
  notes text,
  user_id uuid references auth.users(id) default auth.uid()
);

-- ADS
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date,
  campaign_name text,
  ad_spend numeric default 0,
  profile_visits int default 0,
  total_followers int default 0,
  qualified_followers int default 0,
  inbounds int default 0,
  outbounds int default 0,
  replies int default 0,
  qualified_convos int default 0,
  pitched_calls int default 0,
  booking_links_sent int default 0,
  booked_calls int default 0,
  notes text,
  user_id uuid references auth.users(id) default auth.uid()
);

-- VSL
create table if not exists vsl (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date,
  campaign text,
  unique_visitors int default 0,
  opt_ins int default 0,
  calls_booked int default 0,
  notes text,
  user_id uuid references auth.users(id) default auth.uid()
);

-- ══════════════════════════════════════════
-- Row Level Security (users only see their own data)
-- ══════════════════════════════════════════
alter table sales      enable row level security;
alter table payments   enable row level security;
alter table dm_setting enable row level security;
alter table ads        enable row level security;
alter table vsl        enable row level security;

-- Policies
create policy "own sales"      on sales      for all using (auth.uid() = user_id);
create policy "own payments"   on payments   for all using (auth.uid() = user_id);
create policy "own dm_setting" on dm_setting for all using (auth.uid() = user_id);
create policy "own ads"        on ads        for all using (auth.uid() = user_id);
create policy "own vsl"        on vsl        for all using (auth.uid() = user_id);
