import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';
import { ButtonLink } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignupPage() {
  return (
    <AuthShell
      title="Ship your first site today"
      subtitle="One day free, 10 credits a day. ₹500/month when you want to keep going."
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
