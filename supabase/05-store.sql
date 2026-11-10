-- ============================================================
-- 05 · Online store (/shop)
-- Run once in Supabase → SQL Editor, after 02-customers-orders.sql.
-- Safe to run again.
--
-- Website orders are written by /api/store/order with the service key,
-- so visitors never write to these tables directly. Logos go to a
-- private bucket through one-time signed upload links (/api/store/upload-url);
-- only staff can open them.
-- ============================================================

-- Where an order came from: typed in by staff, or placed on the website store
alter table public.orders add column if not exists source text not null default 'admin';
alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check check (source in ('admin', 'store'));

-- Two new steps for website orders:
--   new          → just placed on the website, nobody has looked at it yet
--   mockup_sent  → branded mockup and payment link sent, waiting for approval
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('new', 'quote', 'mockup_sent', 'confirmed', 'in_production', 'dispatched', 'delivered', 'cancelled'));

-- Contact details as typed at checkout (the customer record may hold older ones)
alter table public.orders add column if not exists contact jsonb not null default '{}'::jsonb;

create index if not exists orders_source_status on public.orders (source, status, created_at desc);

-- Customers are matched by email when a website order comes in
create index if not exists customers_email_lower on public.customers (lower(email));

-- ---------- logo uploads ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-logos', 'order-logos', false, 10485760,
        array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf',
              'application/postscript', 'application/illustrator'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Staff can open and tidy up logos; nobody else can list or read them.
-- (Uploads use signed links made by the server, which need no policy.)
drop policy if exists "staff read order logos" on storage.objects;
create policy "staff read order logos" on storage.objects
  for select using (bucket_id = 'order-logos' and public.is_staff());
drop policy if exists "admins delete order logos" on storage.objects;
create policy "admins delete order logos" on storage.objects
  for delete using (bucket_id = 'order-logos' and public.is_admin());

-- ---------- Razorpay payments ----------
-- payment_link: the latest Razorpay payment link sent for this order (amounts in rupees)
--   { "id": "plink_…", "url": "https://rzp.io/…", "amount": 17675, "status": "created|paid|cancelled", "created_at": "…" }
-- payments: every payment Razorpay confirmed through the webhook (used to skip duplicates)
--   [{ "id": "pay_…", "amount": 17675, "method": "upi", "paid_at": "…", "link_id": "plink_…" }]
alter table public.orders add column if not exists payment_link jsonb;
alter table public.orders add column if not exists payments jsonb not null default '[]'::jsonb;
