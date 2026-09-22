import type { Metadata } from 'next';
import { StatusScreen } from '@/components/status/StatusScreen';

export const metadata: Metadata = { title: 'No connection' };

export default function OfflinePage() {
  return (
    <StatusScreen
      title="No connection"
      message="Your device is not online, so Lumen cannot reach anything."
      detail="Whatever you had typed is still in this tab. Reconnect and carry on from where you were."
      actions={[{ href: '/app', label: 'Try again' }]}
    />
  );
}
