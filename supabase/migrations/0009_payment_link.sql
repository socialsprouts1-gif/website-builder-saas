-- Taking money on a generated site, without Lumen touching the money.
--
-- The owner creates a payment link in their own Razorpay, Stripe or UPI app and
-- pastes it here; Lumen puts a button on the site pointing at it. No API keys
-- are stored, no order is created on anyone's behalf, and the customer pays the
-- business directly.

alter table public.projects add column if not exists payment_url text;
alter table public.projects add column if not exists payment_label text;
