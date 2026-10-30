-- ============================================================
-- Ecotwist admin: database schema for Supabase
--
-- Run once in the Supabase dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again: everything is "if not exists" / "or replace".
--
-- After running it:
--   1. Authentication → Sign In / Providers → turn OFF "Allow new users to sign up"
--      (staff are invited from the admin panel instead).
--   2. Authentication → Users → "Add user" → create your own login.
--   3. Make yourself the owner (use your email):
--        update public.profiles set role = 'owner' where email = 'you@example.com';
-- ============================================================

-- ── Staff profiles ───────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at  timestamptz not null default now()
);

-- Every new login gets a staff profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for logins created before this script ran
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'));
$$;

-- ── Leads: everything the website forms send ─────────────────
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  type         text not null check (type in ('contact', 'proposal', 'newsletter')),
  status       text not null default 'new'
               check (status in ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')),
  name         text not null default '',
  company      text not null default '',
  email        text not null default '',
  phone        text not null default '',
  message      text not null default '',
  interest     text not null default '',   -- contact form
  occasion     text not null default '',   -- proposal form
  product      text not null default '',
  budget       text not null default '',
  quantity     text not null default '',
  branding     text not null default '',
  source_page  text not null default '',
  submission_id text not null default '',
  data         jsonb not null default '{}'::jsonb,  -- everything the form sent
  assigned_to  uuid references public.profiles (id) on delete set null
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
-- One newsletter signup per email
create unique index if not exists leads_newsletter_email_idx
  on public.leads (lower(email)) where type = 'newsletter';

create table if not exists public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ── Settings (key → value) ───────────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into public.settings (key, value)
values ('lead_alert_emails', '[]'::jsonb)
on conflict (key) do nothing;

-- ── Row level security ───────────────────────────────────────
-- The website never talks to these tables directly: forms go through
-- /api/lead, which uses the service role key on the server.
alter table public.profiles   enable row level security;
alter table public.leads      enable row level security;
alter table public.lead_notes enable row level security;
alter table public.settings   enable row level security;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles
  for select using (public.is_staff());

drop policy if exists "own name" on public.profiles;
create policy "own name" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Only owners and admins can change a role (staff may still edit their own name)
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff work leads" on public.leads;
create policy "staff work leads" on public.leads
  for select using (public.is_staff());

drop policy if exists "staff update leads" on public.leads;
create policy "staff update leads" on public.leads
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff add leads" on public.leads;
create policy "staff add leads" on public.leads
  for insert with check (public.is_staff());

drop policy if exists "admins delete leads" on public.leads;
create policy "admins delete leads" on public.leads
  for delete using (public.is_admin());

drop policy if exists "staff read notes" on public.lead_notes;
create policy "staff read notes" on public.lead_notes
  for select using (public.is_staff());

drop policy if exists "staff add notes" on public.lead_notes;
create policy "staff add notes" on public.lead_notes
  for insert with check (public.is_staff() and author_id = auth.uid());

drop policy if exists "authors delete notes" on public.lead_notes;
create policy "authors delete notes" on public.lead_notes
  for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists "staff read settings" on public.settings;
create policy "staff read settings" on public.settings
  for select using (public.is_staff());

drop policy if exists "admins change settings" on public.settings;
create policy "admins change settings" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
