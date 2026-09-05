-- Remember where a project was deployed, so a domain can be attached to it
-- later without asking the user to find the Vercel project by hand.

alter table public.projects add column if not exists vercel_project_id text;
alter table public.projects add column if not exists vercel_project_name text;
alter table public.projects add column if not exists deploy_url text;
alter table public.projects add column if not exists custom_domain text;
