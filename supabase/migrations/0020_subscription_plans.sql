-- Plans, plural.
--
-- subscriptions.plan existed with a default of 'lumen_monthly_inr', from when
-- there was one plan and the column was decoration. It now decides the tier an
-- account is on and the credits it gets every day, so it holds a key from the
-- plan catalogue in src/lib/plans.ts: free, pro_monthly, pro_yearly,
-- premium_monthly, premium_yearly.
--
-- The old default is remapped rather than left alone: a row carrying it was
-- created free, by ensureSubscriptionRow, and reading it as a paid plan would
-- hand somebody a tier nobody paid for.

alter table public.subscriptions alter column plan set default 'free';

update public.subscriptions
   set plan = case
     when status in ('active', 'authenticated', 'charged') then 'pro_monthly'
     else 'free'
   end
 where plan is null or plan = 'lumen_monthly_inr';

create index if not exists subscriptions_plan_idx on public.subscriptions (plan);
