# Working on Lumen

## Database migrations

Whenever the answer to something is "run the SQL", give the links, not just the
filename. Every time, without being asked:

- The file:
  https://github.com/socialsprouts1-gif/website-builder-saas/blob/claude/lumen-master-build-49tdi2/supabase/setup.sql
- Raw, for copying:
  https://raw.githubusercontent.com/socialsprouts1-gif/website-builder-saas/claude/lumen-master-build-49tdi2/supabase/setup.sql
- Where it gets pasted: the Supabase SQL Editor —
  https://supabase.com/dashboard/project/_/sql/new

`supabase/setup.sql` is the whole schema with every migration appended in order,
and it is written to be safe to re-run (`if not exists`, `drop policy if
exists`). So the instruction is always "paste the whole file and run it", never
"run migration 0008" — say which migration added the thing, but hand over the
one file.

When a new migration is added under `supabase/migrations/`, append it to
`supabase/setup.sql` in the same commit.
