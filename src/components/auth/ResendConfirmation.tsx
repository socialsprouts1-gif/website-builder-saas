'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

/**
 * Sending the confirmation email again.
 *
 * Separate from the banner inside the app because this one is reached by
 * somebody who is not looking at their projects — they are on the verify page
 * because the first email never arrived.
 */
export function ResendConfirmation({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setState('sending');
    setError(null);
    try {
      const { error: failed } = await createClient().auth.resend({ type: 'signup', email });
      if (failed) throw new Error(failed.message);
      setState('sent');
    } catch (cause) {
      setState('idle');
      setError(
        cause instanceof Error && /rate|limit|seconds/i.test(cause.message)
          ? 'Just sent one. Give it a minute before asking for another.'
          : 'That did not send. Try again shortly.',
      );
    }
  }

  if (state === 'sent') {
    return (
      <p className="rounded-card border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-ink-primary">
        Sent again to {email}. It can take a couple of minutes.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" className="w-full" onClick={() => void resend()} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send it again'}
      </Button>
      {error ? <p className="text-[12.5px] text-[#e5a15a]">{error}</p> : null}
    </div>
  );
}
