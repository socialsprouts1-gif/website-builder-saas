'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { createClient } from '@/lib/supabase/client';
import { formatRupees, parseRupees, toRupeeInput } from '@/lib/shop/money';
import { rejectReason } from '@/lib/attachments';
import type { Product } from '@/lib/shop/catalogue';

export interface ProductDraft {
  title: string;
  summary: string;
  description: string;
  price: string;
  compareAt: string;
  category: string;
  stock: string;
  images: string[];
  active: boolean;
}

export function draftOf(product: Product): ProductDraft {
  return {
    title: product.title,
    summary: product.summary ?? '',
    description: product.description ?? '',
    price: toRupeeInput(product.pricePaise),
    compareAt: product.compareAtPaise === null ? '' : toRupeeInput(product.compareAtPaise),
    category: product.category ?? '',
    stock: product.stock === null ? '' : String(product.stock),
    images: product.images,
    active: product.active,
  };
}

export const EMPTY_DRAFT: ProductDraft = {
  title: '',
  summary: '',
  description: '',
  price: '',
  compareAt: '',
  category: '',
  stock: '',
  images: [],
  active: true,
};

/**
 * One product, as the owner fills it in.
 *
 * Prices are typed the way prices are typed — 499, ₹1,299, 1,299.50 — and
 * turned into paise on the server, which is the only place that gets to decide
 * what anything costs. The stock box is deliberately allowed to be empty: most
 * small shops do not count stock, and a form that insists on a number would
 * take their products off their own website the moment they forgot to update
 * it.
 */
export function ProductEditor({
  projectId,
  draft,
  onChange,
  onSave,
  onCancel,
  onDelete,
  saving,
  categories,
}: {
  projectId: string;
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  categories: string[];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    onChange({ ...draft, [key]: value });

  /**
   * Pictures go straight to storage, never through the API.
   *
   * A serverless request body tops out well below a photograph from a phone,
   * so the route hands back a signed URL and the browser uploads to it — the
   * same path the chat attachments take.
   */
  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, 8)) {
        const reason = rejectReason(file);
        if (reason) throw new Error(reason);

        const response = await fetch(`/api/projects/${projectId}/assets/sign`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'That upload failed');

        const { error: uploadError } = await createClient()
          .storage.from(payload.bucket)
          .uploadToSignedUrl(payload.path, payload.token, file, { contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);

        added.push(payload.publicUrl);
      }
      onChange({ ...draft, images: [...draft.images, ...added].slice(0, 8) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="lumen-panel space-y-4 rounded-card border border-accent/25 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input
            value={draft.title}
            onChange={(event) => set('title', event.target.value)}
            placeholder="Banarasi silk saree"
          />
        </Field>

        <Field label="Price" hint="In rupees. 499, or 1299.50.">
          <Input
            value={draft.price}
            onChange={(event) => set('price', event.target.value)}
            inputMode="decimal"
            placeholder="499"
          />
        </Field>

        <Field label="Was (optional)" hint="Shown crossed out. Only if it is genuinely a reduction.">
          <Input
            value={draft.compareAt}
            onChange={(event) => set('compareAt', event.target.value)}
            inputMode="decimal"
            placeholder="799"
          />
        </Field>

        <Field label="Category" hint="Groups it on the shop page. Reuse the same words.">
          <Input
            value={draft.category}
            onChange={(event) => set('category', event.target.value)}
            list="lumen-shop-categories"
            placeholder="Sarees"
          />
          <datalist id="lumen-shop-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        <Field label="In stock (optional)" hint="Leave empty if you do not count stock.">
          <Input
            value={draft.stock}
            onChange={(event) => set('stock', event.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="12"
          />
        </Field>

        <Field label="One line for the card" className="sm:col-span-2">
          <Input
            value={draft.summary}
            onChange={(event) => set('summary', event.target.value)}
            placeholder="Hand-woven, pure silk, with a zari border"
          />
        </Field>

        <Field label="Full description" className="sm:col-span-2">
          <Textarea
            rows={4}
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="What it is made of, how it is made, how to care for it."
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-[12px] text-ink-secondary">
          Photographs {draft.images.length > 0 ? `(${draft.images.length})` : ''} — the first one is
          the picture on the shop page.
        </p>
        <div className="flex flex-wrap gap-2">
          {draft.images.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-20 w-20 rounded-[10px] border border-hairline object-cover"
              />
              {index === 0 ? (
                <Badge className="absolute left-1 top-1 px-1.5 py-0 text-[9px]">main</Badge>
              ) : null}
              <button
                type="button"
                onClick={() => set('images', draft.images.filter((item) => item !== url))}
                aria-label="Remove this photograph"
                className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-pill border border-hairline bg-raised text-[11px] leading-none text-ink-muted transition hover:text-ink-primary"
              >
                ×
              </button>
            </div>
          ))}

          <label
            className={cn(
              'flex h-20 w-20 cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-hairline text-center text-[11px] text-ink-muted transition hover:border-accent/40',
              uploading && 'opacity-50',
            )}
          >
            {uploading ? 'Uploading…' : '+ Photo'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3 py-2 text-[12.5px] text-[#e5735a]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        <Button onClick={onSave} disabled={saving || uploading || !draft.title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>

        <label className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => set('active', event.target.checked)}
          />
          On the site
        </label>

        {/* Read through the same parser the server uses, so what it says here
            is what the shop will charge — and so a price it cannot read says
            so now rather than being rejected on save. */}
        {draft.price ? (
          <span className="text-[12.5px] text-ink-muted">
            {parseRupees(draft.price) === null
              ? 'That price does not look right'
              : `Shows as ${formatRupees(parseRupees(draft.price)!)}`}
          </span>
        ) : null}

        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="ml-auto text-[12.5px] text-[#e5735a] transition hover:underline disabled:opacity-40"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
