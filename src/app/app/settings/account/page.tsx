import { Card, SectionHeader } from '@/components/ui/Card';
import { AccountForm } from '@/components/app/AccountForm';
import { requireUser, getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();
  const authUser = await getSessionUser();

  const providers = (authUser?.app_metadata?.providers as string[] | undefined) ?? [
    authUser?.app_metadata?.provider ?? 'email',
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <SectionHeader title="Account" description="Your profile and how you sign in." />

      <Card>
        <AccountForm
          email={user.email}
          fullName={user.profile?.full_name ?? ''}
          businessType={user.profile?.onboarding_business_type ?? ''}
          voiceStorageEnabled={Boolean(user.profile?.voice_storage_enabled)}
        />
      </Card>

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Sign-in</h2>
      <Card className="space-y-2 text-[13px] text-ink-secondary">
        <p>
          Signed in with <span className="text-ink-primary">{providers.join(', ')}</span>.
        </p>
        <p className={authUser?.email_confirmed_at ? 'text-ink-secondary' : 'text-[#e5735a]'}>
          {authUser?.email_confirmed_at
            ? 'Email verified.'
            : 'Email not verified yet — confirm it to start generating.'}
        </p>
      </Card>
    </div>
  );
}
