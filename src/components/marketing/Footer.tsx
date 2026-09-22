import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/ideas', label: 'Ideas' },
      { href: '/templates', label: 'Templates' },
      { href: '/showcase', label: 'Showcase' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Build',
    links: [
      { href: '/signup', label: 'Start free' },
      { href: '/login', label: 'Log in' },
      { href: '/app/new', label: 'New site' },
      { href: '/support', label: 'Support' },
      { href: '/help', label: 'Help centre' },
    ],
  },
  {
    // The ones people look for before they pay, and the ones a payment
    // gateway asks to see by name. The rest are one click away at /legal.
    title: 'Legal',
    links: [
      { href: '/legal/terms-of-service', label: 'Terms' },
      { href: '/legal/privacy-policy', label: 'Privacy' },
      { href: '/legal/refund-policy', label: 'Refunds' },
      { href: '/legal/cancellation-policy', label: 'Cancellation' },
      { href: '/legal', label: 'All policies' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-shell flex-col gap-10 px-6 py-14 md:flex-row md:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm text-ink-secondary">
            Ship a website from a sentence. Built for small businesses who need a finished site today.
          </p>
        </div>
        <div className="flex flex-wrap gap-10 sm:gap-14">
          {COLUMNS.map((column) => (
            <div key={column.title} className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{column.title}</p>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-secondary transition hover:text-ink-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-shell flex-col gap-2 px-6 py-5 text-[12px] text-ink-muted sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Lumen. Pricing in INR, billed monthly.</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/legal/cookie-preferences" className="transition hover:text-ink-primary">
              Cookie preferences
            </Link>
            <Link href="/legal/accessibility-statement" className="transition hover:text-ink-primary">
              Accessibility
            </Link>
            <span>Public beta · v0.9</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
