import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { requireAdmin } from '@/lib/auth';

/** A separate shell from /app — this is a founder tool, not a customer surface. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-hairline px-6 py-4">
        <Logo href="/admin" />
        <Badge tone="warning">Internal</Badge>
        <Link href="/app" className="ml-auto text-[13px] text-ink-muted transition hover:text-ink-primary">
          ← Back to app
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
