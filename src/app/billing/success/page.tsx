import { StatusScreen } from '@/components/status/StatusScreen';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('Payment received');

export default function PaymentSuccessPage() {
  return (
    <StatusScreen
      title="You are"
      accent="subscribed."
      message="The payment went through and the paid features are on now."
      detail="A receipt is on its way to the email address on your account. Billing in Settings shows the plan, the next date, and the way to cancel."
      actions={[
        { href: '/app', label: 'Back to my sites' },
        { href: '/app/settings/billing', label: 'See billing', tone: 'quiet' },
      ]}
    />
  );
}
