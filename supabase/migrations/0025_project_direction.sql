-- The direction a site was built in.
--
-- Stored so the next build for this account can be steered away from it. It
-- is the whole of the "don't give me the same website twice" mechanism, and
-- it lives on the project rather than in a log of its own: the direction is a
-- fact about the site that was made, so a second table could only ever drift
-- out of step with what is actually on the page.
--
-- Nullable, and read defensively. Every project built before this column
-- existed has no direction, which the chooser reads as "nothing to avoid".

alter table public.projects add column if not exists direction jsonb;

create index if not exists projects_direction_idx
  on public.projects (user_id, created_at desc)
  where direction is not null;
