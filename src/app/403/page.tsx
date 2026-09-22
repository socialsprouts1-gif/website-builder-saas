import type { Metadata } from 'next';
import { StatusScreen } from '@/components/status/StatusScreen';

export const metadata: Metadata = { title: 'Not yours to open' };

export default function ForbiddenPage() {
  return (
    <StatusScreen
      code="403"
      title="That one is not"
      accent="yours."
      message="You are signed in, but this belongs to a different account."
      detail="If you have two accounts, the site you are looking for may be on the other one. Sites are never shared between accounts."
      actions={[
        { href: '/app', label: 'Your sites' },
        { href: '/support', label: 'This looks wrong', tone: 'quiet' },
      ]}
    />
  );
}
