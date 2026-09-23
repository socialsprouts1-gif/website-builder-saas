import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('Forgot password');

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="It happens. This takes a minute.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
