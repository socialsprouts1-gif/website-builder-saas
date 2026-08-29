'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { CodeWindow } from '@/components/ui/CodeWindow';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/lib/categories';

export interface TemplateCard {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  projectId: string | null;
}

export function TemplateGallery({ templates, signedIn }: { templates: TemplateCard[]; signedIn: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = filter ? templates.filter((template) => template.category === filter) : templates;

  async function use(slug: string) {
    if (!signedIn) {
      router.push(`/signup?next=${encodeURIComponent('/templates')}`);
      return;
    }
    setBusy(slug);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${slug}/use`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not start from that template');
      router.push(`/app/project/${payload.projectId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start from that template');
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-center gap-2">
        <CategoryChip label="All" active={filter === null} onClick={() => setFilter(null)} />
        {CATEGORIES.map((category) => (
          <CategoryChip
            key={category.slug}
            label={category.label}
            active={filter === category.slug}
            onClick={() => setFilter(filter === category.slug ? null : category.slug)}
          />
        ))}
      </div>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-4 py-3 text-center text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyGallery filter={filter} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <div key={template.slug} className="space-y-3">
              <CodeWindow title={`LUMEN / ${template.name.toUpperCase()}`}>
                {template.projectId ? (
                  <iframe
                    src={`/preview/${template.projectId}/index.html`}
                    title={template.name}
                    loading="lazy"
                    sandbox="allow-scripts"
                    tabIndex={-1}
                    className="pointer-events-none h-[520px] w-[1000px] origin-top-left scale-[0.36] border-0 bg-white"
                    style={{ height: 520, marginBottom: -520 * (1 - 0.36) }}
                  />
                ) : (
                  <div className="flex h-[190px] items-center justify-center text-[12px] text-ink-muted">
                    Preview coming soon
                  </div>
                )}
              </CodeWindow>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-primary">{template.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-muted">
                    {template.description ?? template.category}
                  </p>
                </div>
                <Button size="sm" onClick={() => use(template.slug)} disabled={busy !== null}>
                  {busy === template.slug ? 'Copying…' : 'Use this'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyGallery({ filter }: { filter: string | null }) {
  const router = useRouter();
  const category = CATEGORIES.find((item) => item.slug === filter);

  return (
    <div className="rounded-card border border-dashed border-hairline px-6 py-14 text-center">
      <h2 className="font-display text-xl text-ink-primary">
        {category ? `No ${category.label.toLowerCase()} template yet` : 'Templates are on the way'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
        You do not need one. Describe your business in a sentence and Lumen writes a site from scratch — that
        is the whole point.
      </p>
      <div className="mt-6">
        <Button
          onClick={() =>
            router.push(category ? `/app/new?category=${category.slug}` : '/app/new')
          }
        >
          {category ? `Generate a ${category.label.toLowerCase()} site →` : 'Start from a prompt →'}
        </Button>
      </div>
    </div>
  );
}
