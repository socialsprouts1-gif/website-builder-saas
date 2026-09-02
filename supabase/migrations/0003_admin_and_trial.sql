-- Grants the founding admin and shortens the free trial to one day.
--
-- Safe to re-run: every statement is idempotent.

-- ------------------------------------------------------------ admin ----

-- The account that owns this deployment. LUMEN_ADMIN_EMAILS does the same job
-- at runtime for a fresh signup; this covers a row that already exists.
update public.users
set is_admin = true
where lower(email) = 'socialsprouts1@gmail.com';

-- Admins read the whole user table from the admin panel. The panel itself
-- goes through the service role, but this keeps the policy honest for anything
-- that queries as the signed-in user.
create policy "admins read all users" on public.users
  for select using (
    exists (select 1 from public.users me where me.id = auth.uid() and me.is_admin)
  );

-- ------------------------------------------------------------ trial ----

-- New signups get one day; see TRIAL_DAYS in src/lib/razorpay.ts.
-- Existing trials are clamped to one day from when they started, so the policy
-- applies to everyone rather than only to accounts created from now on.
update public.subscriptions
set current_period_end = created_at + interval '1 day'
where status = 'trialing'
  and current_period_end > created_at + interval '1 day';
