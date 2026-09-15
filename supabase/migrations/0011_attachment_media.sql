-- Attachments in the chat composer: images and video.
--
-- The bucket was created for images at 8MB, and `on conflict do nothing` means
-- an existing project never picked up a change to those columns. Both are set
-- explicitly here so re-running this file fixes a bucket that already exists,
-- which is the whole point of setup.sql being re-runnable.
--
-- 50MB matches Supabase's default project-wide upload ceiling; a bucket cannot
-- usefully be raised above it without also raising that.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml',
    'image/x-icon', 'image/vnd.microsoft.icon',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
