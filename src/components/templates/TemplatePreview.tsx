'use client';

import { useState } from 'react';
import { cn } from '@/components/ui/cn';

const DEVICES = {
  desktop: { label: 'Desktop', width: 1280, scale: 1 },
  tablet: { label: 'Tablet', width: 834, scale: 1 },
  mobile: { label: 'Mobile', width: 390, scale: 1 },
} as const;

type Device = keyof typeof DEVICES;

/**
 * The template, at three widths, before anybody spends a credit.
 *
 * A real iframe of the real renderer rather than three screenshots — the
 * template cannot drift from its own preview, and the responsive behaviour on
 * show is the responsive behaviour you get. Sandboxed without
 * `allow-same-origin`, the same as every other generated page in this product.
 */
export function TemplatePreview({
  id,
  pages,
}: {
  id: string;
  pages: { path: string; title: string }[];
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const [path, setPath] = useState(pages[0]?.path ?? 'index.html');
  const frame = DEVICES[device];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-pill border border-hairline p-0.5" role="group" aria-label="Preview width">
          {(Object.keys(DEVICES) as Device[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDevice(option)}
              aria-pressed={device === option}
              className={cn(
                'rounded-pill px-3.5 py-1.5 text-[12.5px] transition',
                device === option ? 'bg-white/10 text-ink-primary' : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {DEVICES[option].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {pages.map((page) => (
            <button
              key={page.path}
              type="button"
              onClick={() => setPath(page.path)}
              aria-pressed={path === page.path}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-[12px] transition',
                path === page.path
                  ? 'border-accent/60 bg-accent-soft text-ink-primary'
                  : 'border-hairline text-ink-secondary hover:border-white/25',
              )}
            >
              {page.title}
            </button>
          ))}
        </div>

        <a
          href={`/api/blueprints/${id}/${path}`}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto text-[12.5px] text-accent hover:underline"
        >
          Open full size ↗
        </a>
      </div>

      <div className="overflow-x-auto rounded-card border border-hairline bg-[var(--bg-base-deep)] p-4">
        <div className="mx-auto transition-[width] duration-300" style={{ width: frame.width, maxWidth: '100%' }}>
          <iframe
            key={`${device}-${path}`}
            src={`/api/blueprints/${id}/${path}`}
            title={`Preview at ${frame.label.toLowerCase()} width`}
            sandbox="allow-scripts"
            className="h-[70vh] min-h-[520px] w-full rounded-[10px] border border-hairline bg-white"
          />
        </div>
      </div>
    </div>
  );
}
