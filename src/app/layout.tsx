import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
import './globals.css';
import { env } from '@/lib/env';

const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  // Every relative URL in a page's metadata is resolved against this, so when
  // it fell through to localhost — which it did on any deployment without
  // NEXT_PUBLIC_SITE_URL — every og:image and canonical a crawler read pointed
  // at a machine that does not exist.
  metadataBase: new URL(env.canonicalOrigin),
  title: {
    default: 'Lumen — Ship a website from a sentence.',
    template: '%s · Lumen',
  },
  description:
    'Lumen turns one prompt into a production-grade website — design system, content, animations, SEO, and deploy. Iterate in chat, edit visually, ship anywhere.',
  applicationName: 'Lumen',
  robots: env.indexable
    ? { index: true, follow: true }
    : { index: false, follow: false },
  verification: {
    google: env.verification.google,
    other: env.verification.bing ? { 'msvalidate.01': env.verification.bing } : undefined,
  },
  openGraph: {
    title: 'Lumen — Ship a website from a sentence.',
    description: 'One prompt in, a production-grade website out.',
    type: 'website',
    url: env.canonicalOrigin,
    siteName: 'Lumen',
    images: [{ url: '/lumen-mark.png', width: 512, height: 512, alt: 'Lumen' }],
  },
  twitter: {
    card: 'summary',
    title: 'Lumen — Ship a website from a sentence.',
    description: 'One prompt in, a production-grade website out.',
    images: ['/lumen-mark.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a08',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-base font-sans antialiased">{children}</body>
    </html>
  );
}
