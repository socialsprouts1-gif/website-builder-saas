'use client';

import { useMemo, useState } from 'react';
import type { PromptAttachment } from '@/components/ui/PromptBar';
import { createClient } from '@/lib/supabase/client';
import { normaliseReference, referenceLabel, rejectReason } from '@/lib/attachments';

export interface UploadedAssets {
  logoUrl: string | null;
  imageUrls: string[];
  videoUrls: string[];
  referenceUrls: string[];
}

/**
 * A logo and some photographs, uploaded before the project exists.
 *
 * It has to be this way round: the brief that starts the build has to be able
 * to name the files, and the brief is fixed the moment the job is queued. The
 * bytes go straight to storage from the browser — they are far too big for a
 * serverless request body — and only the resulting links are sent on.
 *
 * Shared because both ways into a build need it and the uploading is identical:
 * the prompt screen's attach menu, and the template interview's "do you have a
 * logo?" step.
 */
export function useUploads() {
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);

  async function attachFiles(kind: 'logo' | 'image' | 'video', files: File[]) {
    for (const file of files) {
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const reason = rejectReason(file);

      setAttachments((current) => [
        // Only ever one logo: a second replaces the first.
        ...(kind === 'logo' ? current.filter((item) => item.kind !== 'logo') : current),
        { id, kind, label: file.name, url: null, ...(reason ? { error: reason } : {}) },
      ]);
      if (reason) continue;

      try {
        const response = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Upload failed');

        const { error: uploadError } = await createClient()
          .storage.from(payload.bucket)
          .uploadToSignedUrl(payload.path, payload.token, file, { contentType: file.type });
        if (uploadError) throw new Error(uploadError.message);

        setAttachments((current) =>
          current.map((item) => (item.id === id ? { ...item, url: payload.publicUrl } : item)),
        );
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Upload failed';
        setAttachments((current) =>
          current.map((item) => (item.id === id ? { ...item, error: message } : item)),
        );
      }
    }
  }

  /** A site to take the look from. Returns false when it is not an address. */
  function attachReference(raw: string): boolean {
    const url = normaliseReference(raw);
    if (!url) return false;
    setAttachments((current) => [
      ...current,
      { id: `ref-${Date.now()}`, kind: 'reference', label: referenceLabel(url), url },
    ]);
    return true;
  }

  function remove(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  // Only what finished uploading. A half-uploaded file named in the brief is a
  // broken image on somebody's home page.
  const assets = useMemo<UploadedAssets>(() => {
    const ready = attachments.filter((item) => item.url && !item.error);
    return {
      logoUrl: ready.find((item) => item.kind === 'logo')?.url ?? null,
      imageUrls: ready.filter((item) => item.kind === 'image').map((item) => item.url!),
      videoUrls: ready.filter((item) => item.kind === 'video').map((item) => item.url!),
      referenceUrls: ready.filter((item) => item.kind === 'reference').map((item) => item.url!),
    };
  }, [attachments]);

  return { attachments, attachFiles, attachReference, remove, assets };
}
