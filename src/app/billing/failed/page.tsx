import type { Metadata } from 'next';
import { StatusScreen } from '@/components/status/StatusScreen';

export const metadata: Metadata = { title: 'Payment failed' };

/**
 * Says the one thing somebody in this position most wants to know — that
 * nothing has been taken and nothing has been lost — before anything else.
 */
export default function PaymentFailedPage() {
  return (
    <StatusScreen
      title="That payment did not"
      accent="go through."
      message="Nothing has been charged, and nothing on your account has changed. Your sites are exactly where they were."
      detail="Banks decline for ordinary reasons: a daily limit, an international block, a card that needs a one-time code. Trying again, or a different card or UPI, usually settles it."
      actions={[
        { href: '/app/settings/billing', label: 'Try again' },
        { href: '/support', label: 'It keeps failing', tone: 'quiet' },
        { href: '/app', label: 'Back to my sites', tone: 'quiet' },
      ]}
    />
  );
}
