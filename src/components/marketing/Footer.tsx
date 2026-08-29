import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/how-it-works', label: 'How it works' },
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
        <div className="flex gap-14">
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
          <span>Public beta · v0.9</span>
        </div>
      </div>
    </footer>
  );
}
