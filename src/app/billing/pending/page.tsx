import { StatusScreen } from '@/components/status/StatusScreen';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('Payment pending');

/**
 * The state people are most likely to panic in: money has left, and nothing
 * has switched on yet. So it says plainly that it is normal, how long it
 * takes, and what to do if it does not resolve.
 */
export default function PaymentPendingPage() {
  return (
    <StatusScreen
      title="Waiting on your"
      accent="bank."
      message="The payment has been made but your bank has not confirmed it to us yet. This is normal with UPI and net banking."
      detail="It usually clears within a few minutes. The paid features switch on by themselves the moment it does — you do not need to pay again, and paying again would charge you twice."
      actions={[
        { href: '/app/settings/billing', label: 'Check billing' },
        { href: '/support', label: 'Still waiting after an hour?', tone: 'quiet' },
      ]}
    />
  );
}
