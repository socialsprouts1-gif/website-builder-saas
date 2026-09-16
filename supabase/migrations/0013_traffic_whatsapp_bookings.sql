-- Three things a small business needs from its website, none of which existed:
-- knowing whether anyone visited, being reachable on WhatsApp, and taking a
-- booking.

-- ---------------------------------------------------------------- traffic --
--
-- Counted server-side, rolled up by day. No cookie, no third-party script, no
-- per-visit row to grow forever — just "how many people, which pages, which
-- day", which is the whole question an owner actually has.

create table if not exists public.site_visits (
  project_id uuid not null references public.projects(id) on delete cascade,
  day date not null,
  path text not null,
  views integer not null default 0,
  primary key (project_id, day, path)
);

-- One row per person per day, identified by a one-way hash that cannot be
-- turned back into an address. Deliberately not a visitor profile: there is
-- nothing here to join across days, sites, or anything else.
create table if not exists public.site_visitors (
  project_id uuid not null references public.projects(id) on delete cascade,
  day date not null,
  visitor_hash text not null,
  primary key (project_id, day, visitor_hash)
);

alter table public.site_visits enable row level security;
alter table public.site_visitors enable row level security;

drop policy if exists "owners read their traffic" on public.site_visits;
create policy "owners read their traffic"
  on public.site_visits for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = site_visits.project_id and p.user_id = auth.uid()));

drop policy if exists "owners read their visitors" on public.site_visitors;
create policy "owners read their visitors"
  on public.site_visitors for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = site_visitors.project_id and p.user_id = auth.uid()));

-- Counting is an increment, which an upsert cannot express, so it is one
-- function called once per page view rather than a read followed by a write.
create or replace function public.record_visit(p_project uuid, p_path text, p_visitor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_visits (project_id, day, path, views)
  values (p_project, current_date, p_path, 1)
  on conflict (project_id, day, path)
  do update set views = public.site_visits.views + 1;

  insert into public.site_visitors (project_id, day, visitor_hash)
  values (p_project, current_date, p_visitor)
  on conflict do nothing;
end;
$$;

-- ------------------------------------------------- whatsapp and bookings --

alter table public.projects add column if not exists whatsapp_number text;
alter table public.projects add column if not exists whatsapp_message text;
-- When on, the enquiry form hands the message to WhatsApp instead of only
-- filing it. No API and no approval needed: the customer sends it themselves,
-- which is how a shop in Akola already works.
alter table public.projects add column if not exists whatsapp_leads boolean not null default false;

alter table public.projects add column if not exists booking_enabled boolean not null default false;
alter table public.projects add column if not exists booking_services text[] not null default '{}';
alter table public.projects add column if not exists booking_note text;

-- A booking is an enquiry with a date on it, not a separate inbox: the owner
-- looks in one place, and a booking that arrives without a chosen slot is
-- still a lead rather than a dropped row.
alter table public.leads add column if not exists kind text not null default 'enquiry';
alter table public.leads add column if not exists service text;
-- Kept as the date and time the customer picked, not a timestamp: converting
-- "Tuesday 10am" into an instant needs a timezone nobody asked them for, and
-- getting it wrong means turning up on the wrong day.
alter table public.leads add column if not exists preferred_date date;
alter table public.leads add column if not exists preferred_time text;
