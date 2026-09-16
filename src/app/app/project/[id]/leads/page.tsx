import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { LeadList } from '@/components/app/LeadList';
import { createClient } from '@/lib/supabase/server';
import { pageLabel } from '@/lib/pages';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Enquiries' };
export const dynamic = 'force-dynamic';

/**
 * The people who filled in the form on this site.
 *
 * Until the leads table existed, that form thanked the visitor and threw what
 * they wrote away. This is the other end of the fix: the enquiry has to land
 * somewhere the owner will actually look.
 */
export default async function LeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const supabase = await createClient();
  // RLS scopes both of these to the caller, so a hit proves ownership.
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, public_slug, published_at')
    .eq('id', id)
    .maybeSingle();
  if (!project) notFound();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, contact, message, page, created_at, read_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  const unread = (leads ?? []).filter((lead) => !lead.read_at).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-ink-primary">Enquiries</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            Everyone who filled in a form on {project.name}.
          </p>
        </div>
        {unread > 0 ? <Badge tone="accent">{unread} new</Badge> : null}
      </div>

      {error ? (
        // The table arrives in migration 0012, and saying which one is the
        // difference between a fixable problem and a broken page.
        <p className="rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-4 py-3.5 text-[13px] leading-relaxed text-[#e5a15a]">
          The enquiries table is not in your database yet — it arrives in migration 0012. Run
          supabase/setup.sql and this page will fill in.
        </p>
      ) : !project.published_at ? (
        <p className="rounded-card border border-hairline bg-raised px-4 py-3.5 text-[13px] leading-relaxed text-ink-muted">
          This site is not published yet, so nobody can send you anything. Publish it and the form on
          your contact page starts delivering here.
        </p>
      ) : (leads ?? []).length === 0 ? (
        <div className="rounded-card border border-hairline bg-raised px-4 py-5">
          <p className="text-[13.5px] text-ink-primary">Nothing yet.</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            When someone fills in the form on your site, it appears here — name, how to reach them, and
            what they wrote. Try it yourself:{' '}
            <Link
              href={`/s/${project.public_slug}/contact.html`}
              target="_blank"
              className="text-accent hover:underline"
            >
              open your contact page ↗
            </Link>
          </p>
        </div>
      ) : (
        <LeadList
          projectId={id}
          leads={(leads ?? []).map((lead) => ({
            ...lead,
            pageLabel: lead.page ? pageLabel(lead.page.split('/').pop() || lead.page) : null,
          }))}
        />
      )}
    </div>
  );
}
