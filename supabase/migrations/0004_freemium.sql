-- Freemium: the free tier is permanent rather than a trial that expires.
--
-- Accounts previously on a countdown move to 'free' with no end date. Paid
-- subscriptions are untouched — only the ceiling differs between the two, and
-- neither one gates access to the product.

update public.subscriptions
set status = 'free',
    current_period_end = null,
    updated_at = now()
where status in ('trialing', 'expired')
  and razorpay_subscription_id is null;
