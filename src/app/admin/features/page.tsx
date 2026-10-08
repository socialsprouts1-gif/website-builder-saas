import { SectionHeader } from '@/components/ui/Card';
import { FeatureSwitches } from '@/components/admin/FeatureSwitches';
import { UserOverrides } from '@/components/admin/UserOverrides';
import { featureGroups } from '@/lib/features';
import { globalFlags, overridesByUser } from '@/lib/features.server';
import { listUsers } from '@/lib/admin';

export const metadata = { title: 'Features' };
export const dynamic = 'force-dynamic';

/**
 * What is switched on, for everyone and for individuals.
 *
 * The distinction this screen is built around: a plan decides what somebody
 * has paid for, and a switch decides whether the thing is open at all. Both
 * have to pass. Switching 3D Studio on for one free account lets them in
 * without giving them Premium, and switching it off globally closes it to
 * paying customers too — which is the point of having it.
 */
export default async function AdminFeaturesPage() {
  const [flags, overrides, users] = await Promise.all([
    globalFlags(),
    overridesByUser(),
    listUsers(),
  ]);

  const withOverrides = users
    .filter((user) => overrides.has(user.id))
    .map((user) => ({ id: user.id, email: user.email, flags: overrides.get(user.id) ?? {} }));

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="Features"
        description="What everybody can see. Switch one off and it disappears from the sidebar and is refused on the server."
      />

      <FeatureSwitches groups={featureGroups()} flags={flags} />

      <h2 className="mb-2 mt-12 font-display text-xl text-ink-primary">One account at a time</h2>
      <p className="mb-5 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
        An override beats the switch above, in both directions — let one account into something
        that is closed, or shut one account out of something that is open. Clearing it puts them
        back on whatever everybody else has.
      </p>
      <UserOverrides users={users.map((user) => ({ id: user.id, email: user.email }))} existing={withOverrides} />
    </div>
  );
}
