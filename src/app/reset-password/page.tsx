import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { noIndex } from '@/lib/metadata';

export const metadata = noIndex('Set a new password');

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Pick something long. Length beats punctuation.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
