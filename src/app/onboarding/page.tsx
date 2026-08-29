import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { CATEGORIES } from '@/lib/categories';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'One quick question' };

/**
 * The entire onboarding. One question, then straight into building —
 * deliberately not a wizard (spec Section 13).
 */
export default async function OnboardingPage() {
  await requireUser();

  async function choose(formData: FormData) {
    'use server';
    const category = String(formData.get('category') ?? '');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    await supabase.from('users').update({ onboarding_business_type: category }).eq('id', user.id);
    redirect(category ? `/app/new?category=${category}` : '/app/new');
  }

  return (
    <AuthShell
      title="What are you building a site for?"
      subtitle="This just pre-fills your first prompt. You can change it later, or skip."
    >
      <form action={choose} className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.slug}
              type="submit"
              name="category"
              value={category.slug}
              className="rounded-[10px] border border-hairline px-4 py-3 text-left text-sm text-ink-secondary transition hover:border-accent/40 hover:text-ink-primary"
            >
              {category.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          name="category"
          value=""
          className="w-full text-center text-[13px] text-ink-muted transition hover:text-ink-primary"
        >
          Skip this
        </button>
      </form>
    </AuthShell>
  );
}
