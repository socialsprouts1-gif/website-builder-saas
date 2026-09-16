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

## Tests

`npm test` runs them; `npm run test:watch` while working. They live next to what
they test, as `*.test.ts`.

Everything here is a pure function tested through its real module — no mocked
Supabase, no fake OpenAI. That is a deliberate limit rather than a gap to fill
later: the parts worth testing are the ones that decide something (which step
runs next, whether a listing is readable, whether a section is already on the
page), and those are all reachable without a network.

When a bug is found, the test comes with the fix in the same commit. Every
regression this project has had was in code that had no test and then did.
