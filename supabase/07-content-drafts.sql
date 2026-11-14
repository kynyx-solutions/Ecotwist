-- ============================================================
-- 07 · Website drafts and one-click publishing
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Saving a page, the SEO settings or the store prices in the admin now keeps
-- the change here as a draft, and new photos wait in the "content-drafts"
-- bucket. Nothing reaches GitHub or the live site until someone presses
-- "Publish changes": then every draft goes to GitHub in one commit and
-- Vercel deploys the site once.
-- (Only the admin API, with the service key, reads and writes these.)
-- ============================================================

create table if not exists public.content_drafts (
  path         text primary key,                 -- repo path, e.g. src/content/pages/home.json
  kind         text not null default 'json' check (kind in ('json', 'file')),
  label        text,                             -- what the admin calls it ("Home page", "hero.webp")
  content      jsonb,                            -- the edited file (kind = json)
  base_sha     text,                             -- version on GitHub when the draft started (spots clashes)
  updated_by   text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.content_publishes (
  id            bigint generated always as identity primary key,
  commit_sha    text not null,
  commit_url    text,
  files         jsonb not null default '[]',      -- [{ path, label }]
  published_by  text,
  created_at    timestamptz not null default now()
);

alter table public.content_drafts enable row level security;
alter table public.content_publishes enable row level security;

drop policy if exists "staff read drafts" on public.content_drafts;
create policy "staff read drafts" on public.content_drafts for select using (public.is_staff());
drop policy if exists "staff read publishes" on public.content_publishes;
create policy "staff read publishes" on public.content_publishes for select using (public.is_staff());

-- New photos wait here until they're published. Public so the admin can preview
-- them; the files are going on the public website anyway.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-drafts', 'content-drafts', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
