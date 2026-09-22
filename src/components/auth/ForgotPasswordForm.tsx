'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

/**
 * The way back in.
 *
 * Until this existed, forgetting a password meant losing the account and every
 * site in it, with nothing on the login screen even acknowledging the
 * possibility. That is the harshest failure a product can have, and it fails
 * silently — the people it happens to do not write in, they leave.
 *
 * The reply is deliberately the same whether or not the address has an account
 * on it. Saying "no account with that email" turns this form into a way of
 * finding out who has one.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: failed } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // The link lands on the callback, which exchanges it for a session and
        // then sends them on to set a new password.
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      // A rate limit is worth saying out loud; anything else is not, because
      // the answer must not depend on whether the address exists.
      if (failed && /rate|limit|too many/i.test(failed.message)) {
        setError('Too many attempts just now. Try again in a few minutes.');
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-card border border-accent/30 bg-accent-soft px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-primary">
          If there is an account for <strong>{email.trim()}</strong>, a link to set a new password is
          on its way. It expires in an hour.
        </p>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Nothing arrived? Check the spam folder, and check the address above is the one you signed
          up with. You can{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-accent transition hover:underline"
          >
            try a different address
          </button>
          .
        </p>
        <p className="text-center text-[13px] text-ink-muted">
          <Link href="/login" className="text-accent transition hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-ink-secondary">
        Type the email address on your account and we will send a link to set a new password.
      </p>

      <Field label="Email">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          autoFocus
          placeholder="you@business.in"
        />
      </Field>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
        {busy ? 'Sending…' : 'Send the link'}
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-accent transition hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
