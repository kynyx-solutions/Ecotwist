-- ============================================================
-- 08 · SEO keyword tracker (Admin → SEO → Keywords)
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- The target and trending search phrases Ecotwist wants to rank for, the page
-- each one should rank on, and how it is doing (planned → optimized → ranking,
-- plus the Google position from Search Console).
-- (Only the admin API, with the service key, writes here.)
-- ============================================================

create table if not exists public.keywords (
  id          uuid primary key default gen_random_uuid(),
  term        text not null check (char_length(term) between 2 and 120),
  kind        text not null default 'target' check (kind in ('target', 'trending')),
  intent      text not null default 'commercial' check (intent in ('commercial', 'informational', 'navigational', 'transactional')),
  page        text not null default '',          -- website route, e.g. /occasions/employee-onboarding
  status      text not null default 'planned' check (status in ('planned', 'optimized', 'ranking')),
  position    integer check (position between 1 and 1000),
  notes       text not null default '' check (char_length(notes) <= 1000),
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists keywords_term_ci_idx on public.keywords (lower(term));

create or replace function public.keywords_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists keywords_updated_at on public.keywords;
create trigger keywords_updated_at before update on public.keywords
  for each row execute function public.keywords_touch();

alter table public.keywords enable row level security;
drop policy if exists "staff read keywords" on public.keywords;
create policy "staff read keywords" on public.keywords for select using (public.is_staff());
