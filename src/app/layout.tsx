import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Inter } from 'next/font/google';
import './globals.css';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Lumen — Ship a website from a sentence.',
    template: '%s · Lumen',
  },
  description:
    'Lumen turns one prompt into a production-grade website — design system, content, animations, SEO, and deploy. Iterate in chat, edit visually, ship anywhere.',
  openGraph: {
    title: 'Lumen — Ship a website from a sentence.',
    description: 'One prompt in, a production-grade website out.',
    type: 'website',
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
