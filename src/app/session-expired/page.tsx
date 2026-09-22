import type { Metadata } from 'next';
import { StatusScreen } from '@/components/status/StatusScreen';

export const metadata: Metadata = { title: 'Signed out' };

export default function SessionExpiredPage() {
  return (
    <StatusScreen
      title="You have been"
      accent="signed out."
      message="Your session ended — either it expired, or you signed out in another tab."
      detail="Nothing is lost. Every change you made was saved as you made it, and your sites are exactly where you left them."
      actions={[
        { href: '/login', label: 'Log back in' },
        { href: '/forgot-password', label: 'Forgotten your password?', tone: 'quiet' },
      ]}
    />
  );
}
