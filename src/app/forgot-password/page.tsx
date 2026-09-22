import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="It happens. This takes a minute.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
