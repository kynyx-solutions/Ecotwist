-- ============================================================
-- Ecotwist admin, part 4: blog articles, message templates,
-- and a log of every email / WhatsApp sent to clients.
--
-- Run once in Supabase → SQL Editor → New query → paste → Run
-- (after the earlier scripts). Safe to run again.
-- ============================================================

-- ── Blog ─────────────────────────────────────────────────────
create table if not exists public.posts (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            text not null,
  excerpt          text not null default '',
  body             text not null default '',          -- Markdown
  cover_image      text not null default '',          -- public URL
  cover_alt        text not null default '',
  tags             text[] not null default '{}',
  status           text not null default 'draft' check (status in ('draft', 'published')),
  published_at     timestamptz,                       -- a future date = scheduled
  seo_title        text not null default '',
  seo_description  text not null default '',
  author_id        uuid references public.profiles (id) on delete set null,
  author_name      text not null default ''           -- shown on the site
);

create index if not exists posts_published_idx on public.posts (published_at desc) where status = 'published';

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;

-- The website reads published articles whose date has come
drop policy if exists "public reads published posts" on public.posts;
create policy "public reads published posts" on public.posts
  for select using (status = 'published' and published_at <= now());

drop policy if exists "staff read posts" on public.posts;
create policy "staff read posts" on public.posts for select using (public.is_staff());
drop policy if exists "staff write posts" on public.posts;
create policy "staff write posts" on public.posts for insert with check (public.is_staff());
drop policy if exists "staff update posts" on public.posts;
create policy "staff update posts" on public.posts for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admins delete posts" on public.posts;
create policy "admins delete posts" on public.posts for delete using (public.is_admin());

-- Photos for articles: public bucket, only staff can upload
insert into storage.buckets (id, name, public)
values ('blog', 'blog', true)
on conflict (id) do nothing;

drop policy if exists "staff upload blog images" on storage.objects;
create policy "staff upload blog images" on storage.objects
  for insert with check (bucket_id = 'blog' and public.is_staff());
drop policy if exists "staff change blog images" on storage.objects;
create policy "staff change blog images" on storage.objects
  for update using (bucket_id = 'blog' and public.is_staff());
drop policy if exists "staff delete blog images" on storage.objects;
create policy "staff delete blog images" on storage.objects
  for delete using (bucket_id = 'blog' and public.is_staff());

-- ── Message templates ────────────────────────────────────────
-- Placeholders: {{name}} {{first_name}} {{company}} {{occasion}} {{order_number}}
--               {{items}} {{total}} {{advance}} {{balance}} {{delivery_date}} {{sender_name}}
create table if not exists public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null,
  category    text not null default 'other' check (category in ('proposal', 'follow_up', 'wishes', 'thank_you', 'payment', 'other')),
  subject     text not null default '',   -- email only
  body        text not null,              -- plain text; used for both email and WhatsApp
  sort_order  int not null default 0
);

drop trigger if exists message_templates_touch on public.message_templates;
create trigger message_templates_touch before update on public.message_templates
  for each row execute function public.touch_updated_at();

alter table public.message_templates enable row level security;
drop policy if exists "staff read templates" on public.message_templates;
create policy "staff read templates" on public.message_templates for select using (public.is_staff());
drop policy if exists "admins manage templates" on public.message_templates;
create policy "admins manage templates" on public.message_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- Starter templates (only when the table is empty)
insert into public.message_templates (name, category, subject, body, sort_order)
select * from (values
  ('Proposal', 'proposal', 'Your gifting proposal from Ecotwist · {{order_number}}',
   E'Hi {{first_name}},\n\nThank you for considering Ecotwist for {{occasion}}. Here is our proposal:\n\n{{items}}\n\nTotal (incl. GST): {{total}}\nDelivery by: {{delivery_date}}\n\nHappy to adjust quantities, budget or branding. Just reply to this message.\n\nWarm regards,\n{{sender_name}}\nEcotwist', 10),
  ('Follow-up', 'follow_up', 'Following up on your gifting enquiry',
   E'Hi {{first_name}},\n\nJust checking in on your gifting plans for {{occasion}}. Would you like us to share a few options or samples?\n\nWarm regards,\n{{sender_name}}\nEcotwist', 20),
  ('Proposal follow-up', 'follow_up', 'Any thoughts on our proposal? · {{order_number}}',
   E'Hi {{first_name}},\n\nI wanted to follow up on the proposal we sent ({{order_number}}, {{total}}). Do let me know if you''d like any changes. We can still deliver on time if we confirm this week.\n\nWarm regards,\n{{sender_name}}\nEcotwist', 30),
  ('Diwali wishes', 'wishes', 'Wishing you a bright and happy Diwali',
   E'Dear {{first_name}},\n\nWishing you and the {{company}} family a very happy and prosperous Diwali. Thank you for being with us this year.\n\nWarm wishes,\n{{sender_name}}\nTeam Ecotwist', 40),
  ('New Year wishes', 'wishes', 'Happy New Year from Ecotwist',
   E'Dear {{first_name}},\n\nWishing you and your team a wonderful New Year. We look forward to celebrating more moments together.\n\nWarm wishes,\n{{sender_name}}\nTeam Ecotwist', 50),
  ('Holi wishes', 'wishes', 'Happy Holi!',
   E'Dear {{first_name}},\n\nWishing you a joyful and colourful Holi!\n\nWarm wishes,\n{{sender_name}}\nTeam Ecotwist', 60),
  ('Thank you after delivery', 'thank_you', 'Thank you for choosing Ecotwist',
   E'Hi {{first_name}},\n\nYour order {{order_number}} has been delivered. Thank you for choosing Ecotwist! We''d love to hear how your team liked the gifts.\n\nWarm regards,\n{{sender_name}}\nEcotwist', 70),
  ('Payment reminder', 'payment', 'Payment reminder · {{order_number}}',
   E'Hi {{first_name}},\n\nA gentle reminder that {{balance}} is due for order {{order_number}} (total {{total}}, received {{advance}}).\n\nThank you,\n{{sender_name}}\nEcotwist', 80)
) as t(name, category, subject, body, sort_order)
where not exists (select 1 from public.message_templates);

-- ── Messages sent ────────────────────────────────────────────
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  channel      text not null check (channel in ('email', 'whatsapp')),
  status       text not null default 'sent' check (status in ('sent', 'opened', 'failed')),
                -- whatsapp "opened" = the chat was opened with the text ready; staff press send
  to_address   text not null,              -- email address or phone number
  subject      text not null default '',
  body         text not null,
  error        text not null default '',
  template_id  uuid references public.message_templates (id) on delete set null,
  lead_id      uuid references public.leads (id) on delete set null,
  customer_id  uuid references public.customers (id) on delete set null,
  order_id     uuid references public.orders (id) on delete set null,
  campaign     text not null default '',   -- e.g. "Diwali wishes 2026" for bulk sends
  sent_by      uuid references public.profiles (id) on delete set null
);

create index if not exists messages_lead_idx on public.messages (lead_id, created_at desc);
create index if not exists messages_customer_idx on public.messages (customer_id, created_at desc);
create index if not exists messages_created_idx on public.messages (created_at desc);

alter table public.messages enable row level security;
drop policy if exists "staff read messages" on public.messages;
create policy "staff read messages" on public.messages for select using (public.is_staff());
drop policy if exists "staff log messages" on public.messages;
create policy "staff log messages" on public.messages for insert with check (public.is_staff());

-- ── Additions: SEO fields on articles, attachments on messages ──
-- Article body is HTML from the rich-text editor (sanitised when shown on the site)
alter table public.posts add column if not exists focus_keyword text not null default '';
alter table public.posts add column if not exists seo_score     int  not null default 0;
alter table public.posts add column if not exists og_image      text not null default '';  -- social share image; cover when empty
alter table public.posts add column if not exists noindex       boolean not null default false;

-- [{ "path": "proposals/…/quote.pdf", "name": "quote.pdf", "type": "application/pdf", "size": 12345 }]
alter table public.messages add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Proposal files (PDF / images) attached to emails and shared as links on WhatsApp.
-- Private: links are signed and expire.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "staff read attachments" on storage.objects;
create policy "staff read attachments" on storage.objects
  for select using (bucket_id = 'attachments' and public.is_staff());
drop policy if exists "staff upload attachments" on storage.objects;
create policy "staff upload attachments" on storage.objects
  for insert with check (bucket_id = 'attachments' and public.is_staff());
drop policy if exists "staff delete attachments" on storage.objects;
create policy "staff delete attachments" on storage.objects
  for delete using (bucket_id = 'attachments' and public.is_staff());
