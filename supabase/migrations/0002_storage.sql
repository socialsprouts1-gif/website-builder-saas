-- Storage for the blob-shaped things: uploaded reference screenshots and any
-- images a user swaps into a generated site. Generated *code* lives in
-- project_versions.files so a version is written as a single transactional row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Objects are namespaced by project id; owners write, everyone reads (generated
-- sites are public by nature and reference these URLs directly).
create policy "project assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-assets');

create policy "owners upload project assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.projects p
      where p.user_id = auth.uid()
        and p.id::text = split_part(name, '/', 1)
    )
  );

create policy "owners delete project assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.projects p
      where p.user_id = auth.uid()
        and p.id::text = split_part(name, '/', 1)
    )
  );
