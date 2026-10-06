-- Briefs written for a feature that does not exist yet.
--
-- 3D Studio is on the Premium plan as a promise. The showcase says so, and it
-- still ends in an input box — because the most useful thing a page about an
-- unbuilt feature can do is collect what people actually want from it. These
-- rows are that: real briefs, in the words of the people who would pay, from
-- before a line of it was written.
--
-- user_id is nullable on purpose. The marketing page is public, and somebody
-- who is not signed in describing exactly what they want is the most valuable
-- row in the table.

create table if not exists public.studio_interest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  email text,
  brief text not null,
  /** Which of the eight kinds they picked, when they picked one. */
  category text,
  created_at timestamptz not null default now()
);

create index if not exists studio_interest_created_idx
  on public.studio_interest (created_at desc);

alter table public.studio_interest enable row level security;

-- Written through the service role, read by admins. Nobody else has any
-- business reading what other people are planning to launch.
drop policy if exists "admins read studio interest" on public.studio_interest;
create policy "admins read studio interest"
  on public.studio_interest for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));
