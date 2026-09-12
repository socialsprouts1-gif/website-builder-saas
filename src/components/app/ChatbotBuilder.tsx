'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

const TONES = [
  { value: 'friendly', label: 'Friendly — warm and conversational' },
  { value: 'professional', label: 'Professional — polished and courteous' },
  { value: 'concise', label: 'Concise — one or two sentences, no filler' },
];

export function ChatbotBuilder({
  projectId,
  siteUrlBase,
  initial,
}: {
  projectId: string;
  siteUrlBase: string;
  initial: {
    name: string;
    greeting: string;
    tone: string;
    faq: string;
    embedKey: string | null;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [greeting, setGreeting] = useState(initial.greeting);
  const [tone, setTone] = useState(initial.tone);
  const [faq, setFaq] = useState(initial.faq);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [embedKey, setEmbedKey] = useState(initial.embedKey);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const snippet = embedKey
    ? `<script src="${siteUrlBase}/api/chatbot/${embedKey}/widget" defer></script>`
    : null;

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/chatbot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, greeting, tone, faq, isActive }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not save the chatbot');
      setEmbedKey(payload.embedKey);
      setNotice(
        payload.chunks > 0
          ? `Saved. Indexed ${payload.chunks} passages from ${payload.documents} sources.`
          : 'Saved, but there was no site content to index yet.',
      );
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the chatbot');
    } finally {
      setBusy(false);
    }
  }

  async function copySnippet() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — select the snippet and copy it manually.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Bot name">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
        </Field>
        <Field label="Tone">
          <Select value={tone} onChange={(event) => setTone(event.target.value)}>
            {TONES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Greeting" hint="The first thing a visitor sees when they open the bubble.">
        <Input value={greeting} onChange={(event) => setGreeting(event.target.value)} maxLength={300} />
      </Field>

      <Field
        label="Extra knowledge (optional)"
        hint="Your site's content is used automatically. Add anything that isn't on the site — opening hours, parking, policies."
      >
        <Textarea rows={6} value={faq} onChange={(event) => setFaq(event.target.value)} maxLength={20_000} />
      </Field>

      <label className="flex items-center gap-3 text-[13px] text-ink-secondary">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="accent-[var(--accent)]"
        />
        Assistant is live on the site
      </label>

      <Button onClick={save} disabled={busy}>
        {busy ? 'Saving and indexing…' : 'Save and reindex'}
      </Button>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-[10px] border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-[13px] text-accent">
          {notice}
        </p>
      ) : null}

      {snippet ? (
        <div className="space-y-3 rounded-card border border-hairline bg-raised p-4">
          <p className="text-[13px] text-ink-primary">
            {isActive ? 'It is already on your website' : 'Switch it on to put it on your website'}
          </p>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            {isActive
              ? 'Lumen puts the chat bubble on your site for you — on the preview and on your published address. There is nothing to paste and no code to touch.'
              : 'Tick “Assistant is live on the site” above and save. Lumen adds the chat bubble to your site itself.'}
          </p>

          {/* The snippet is still here for a site hosted somewhere else, but it
              is not the instruction any more — it was the only thing on offer,
              and pasting a script tag is not something to ask of someone who
              came here to avoid code. */}
          <details className="group">
            <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition hover:text-ink-secondary">
              <span className="group-open:hidden">Have another website? Add it there too →</span>
              <span className="hidden group-open:inline">Adding it to another website</span>
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-[12px] text-ink-muted">
                Paste this once before the closing &lt;/body&gt; tag of any site you already have —
                WordPress, Wix, Shopify, anything.
              </p>
              <pre className="overflow-x-auto rounded-[8px] border border-hairline bg-[var(--bg-base-deep)] p-3 font-mono text-[11.5px] text-ink-secondary">
                {snippet}
              </pre>
              <Button size="sm" variant="secondary" onClick={copySnippet}>
                {copied ? 'Copied' : 'Copy snippet'}
              </Button>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
