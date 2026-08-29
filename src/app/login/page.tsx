import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Pick up where you left off.">
      <Suspense fallback={<div className="h-64" />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
