'use client';

import { useEffect } from 'react';
import { StatusScreen, StatusRetry } from '@/components/status/StatusScreen';

/**
 * Something threw while rendering.
 *
 * Next hands us a `digest` for anything that failed on the server — the same
 * string that appears in the server log — so it is shown. A person writing to
 * support with that eight-character code turns "it broke" into a line we can
 * actually find.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nothing clever: the server already logged it with the same digest. This
    // is only so it is visible when reproducing something in a browser.
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      title="That did not"
      accent="work."
      message="Something broke on our side. It has been logged, and nothing you had saved is affected."
      detail={
        error.digest
          ? `If you write to us, quote ${error.digest} — it tells us exactly which failure this was.`
          : 'Trying again often works, because most of these are momentary.'
      }
      actions={[
        { href: '/app', label: 'Your sites', tone: 'quiet' },
        { href: '/support', label: 'Tell us what happened', tone: 'quiet' },
      ]}
    >
      <div className="flex justify-center">
        <StatusRetry onRetry={reset} />
      </div>
    </StatusScreen>
  );
}
