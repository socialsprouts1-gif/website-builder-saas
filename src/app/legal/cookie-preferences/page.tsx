import type { Metadata } from 'next';
import { CookiePreferences } from '@/components/legal/CookiePreferences';

export const metadata: Metadata = {
  title: 'Cookie Preferences',
  description: 'What Lumen stores in your browser, and what you can clear.',
};

export default function CookiePreferencesPage() {
  return <CookiePreferences />;
}
