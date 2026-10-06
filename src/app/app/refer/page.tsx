import { SectionHeader } from '@/components/ui/Card';
import { ReferPanel } from '@/components/app/ReferPanel';
import { requireUser } from '@/lib/auth';
import { referralState, REFERRAL_CREDITS } from '@/lib/referrals';
import { CREDIT_COST } from '@/lib/env';
import { env } from '@/lib/env';

export const metadata = { title: 'Refer a friend' };
export const dynamic = 'force-dynamic';

export default async function ReferPage() {
  const user = await requireUser();
  const state = await referralState(user.id);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Refer a friend"
        description={`They get ${REFERRAL_CREDITS} credits on top of their free ones, and so do you — ${
          REFERRAL_CREDITS / CREDIT_COST.generation
        } more websites each, for both of you.`}
      />

      <ReferPanel state={state} origin={env.canonicalOrigin} />
    </div>
  );
}
