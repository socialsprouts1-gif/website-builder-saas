import { CookiePreferences } from '@/components/legal/CookiePreferences';
import { unindexedMetadata } from '@/lib/metadata';

export const metadata = unindexedMetadata({
  title: 'Cookie Preferences',
  description: 'What Lumen stores in your browser, and what you can clear.',
  path: '/legal/cookie-preferences',
});

export default function CookiePreferencesPage() {
  return <CookiePreferences />;
}
