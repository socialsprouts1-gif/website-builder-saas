import { StatusScreen } from '@/components/status/StatusScreen';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('Not yours to open');

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
