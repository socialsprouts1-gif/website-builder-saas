import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';
import { ButtonLink } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/env';
import { pageMetadata } from '@/lib/metadata';
import { CREDIT_COST, FREE_CREDITS } from '@/lib/env';

export const metadata = pageMetadata({
  title: 'Create your account',
  description:
    'Create a free Lumen account and build your first website from a sentence. No card needed to build one and look at it.',
  path: '/signup',
});

export default function SignupPage() {
  return (
    <AuthShell
      title="Ship your first site today"
      subtitle={`${FREE_CREDITS} free credits — ${Math.floor(FREE_CREDITS / CREDIT_COST.generation)} whole websites, no card. Plans from ₹500 a month after that.`}
    >
      {isSupabaseConfigured ? (
        <Suspense fallback={<div className="h-72" />}>
          <AuthForm mode="signup" />
        </Suspense>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-ink-secondary">
            This deployment is not connected to its database yet, so accounts cannot be created or signed
            into.
          </p>
          <ButtonLink href="/setup" variant="secondary" size="sm">
            See what is missing
          </ButtonLink>
        </div>
      )}
    </AuthShell>
  );
}
