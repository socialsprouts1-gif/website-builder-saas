'use client';

import { useRef } from 'react';
import { acceptFor } from '@/lib/attachments';
import type { PromptAttachment } from '@/components/ui/PromptBar';
import { cn } from '@/components/ui/cn';

/**
 * "Do you have a logo and some photos?", as a control rather than a sentence.
 *
 * The same uploading the + menu does, in the two places where being asked is
 * better than having to think of it: the questions before a build, and the
 * panel that appears once the site is there. It owns no uploading of its own —
 * the page it sits on already knows where the bytes go.
 */
export function MediaDrop({
  attachments,
  onAttachFiles,
  onRemove,
  compact = false,
}: {
  attachments: PromptAttachment[];
  onAttachFiles: (kind: 'logo' | 'image', files: File[]) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}) {
  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const shown = attachments.filter((item) => item.kind === 'logo' || item.kind === 'image');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => logoInput.current?.click()}
          className="lumen-raise rounded-pill border border-hairline px-3.5 py-2 text-[12.5px] text-ink-secondary transition hover:border-accent/45 hover:text-ink-primary"
        >
          ✦ Upload logo
        </button>
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          className="lumen-raise rounded-pill border border-hairline px-3.5 py-2 text-[12.5px] text-ink-secondary transition hover:border-accent/45 hover:text-ink-primary"
        >
          🖼 Upload photos
        </button>

        <input
          ref={logoInput}
          type="file"
          accept={acceptFor('logo')}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) onAttachFiles('logo', files);
            event.target.value = '';
          }}
        />
        <input
          ref={photoInput}
          type="file"
          multiple
          accept={acceptFor('image')}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) onAttachFiles('image', files);
            event.target.value = '';
          }}
        />
      </div>

      {shown.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {shown.map((item) => (
            <li
              key={item.id}
              className={cn(
                'relative overflow-hidden rounded-[10px] border',
                item.error ? 'border-[#e5735a]/40' : 'border-hairline',
                compact ? 'h-14 w-14' : 'h-16 w-16',
              )}
              title={item.error ?? item.label}
            >
              {item.url && !item.error ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-raised px-1 text-center text-[9.5px] leading-tight text-ink-muted">
                  {item.error ? 'failed' : 'uploading…'}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.label}`}
                className="absolute right-0 top-0 bg-black/65 px-1.5 text-[11px] leading-5 text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
