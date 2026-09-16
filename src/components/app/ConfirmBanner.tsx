'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * "Confirm your email" said before the work, not after it.
 *
 * The check lives on project creation, which is the last step: a new account
 * picked a category, wrote a prompt, answered four questions, pressed Build,
 * and only then found out it could not. Everything they had typed was still
 * there, but the moment was gone.
 *
 * So it is said from the first screen, every screen, until it is done — and
 * with the one action that fixes it, because "check your email" is unhelpful
 * when the message went to spam an hour ago.
 */
export function ConfirmBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: failed } = await supabase.auth.resend({ type: 'signup', email });
      if (failed) throw failed;
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send it again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-[#e5a15a]/30 bg-[#e5a15a]/10 px-5 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] leading-relaxed">
        <span className="text-[#e5a15a]">
          Confirm your email to build your first site. We sent a link to{' '}
          <strong className="font-normal">{email}</strong>.
        </span>
        {sent ? (
          <span className="text-ink-muted">Sent again — check spam too.</span>
        ) : (
          <button
            type="button"
            onClick={() => void resend()}
            disabled={busy}
            className="text-[#e5a15a] underline underline-offset-2 transition hover:text-ink-primary disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send it again'}
          </button>
        )}
        {error ? <span className="text-[#e5735a]">{error}</span> : null}
      </div>
    </div>
  );
}
