import { StatusScreen } from '@/components/status/StatusScreen';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('Back shortly');

/**
 * Shown while Lumen is deliberately down.
 *
 * Deliberately says that published sites are unaffected, because that is the
 * first thing an owner with a live shop will want to know and the thing a
 * generic "we'll be right back" leaves them guessing about.
 */
export default function MaintenancePage() {
  return (
    <StatusScreen
      title="Back in a few"
      accent="minutes."
      message="We are in the middle of an update. The builder is unavailable while it finishes."
      detail="Sites you have already published are not affected — they are still up and still taking enquiries and orders."
      actions={[{ href: '/', label: 'Try again' }]}
    />
  );
}
