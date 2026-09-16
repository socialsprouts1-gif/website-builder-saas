'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';

/**
 * Switching on WhatsApp and bookings, in the two sentences it actually takes.
 *
 * Both of these are usually sold as integrations with keys and approvals.
 * Neither needs one: a wa.me link opens WhatsApp with the message typed, and a
 * booking is a form that files a date. So this asks for a phone number and a
 * list of services, and nothing else.
 */
export function ReachSetup({
  projectId,
  initial,
}: {
  projectId: string;
  initial: {
    whatsappNumber: string | null;
    whatsappMessage: string | null;
    whatsappLeads: boolean;
    bookingEnabled: boolean;
    bookingServices: string[];
    bookingNote: string | null;
  };
}) {
  const [number, setNumber] = useState(initial.whatsappNumber ?? '');
  const [message, setMessage] = useState(initial.whatsappMessage ?? '');
  const [handoff, setHandoff] = useState(initial.whatsappLeads);
  const [booking, setBooking] = useState(initial.bookingEnabled);
  const [services, setServices] = useState(initial.bookingServices.join(', '));
  const [note, setNote] = useState(initial.bookingNote ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/reach`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          whatsappNumber: number.trim() || null,
          whatsappMessage: message.trim() || null,
          whatsappLeads: handoff,
          bookingEnabled: booking,
          bookingServices: services
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          bookingNote: note.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'That did not save');
      if (payload.whatsappNumber) setNumber(payload.whatsappNumber);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-card border border-hairline bg-raised p-5">
      <div>
        <p className="text-[14px] text-ink-primary">WhatsApp</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
          A green button on every page that opens a chat with you, with the first message already
          typed. No Business account, no API, no approval.
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
          Your WhatsApp number
        </span>
        <Input
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          placeholder="98765 43210"
          inputMode="tel"
        />
        <span className="mt-1.5 block text-[11px] text-ink-muted">
          Ten digits is read as an Indian number. Add the country code for anywhere else.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
          What their first message says
        </span>
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Hi! I saw your website and wanted to ask about…"
        />
      </label>

      <Toggle
        on={handoff}
        onChange={setHandoff}
        label="Send enquiries to WhatsApp too"
        hint="After the form is filed here, it opens WhatsApp with the enquiry written out so the customer can send it to you directly."
      />

      <div className="border-t border-hairline pt-5">
        <p className="text-[14px] text-ink-primary">Bookings</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
          A form on your contact page asking what for, which day and what time. Requests land in
          Enquiries next to everything else — nothing to keep in sync.
        </p>
      </div>

      <Toggle on={booking} onChange={setBooking} label="Take booking requests" />

      {booking ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
              What can be booked
            </span>
            <Input
              value={services}
              onChange={(event) => setServices(event.target.value)}
              placeholder="Haircut, Colour, Bridal package"
            />
            <span className="mt-1.5 block text-[11px] text-ink-muted">
              Separated by commas. Leave empty and the form just asks for a day and a time.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
              A line above the form
            </span>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="We confirm every booking on WhatsApp within an hour."
            />
          </label>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        <Button onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {saved ? <span className="text-[12.5px] text-accent">Saved — live on your site now.</span> : null}
        {error ? <span className="text-[12.5px] text-[#e5735a]">{error}</span> : null}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={cn(
        'flex w-full items-start gap-3 rounded-[12px] border p-3 text-left transition',
        on ? 'border-accent/45 bg-accent-soft' : 'border-hairline hover:border-white/20',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[9px] font-bold',
          on ? 'border-accent bg-accent text-accent-ink' : 'border-white/25',
        )}
      >
        {on ? '✓' : ''}
      </span>
      <span className="min-w-0">
        <span className={cn('block text-[13px]', on ? 'text-accent' : 'text-ink-primary')}>{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-muted">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}
