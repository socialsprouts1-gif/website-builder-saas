-- A deleted project, recoverable.
--
-- Deleting was permanent and immediate: one click, one confirm, and every
-- version, every page and every order attached to it was gone. That is a
-- destructive default for the only copy of somebody's website.
--
-- The column is nullable and every existing project has it null, so nothing
-- changes for anything already there.

alter table public.projects add column if not exists deleted_at timestamptz;

-- The listing and the trash both filter on it, per owner.
create index if not exists projects_user_deleted_idx
  on public.projects (user_id, deleted_at);

comment on column public.projects.deleted_at is
  'In the trash since. A trashed project is hidden from the list and stops serving its published site, but nothing is destroyed until it is emptied.';
