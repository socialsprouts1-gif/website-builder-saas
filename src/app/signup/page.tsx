import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignupPage() {
  return (
    <AuthShell
      title="Ship your first site today"
      subtitle="Free to build. Pay ₹500/month when you are ready to keep it."
    >
      <Suspense fallback={<div className="h-72" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
