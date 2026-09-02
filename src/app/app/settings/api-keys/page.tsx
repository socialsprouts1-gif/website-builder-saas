import { Card, SectionHeader } from '@/components/ui/Card';
import { ApiKeyManager } from '@/components/app/ApiKeyManager';
import { DefaultModelPicker } from '@/components/app/DefaultModelPicker';
import { requireUser } from '@/lib/auth';
import { getKeyStatus, resolveApiKeyForMetadata } from '@/lib/openai/client';
import { fallbackCatalog, getModelCatalog } from '@/lib/openai/models';

export const metadata = { title: 'API keys' };
export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const user = await requireUser();
  const status = await getKeyStatus(user.id);

  let catalog = fallbackCatalog(true);
  try {
    const resolved = await resolveApiKeyForMetadata(user.id);
    if (resolved) catalog = await getModelCatalog(resolved.apiKey);
  } catch {
    // Falls back to the seed list — the page says so below.
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <SectionHeader
        title="API keys"
        description="Use Lumen's shared key, or bring your own for unlimited generations."
      />

      <Card>
        <ApiKeyManager
          hasOwnKey={status.hasOwnKey}
          last4={status.last4}
          creditsUsed={status.creditsUsed}
          creditsLimit={status.creditsLimit}
          resetsAt={status.resetsAt}
          platformConfigured={status.platformConfigured}
        />
      </Card>

      <h2 className="mb-3 mt-10 font-display text-xl text-ink-primary">Default model</h2>
      <Card>
        <DefaultModelPicker
          quality={catalog.quality}
          fast={catalog.fast}
          all={catalog.all}
          current={user.profile?.default_model ?? null}
          stale={catalog.stale}
        />
      </Card>
    </div>
  );
}
