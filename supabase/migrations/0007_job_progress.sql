-- Generation runs on the server now, detached from whatever tab started it, so
-- progress has to live somewhere a returning browser can read it.

alter table public.generation_jobs
  add column if not exists progress jsonb not null default '{}'::jsonb;

-- The watcher polls this row by id every second or so while a build is live.
create index if not exists generation_jobs_status_idx
  on public.generation_jobs (status)
  where status in ('queued', 'running');
