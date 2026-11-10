-- ============================================================
-- 06 · Store checkout with Razorpay (customers pay on the website)
-- Run once in Supabase → SQL Editor, after 05-store.sql. Safe to run again.
--
-- A website order starts as "awaiting_payment" while the customer is in the
-- Razorpay window, and becomes "confirmed" once the payment is verified
-- (by /api/store/verify-payment, or by the webhook if the browser was closed).
-- 500+ quote requests are saved as "new" and are not paid online.
-- ============================================================

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'new', 'quote', 'mockup_sent', 'confirmed', 'in_production', 'dispatched', 'delivered', 'cancelled'));

-- The Razorpay order this website order is paid through
alter table public.orders add column if not exists razorpay_order_id text;
create unique index if not exists orders_razorpay_order_id on public.orders (razorpay_order_id) where razorpay_order_id is not null;

-- Delivery charge on the order (rupees, already inside total_amount).
-- Website rule (Admin → Store → Products & prices): free above the threshold, otherwise a flat fee.
alter table public.orders add column if not exists delivery_fee numeric(12, 2) not null default 0;
