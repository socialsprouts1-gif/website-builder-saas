'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';
import { checkPassword, passwordStrength, STRENGTH_LABELS } from '@/lib/password';

/**
 * Setting a new password, having arrived from the emailed link.
 *
 * The link is exchanged for a session by the auth callback before this loads,
 * so what happens here is an ordinary password change on an already-signed-in
 * account. If there is no session, the link has expired or was already used —
 * which is worth saying plainly, with the way to get another one, rather than
 * failing on submit.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!live) return;
        setReady(Boolean(data.user));
        setEmail(data.user?.email ?? '');
      })
      .catch(() => {
        if (live) setReady(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const verdict = checkPassword(password, email);
  const strength = passwordStrength(password);
  const matches = password.length > 0 && password === confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!verdict.ok || !matches) return;

    setBusy(true);
    setError(null);

    try {
      const { error: failed } = await createClient().auth.updateUser({ password });
      if (failed) throw new Error(failed.message);
      setDone(true);
      // Straight in. Making somebody log in again with a password they set ten
      // seconds ago is a test of their memory, not of their identity.
      setTimeout(() => {
        router.push('/app');
        router.refresh();
      }, 1200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (ready === null) {
    return <p className="py-8 text-center text-[13.5px] text-ink-muted">Checking your link…</p>;
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <p className="rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-4 py-3.5 text-[13.5px] leading-relaxed text-[#e5a15a]">
          This link has expired or has already been used. They last an hour and work once.
        </p>
        <Link href="/forgot-password" className="block">
          <Button className="w-full">Send me a new one</Button>
        </Link>
        <p className="text-center text-[13px] text-ink-muted">
          <Link href="/login" className="text-accent transition hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <p className="rounded-card border border-accent/30 bg-accent-soft px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-primary">
        Password changed. Taking you to your sites…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {email ? (
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">
          Setting a new password for <strong className="text-ink-primary">{email}</strong>.
        </p>
      ) : null}

      <Field label="New password">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          autoFocus
        />
      </Field>

      {password.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={cn(
                  'h-1 flex-1 rounded-pill transition',
                  strength >= step ? 'bg-accent' : 'bg-white/10',
                )}
              />
            ))}
          </div>
          <p className={cn('text-[12px]', verdict.ok ? 'text-ink-muted' : 'text-[#e5a15a]')}>
            {verdict.ok ? STRENGTH_LABELS[strength] : verdict.problem}
          </p>
        </div>
      ) : null}

      <Field label="Type it again">
        <Input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      {confirm.length > 0 && !matches ? (
        <p className="text-[12px] text-[#e5a15a]">Those two do not match.</p>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy || !verdict.ok || !matches}>
        {busy ? 'Saving…' : 'Set the new password'}
      </Button>
    </form>
  );
}
