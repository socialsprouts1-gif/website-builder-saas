import type { MissingFeature } from '@/lib/supabase/features';

const SQL_FILE =
  'https://github.com/socialsprouts1-gif/website-builder-saas/blob/claude/lumen-master-build-49tdi2/supabase/setup.sql';
const SQL_RAW =
  'https://raw.githubusercontent.com/socialsprouts1-gif/website-builder-saas/claude/lumen-master-build-49tdi2/supabase/setup.sql';
const SQL_EDITOR = 'https://supabase.com/dashboard/project/_/sql/new';

/**
 * What is switched off right now, on every screen, until it is not.
 *
 * Every read in this product survives a missing table, because a database
 * part-way through its migrations still has to serve somebody their home page.
 * The cost of that was silence: a clothing shop was generated against a
 * database with no product tables, so the product bands, the basket and the
 * checkout all rendered as nothing, and the owner was told the site was ready.
 *
 * A line on a setup page does not fix that, because nobody goes back to a setup
 * page. This says it where the work happens, names what each missing migration
 * costs in the owner's terms rather than the schema's, and gives the file, the
 * raw file and the editor to paste it into — which is the whole job.
 */
export function MigrationBanner({ missing }: { missing: MissingFeature[] }) {
  if (missing.length === 0) return null;

  const files = [...new Set(missing.map((feature) => feature.migration))];

  return (
    <div className="border-b border-[#c46026]/30 bg-[#c46026]/10 px-5 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#e5a06a]">
            {missing.length === 1 ? 'One feature is switched off' : `${missing.length} features are switched off`}
          </p>
          <p className="text-[12.5px] text-ink-muted">
            {files.length === 1 ? '1 migration has not been run' : `${files.length} migrations have not been run`}
          </p>
        </div>

        <ul className="space-y-1.5">
          {missing.map((feature) => (
            <li key={feature.id} className="text-[13.5px] leading-relaxed text-ink-secondary">
              <span className="text-ink-primary">{feature.label}</span> — {feature.consequence}
            </li>
          ))}
        </ul>

        <p className="text-[13px] leading-relaxed text-ink-secondary">
          One file fixes all of it, and it is safe to run again if you already have:{' '}
          <a href={SQL_FILE} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
            supabase/setup.sql
          </a>{' '}
          (
          <a href={SQL_RAW} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
            raw, for copying
          </a>
          ). Paste the whole thing into the{' '}
          <a href={SQL_EDITOR} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
            Supabase SQL editor
          </a>{' '}
          and run it. This banner goes away on its own within a minute.
        </p>
      </div>
    </div>
  );
}
