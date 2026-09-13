'use client';

import { useState } from 'react';

/**
 * Building the site assistant in the conversation, one question at a time.
 *
 * The connect card used to hand this off to a tab: "Set it up →", and you were
 * somewhere else looking at a form. Nobody asked to go to a tab; they asked for
 * an assistant. So the questions are asked here — what it is called, what it
 * says first, how it should sound, whose key pays for it — and at the end it is
 * on the site.
 *
 * One question per screen on purpose. Four short questions read as a
 * conversation; the same four fields stacked read as paperwork.
 */

type Tone = 'friendly' | 'professional' | 'concise';

const TONES: { value: Tone; label: string; sample: string }[] = [
  {
    value: 'friendly',
    label: 'Friendly',
    sample: '“Of course! We’re open till 8 on weekdays — want me to book you in?”',
  },
  {
    value: 'professional',
    label: 'Professional',
    sample: '“We are open until 8pm on weekdays. I can arrange an appointment for you.”',
  },
  {
    value: 'concise',
    label: 'Straight to the point',
    sample: '“Weekdays till 8pm. Want a slot?”',
  },
];

const STEPS = ['Name', 'Greeting', 'Voice', 'Key'] as const;

export function ChatbotSetup({
  projectId,
  businessName,
  onDone,
  onBack,
}: {
  projectId: string;
  businessName: string;
  onDone: (message: string) => void;
  /** Leaves the questionnaire, back to the provider list. */
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Assistant');
  const [greeting, setGreeting] = useState(`Hi! Ask me anything about ${businessName}.`);
  const [tone, setTone] = useState<Tone>('friendly');
  const [keyChoice, setKeyChoice] = useState<'lumen' | 'own' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdvance =
    step === 0
      ? name.trim().length > 0
      : step === 1
        ? greeting.trim().length > 0
        : step === 2
          ? true
          : keyChoice === 'lumen' || (keyChoice === 'own' && apiKey.trim().length >= 20);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      // The key first: if it is rejected, nothing else has happened yet and the
      // person is one field away from fixing it.
      if (keyChoice === 'own') {
        const keyResponse = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: apiKey.trim() }),
        });
        const keyPayload = await keyResponse.json();
        if (!keyResponse.ok) throw new Error(keyPayload.error ?? 'OpenAI rejected that key.');
      }

      const response = await fetch(`/api/projects/${projectId}/chatbot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), greeting: greeting.trim(), tone, isActive: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not build the assistant');

      onDone(
        payload.chunks > 0
          ? `${name.trim()} is live on your site — it read ${payload.chunks} passages from ${payload.documents} of your pages. Reload the preview to see the bubble.`
          : `${name.trim()} is live on your site, but there was no page content to read yet. Reload the preview to see the bubble.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not build the assistant');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-4">
      <Progress at={step} />

      {step === 0 ? (
        <Question
          title="What should it be called?"
          hint="Visitors see this at the top of the chat window."
        >
          <Text value={name} onChange={setName} placeholder="Assistant" maxLength={60} />
        </Question>
      ) : null}

      {step === 1 ? (
        <Question title="What should it say first?" hint="The line that greets someone who opens it.">
          <Text
            value={greeting}
            onChange={setGreeting}
            placeholder={`Hi! Ask me anything about ${businessName}.`}
            maxLength={300}
          />
        </Question>
      ) : null}

      {step === 2 ? (
        <Question title="How should it sound?" hint="Same answer, three ways of saying it.">
          <div className="space-y-2">
            {TONES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTone(option.value)}
                className={`lumen-raise block w-full rounded-[12px] border p-3 text-left ${
                  tone === option.value ? 'border-accent/60' : 'border-hairline'
                }`}
              >
                <span
                  className={`block text-[12.5px] ${
                    tone === option.value ? 'text-accent' : 'text-ink-primary'
                  }`}
                >
                  {option.label}
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-muted">
                  {option.sample}
                </span>
              </button>
            ))}
          </div>
        </Question>
      ) : null}

      {step === 3 ? (
        <Question
          title="Whose OpenAI key should it use?"
          hint="Every answer it gives costs a fraction of a cent. Someone has to pay for it."
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setKeyChoice('lumen')}
              className={`lumen-raise block w-full rounded-[12px] border p-3 text-left ${
                keyChoice === 'lumen' ? 'border-accent/60' : 'border-hairline'
              }`}
            >
              <span
                className={`block text-[12.5px] ${
                  keyChoice === 'lumen' ? 'text-accent' : 'text-ink-primary'
                }`}
              >
                Use my Lumen credits
              </span>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-muted">
                Nothing to set up. Comes out of your daily allowance.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setKeyChoice('own')}
              className={`lumen-raise block w-full rounded-[12px] border p-3 text-left ${
                keyChoice === 'own' ? 'border-accent/60' : 'border-hairline'
              }`}
            >
              <span
                className={`block text-[12.5px] ${
                  keyChoice === 'own' ? 'text-accent' : 'text-ink-primary'
                }`}
              >
                Use my own OpenAI key
              </span>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-muted">
                Unmetered, billed by OpenAI. Stored encrypted and never shown again.
              </span>
            </button>

            {keyChoice === 'own' ? (
              <div className="pt-1">
                <Text
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder="sk-proj-…"
                  secret
                  maxLength={300}
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  From platform.openai.com → API keys. Lumen checks it with OpenAI before saving it.
                </p>
              </div>
            ) : null}
          </div>
        </Question>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#e5735a]">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep((current) => current + 1)}
            className="lumen-key rounded-pill px-4 py-1.5 text-[12px] disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!canAdvance || busy}
            onClick={create}
            className="lumen-key rounded-pill px-4 py-1.5 text-[12px] disabled:opacity-40"
          >
            {busy ? 'Building…' : 'Put it on my site'}
          </button>
        )}
        <button
          type="button"
          onClick={() => (step === 0 ? onBack() : setStep((current) => current - 1))}
          className="text-[11.5px] text-ink-muted transition hover:text-ink-secondary"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function Progress({ at }: { at: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, index) => (
        <span
          key={label}
          className={`h-1.5 rounded-pill transition-all ${
            index === at
              ? 'w-7 bg-accent'
              : index < at
                ? 'w-4 bg-accent/45'
                : 'w-4 bg-white/12'
          }`}
        />
      ))}
      <span className="ml-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
        {at + 1} of {STEPS.length}
      </span>
    </div>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-[13px] text-ink-primary">{title}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function Text({
  value,
  onChange,
  placeholder,
  maxLength,
  secret,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  secret?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      type={secret ? 'password' : 'text'}
      autoComplete={secret ? 'off' : undefined}
      spellCheck={false}
      className="lumen-well w-full rounded-[10px] border border-hairline px-3 py-2 text-[13px] text-ink-primary outline-none focus:border-accent/50"
    />
  );
}
