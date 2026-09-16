import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { LeadList } from '@/components/app/LeadList';
import { TrafficPanel } from '@/components/app/TrafficPanel';
import { ReachSetup } from '@/components/app/ReachSetup';
import { trafficFor } from '@/lib/traffic';
import { createClient } from '@/lib/supabase/server';
import { pageLabel } from '@/lib/pages';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Results' };
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

  // Asked for separately and allowed to fail: these columns arrive in
  // migration 0013, and the page is worth showing without them.
  const { data: reach } = await supabase
    .from('projects')
    .select(
      'whatsapp_number, whatsapp_message, whatsapp_leads, booking_enabled, booking_services, booking_note',
    )
    .eq('id', id)
    .maybeSingle();

  const traffic = await trafficFor(id).catch(() => null);

  // The booking columns arrive in migration 0013 and the table itself in 0012.
  // A database part-way between the two still has enquiries worth showing, so
  // the richer select falls back to the plain one rather than blanking the page.
  const full = await supabase
    .from('leads')
    .select('id, name, contact, message, page, kind, service, preferred_date, preferred_time, created_at, read_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  const basic = full.error
    ? await supabase
        .from('leads')
        .select('id, name, contact, message, page, created_at, read_at')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(200)
    : null;

  const leads = (full.error ? basic?.data : full.data) as
    | (typeof full)['data']
    | null
    | undefined;
  const error = full.error ? basic?.error : null;

  const unread = (leads ?? []).filter((lead) => !lead.read_at).length;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = (leads ?? []).filter((lead) => new Date(lead.created_at).getTime() >= weekAgo).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-ink-primary">Results</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            Who came to {project.name}, and who got in touch.
          </p>
        </div>
        {unread > 0 ? <Badge tone="accent">{unread} new</Badge> : null}
      </div>

      {traffic ? (
        <div className="mb-6">
          <TrafficPanel traffic={traffic} leadsThisWeek={thisWeek} />
        </div>
      ) : null}

      <div className="mb-8">
        <h2 className="mb-3 font-display text-[19px] text-ink-primary">Enquiries</h2>
      </div>

      {error ? (
        // The table arrives in migration 0012, and saying which one is the
        // difference between a fixable problem and a broken page.
        <p className="rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-4 py-3.5 text-[13px] leading-relaxed text-[#e5a15a]">
          The enquiries table is not in your database yet — it arrives in migration 0012, and the
          traffic and booking tables in 0013. Run supabase/setup.sql and this page fills in.
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

      <div className="mt-10">
        <h2 className="mb-3 font-display text-[19px] text-ink-primary">Get more of them</h2>
        <ReachSetup
          projectId={id}
          initial={{
            whatsappNumber: reach?.whatsapp_number ?? null,
            whatsappMessage: reach?.whatsapp_message ?? null,
            whatsappLeads: reach?.whatsapp_leads ?? false,
            bookingEnabled: reach?.booking_enabled ?? false,
            bookingServices: reach?.booking_services ?? [],
            bookingNote: reach?.booking_note ?? null,
          }}
        />
      </div>
    </div>
  );
}
