-- The template a project was built from.
--
-- Sites used to be generated from a prompt alone: the model decided what a
-- dental clinic's home page should contain, and the answer was different every
-- time and rarely complete. A blueprint fixes the structure before the model is
-- asked anything, so this records which one, and every later step — a rebuilt
-- section, a new page, a redesign — works from the same architecture rather
-- than improvising a second one.
--
-- Nullable on purpose: every project that exists today was built without one,
-- and they keep working exactly as they did.

alter table public.projects add column if not exists blueprint_id text;
alter table public.generation_jobs add column if not exists blueprint_id text;

comment on column public.projects.blueprint_id is
  'Template this site was built from, from src/lib/templates. Null for sites generated before templates existed.';
