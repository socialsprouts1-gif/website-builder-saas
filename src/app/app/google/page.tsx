import { Badge } from '@/components/ui/Badge';
import { GoogleImport } from '@/components/app/GoogleImport';
import { requireUser } from '@/lib/auth';
import { isPlacesConfigured } from '@/lib/google/places';

export const metadata = { title: 'From Google' };
export const dynamic = 'force-dynamic';

export default async function GoogleImportPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-9 text-center">
        <Badge tone="accent" className="mb-5">
          One link
        </Badge>
        <h1 className="font-display text-[36px] leading-tight text-ink-primary">
          Already on <em className="italic text-accent">Google?</em>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-secondary">
          Paste your Google listing and Lumen builds the site from what is already there — your name, address,
          hours, photographs and the reviews people have left you.
        </p>
      </div>

      <GoogleImport configured={isPlacesConfigured()} />
    </div>
  );
}
