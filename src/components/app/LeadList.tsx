'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/components/ui/cn';

export interface Lead {
  id: string;
  name: string | null;
  contact: string | null;
  message: string | null;
  page: string | null;
  pageLabel: string | null;
  kind?: string | null;
  service?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  created_at: string;
  read_at: string | null;
}

/**
 * One enquiry, as something to act on rather than a row in a table.
 *
 * The thing an owner does with a lead is ring it, so the phone number is the
 * biggest thing on the card and it is a link that dials. Everything else is
 * context for that call.
 */
export function LeadList({ projectId, leads }: { projectId: string; leads: Lead[] }) {
  const [items, setItems] = useState(leads);
  const [busy, setBusy] = useState<string | null>(null);

  async function markRead(id: string, read: boolean) {
    setBusy(id);
    // Moved before the write, not after: marking something read is not worth
    // a spinner, and the row is restored if the write fails.
    const previous = items;
    setItems((current) =>
      current.map((lead) =>
        lead.id === id ? { ...lead, read_at: read ? new Date().toISOString() : null } : lead,
      ),
    );
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('leads')
        .update({ read_at: read ? new Date().toISOString() : null })
        .eq('id', id)
        .eq('project_id', projectId);
      if (error) throw error;
    } catch {
      setItems(previous);
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const rows = [
      ['When', 'Name', 'Contact', 'Message', 'Page'],
      ...items.map((lead) => [
        new Date(lead.created_at).toISOString(),
        lead.name ?? '',
        lead.contact ?? '',
        lead.message ?? '',
        lead.page ?? '',
      ]),
    ];
    // A leading quote, plus or equals turns a cell into a formula in Excel, so
    // anything starting with one is prefixed. Someone's enquiry should never
    // execute on the owner's machine.
    const escape = (cell: string) =>
      `"${(/^[=+\-@]/.test(cell) ? `'${cell}` : cell).replace(/"/g, '""')}"`;

    const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enquiries.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportCsv}
          className="lumen-raise rounded-pill border border-hairline px-3.5 py-1.5 text-[12px] text-ink-secondary transition hover:text-ink-primary"
        >
          Download as CSV
        </button>
      </div>

      {items.map((lead) => {
        const telephone = dialable(lead.contact);
        return (
          <article
            key={lead.id}
            className={cn(
              'rounded-card border p-4',
              lead.read_at ? 'border-hairline bg-raised' : 'border-accent/30 bg-accent-soft/40',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {lead.kind === 'booking' ? (
                  // The slot is the thing being asked for, so it goes first.
                  <p className="mb-1 text-[12px] uppercase tracking-[0.14em] text-accent">
                    Booking{lead.service ? ` · ${lead.service}` : ''}
                  </p>
                ) : null}
                {lead.preferred_date ? (
                  <p className="mb-1 text-[14px] text-ink-primary">
                    {new Date(`${lead.preferred_date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {lead.preferred_time ? ` at ${lead.preferred_time}` : ''}
                  </p>
                ) : null}
                <p className="text-[15px] text-ink-primary">{lead.name || 'Someone'}</p>
                {lead.contact ? (
                  telephone ? (
                    <a
                      href={`tel:${telephone}`}
                      className="mt-0.5 block text-[17px] text-accent hover:underline"
                    >
                      {lead.contact}
                    </a>
                  ) : lead.contact.includes('@') ? (
                    <a
                      href={`mailto:${lead.contact}`}
                      className="mt-0.5 block break-all text-[15px] text-accent hover:underline"
                    >
                      {lead.contact}
                    </a>
                  ) : (
                    <p className="mt-0.5 break-all text-[15px] text-ink-secondary">{lead.contact}</p>
                  )
                ) : (
                  <p className="mt-0.5 text-[13px] text-ink-muted">No contact details left</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11.5px] text-ink-muted">{when(lead.created_at)}</p>
                {lead.pageLabel ? (
                  <p className="mt-0.5 text-[11px] text-ink-muted">from {lead.pageLabel}</p>
                ) : null}
              </div>
            </div>

            {lead.message ? (
              <p className="mt-3 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-ink-secondary">
                {lead.message}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3">
              <button
                type="button"
                disabled={busy === lead.id}
                onClick={() => markRead(lead.id, !lead.read_at)}
                className="text-[12px] text-ink-muted transition hover:text-ink-primary disabled:opacity-40"
              >
                {lead.read_at ? 'Mark unread' : 'Mark as done'}
              </button>
              {telephone ? (
                <a
                  href={`https://wa.me/${telephone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[12px] text-accent hover:underline"
                >
                  Reply on WhatsApp ↗
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** A phone number if that is what it is, so the card can offer to ring it. */
function dialable(contact: string | null): string | null {
  if (!contact) return null;
  const digits = contact.replace(/[^\d+]/g, '');
  const count = digits.replace(/\D/g, '').length;
  return count >= 8 && count <= 15 ? digits : null;
}

function when(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}
