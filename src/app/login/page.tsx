import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';
import { ButtonLink } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Pick up where you left off.">
      {isSupabaseConfigured ? (
        <Suspense fallback={<div className="h-64" />}>
          <AuthForm mode="login" />
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
