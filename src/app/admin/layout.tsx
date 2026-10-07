import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { requireAdmin } from '@/lib/auth';

/** A separate shell from /app — this is a founder tool, not a customer surface. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b border-hairline px-6 py-4">
        <Logo href="/admin" />
        <Badge tone="warning">Internal</Badge>

        {/* Every section is reachable from here. The Operations page used to
            hold revenue, model spend and moderation at once, which meant the
            only way to any of them was to open a page that loaded all three. */}
        <nav className="flex flex-wrap gap-1">
          <AdminTab href="/admin" label="Overview" />
          <AdminTab href="/admin/revenue" label="Revenue" />
          <AdminTab href="/admin/spend" label="Model spend" />
          <AdminTab href="/admin/flagged" label="Flagged" />
          <AdminTab href="/admin/users" label="Users" />
          <AdminTab href="/admin/errors" label="Errors" />
        </nav>

        <Link href="/app" className="ml-auto text-[15px] text-ink-muted transition hover:text-ink-primary">
          ← Back to app
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-pill px-3.5 py-1.5 text-[15px] text-ink-secondary transition hover:bg-white/5 hover:text-ink-primary"
    >
      {label}
    </Link>
  );
}
