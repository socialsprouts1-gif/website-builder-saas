-- Backfill profile rows for accounts that registered before the trigger existed.
--
-- handle_new_user mirrors auth.users into public.users on insert, so it only
-- covers signups after it was installed. Six tables carry a foreign key to
-- public.users, which means an account without a profile row cannot create
-- anything at all. Safe to re-run.

insert into public.users (id, email, full_name, avatar_url, created_at)
select
  au.id,
  coalesce(au.email, ''),
  au.raw_user_meta_data ->> 'full_name',
  au.raw_user_meta_data ->> 'avatar_url',
  coalesce(au.created_at, now())
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- Anyone listed as a bootstrap admin keeps that flag after the backfill.
update public.users
set is_admin = true
where lower(email) = 'socialsprouts1@gmail.com';
