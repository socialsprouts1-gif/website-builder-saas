import { AppNav } from '@/components/app/AppNav';
import { requireUser } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppNav email={user.email} isAdmin={Boolean(user.profile?.is_admin)} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
