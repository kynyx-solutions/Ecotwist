-- ============================================================
-- Ecotwist admin, part 3: lead pipeline
--   source, city, follow-up date and next action on each lead,
--   and a "Proposal sent" stage.
--
-- Run once in Supabase → SQL Editor → New query → paste → Run
-- (after schema.sql and 02-customers-orders.sql). Safe to run again.
-- ============================================================

alter table public.leads add column if not exists source       text not null default 'website';
alter table public.leads add column if not exists city         text not null default '';
alter table public.leads add column if not exists follow_up_on date;
alter table public.leads add column if not exists next_action  text not null default '';

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('website', 'whatsapp', 'phone', 'email', 'referral', 'instagram', 'linkedin', 'event', 'other'));

-- Stages: New → Contacted → Qualified → Proposal sent → Won / Lost (+ Spam)
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'spam'));

-- Leads typed in by hand (phone, WhatsApp, events) aren't form submissions
alter table public.leads drop constraint if exists leads_type_check;
alter table public.leads add constraint leads_type_check
  check (type in ('contact', 'proposal', 'newsletter', 'manual'));

create index if not exists leads_follow_up_idx on public.leads (follow_up_on) where follow_up_on is not null;
