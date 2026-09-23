'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { CTA_OPTIONS } from '@/lib/templates/details';

export interface SetupTemplate {
  id: string;
  name: string;
  industryLabel: string;
  action: string;
  sections: number;
  pages: number;
}

/**
 * The questions Lumen asks instead of asking somebody to write a good prompt.
 *
 * The prompt box was the worst part of this product for the people it is for. A
 * shop owner does not know that "include a treatments page with prices" is the
 * sentence that gets them a treatments page with prices, and what they got
 * depended on a skill nobody told them they needed. The template already knows
 * the shape; these are the facts only they have.
 *
 * Nothing here is required except the name and enough about the business to
 * write about — the form says which, rather than generating something hollow
 * and letting them find out afterwards.
 */
export function TemplateSetupForm({ template }: { template: SetupTemplate }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [offerings, setOfferings] = useState('');
  const [audience, setAudience] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [socials, setSocials] = useState('');
  const [brandColour, setBrandColour] = useState('');
  const [cta, setCta] = useState(template.action);

  const said = [description, businessType, offerings].join(' ').trim();
  const ready = name.trim().length > 1 && said.length >= 20;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);

    const lines = (value: string) =>
      value
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // The brief is the form. Nothing here asks for prompt-writing.
          prompt: `${name.trim()} — ${businessType.trim() || template.industryLabel}`,
          blueprint: template.id,
          inputMode: 'template',
          details: {
            name: name.trim(),
            businessType: businessType.trim() || undefined,
            location: location.trim() || undefined,
            description: description.trim() || undefined,
            offerings: lines(offerings).length ? lines(offerings) : undefined,
            audience: audience.trim() || undefined,
            phone: phone.trim() || undefined,
            whatsapp: whatsapp.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            hours: hours.trim() || undefined,
            socials: lines(socials).length ? lines(socials) : undefined,
            brandColour: brandColour.trim() || undefined,
            cta: cta.trim() || undefined,
          },
        }),
      });

      const data = (await response.json()) as { projectId?: string; error?: string };
      if (!response.ok || !data.projectId) {
        setError(data.error ?? 'Could not start the build. Try again.');
        setBusy(false);
        return;
      }
      router.push(`/app/project/${data.projectId}`);
    } catch {
      setError('Could not reach Lumen. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Group title="The business" note="The only part Lumen cannot work out for itself.">
        <Field label="Business name" required>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="SmileCare Dental Clinic"
            className={input}
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What it is">
            <input
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              placeholder="Dental clinic"
              className={input}
            />
          </Field>
          <Field label="Where it is">
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Akola, Maharashtra"
              className={input}
            />
          </Field>
        </div>
        <Field label="In your own words" hint="Two or three sentences. What you do and who for.">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Family dentistry since 2011. Two dentists, same-day emergency slots, and written estimates before anything starts."
            className={cn(input, 'resize-y')}
          />
        </Field>
        <Field label="What you sell or do" hint="One per line. Add a price where you would quote one.">
          <textarea
            value={offerings}
            onChange={(event) => setOfferings(event.target.value)}
            rows={4}
            placeholder={'Check-up and clean — ₹800\nRoot canal — from ₹4,500\nBraces and aligners'}
            className={cn(input, 'resize-y')}
          />
        </Field>
        <Field label="Who it is for">
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Families in west Akola"
            className={input}
          />
        </Field>
      </Group>

      <Group title="How people reach you" note="Whatever you leave blank is simply left off the site.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" className={input} />
          </Field>
          <Field label="WhatsApp" hint="Enquiries and orders can be sent straight here.">
            <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+91 98765 43210" className={input} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hello@smilecare.in" className={input} />
          </Field>
          <Field label="Address">
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="24 Ratanlal Plot, Akola" className={input} />
          </Field>
        </div>
        <Field label="Opening hours">
          <input value={hours} onChange={(event) => setHours(event.target.value)} placeholder="Mon–Sat 10am–8pm, Sunday closed" className={input} />
        </Field>
        <Field label="Social links" hint="One per line.">
          <textarea value={socials} onChange={(event) => setSocials(event.target.value)} rows={2} placeholder={'https://instagram.com/…'} className={cn(input, 'resize-y')} />
        </Field>
      </Group>

      <Group title="The look and the action" note="The template decides the rest.">
        <Field label="A colour you already use" hint="Optional. The palette is built around it.">
          <div className="flex items-center gap-3">
            <input
              value={brandColour}
              onChange={(event) => setBrandColour(event.target.value)}
              placeholder="#1F4D3D"
              className={cn(input, 'max-w-[10rem]')}
            />
            {/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandColour) ? (
              <span className="h-9 w-9 rounded-[8px] border border-white/15" style={{ background: brandColour }} />
            ) : null}
          </div>
        </Field>
        <Field label="The one thing you want visitors to do">
          <div className="flex flex-wrap gap-1.5">
            {CTA_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCta(option)}
                aria-pressed={cta === option}
                className={cn(
                  'rounded-pill border px-3 py-1.5 text-[12.5px] transition',
                  cta === option
                    ? 'border-accent/60 bg-accent-soft text-ink-primary'
                    : 'border-hairline text-ink-secondary hover:border-white/25',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </Field>
      </Group>

      {error ? (
        <p className="rounded-card border border-[#c46026]/40 bg-[#c46026]/10 px-4 py-3 text-[13px] text-ink-secondary">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-hairline pt-6">
        <Button type="submit" size="lg" disabled={!ready || busy}>
          {busy ? 'Starting…' : `Build ${name.trim() || 'my site'} →`}
        </Button>
        <p className="text-[12.5px] text-ink-muted">
          {ready
            ? `${template.sections} sections across ${template.pages} pages. Takes a few minutes.`
            : 'Add the name and a few lines about the business to start.'}
        </p>
      </div>
    </form>
  );
}

const input =
  'w-full rounded-[10px] border border-hairline bg-[var(--bg-base-deep)] px-3.5 py-2.5 text-[14px] text-ink-primary outline-none placeholder:text-ink-muted focus-visible:border-white/30';

function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1">
        <span className="font-display text-[19px] text-ink-primary">{title}</span>
        <span className="ml-2 text-[12.5px] text-ink-muted">{note}</span>
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="text-[13px] text-ink-secondary">{label}</span>
        {required ? <span className="text-[11px] text-accent">required</span> : null}
        {hint ? <span className="text-[12px] text-ink-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
