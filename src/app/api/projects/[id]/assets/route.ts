import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadAsset } from '@/lib/generation/storage';
import { handleRouteError, jsonError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Favicons are still handed over as .ico more often than not.
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

/**
 * Upload an image into the project's asset bucket and hand back a public URL
 * the editor can drop straight into an <img src>.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this select to the caller, so a hit proves ownership.
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('No file received', 422);
    if (file.size === 0) return jsonError('That file is empty', 422);
    if (file.size > MAX_BYTES) return jsonError('Images must be under 8MB', 413);
    if (!ALLOWED.has(file.type)) return jsonError('PNG, JPG, WebP, GIF or SVG only', 415);

    const safeName = file.name.replace(/[^\w.-]+/g, '-').slice(-80) || 'image';
    const url = await uploadAsset({
      projectId,
      fileName: safeName,
      body: await file.arrayBuffer(),
      contentType: file.type,
    });

    // A favicon is an asset that the project also remembers, so published
    // pages can carry it without rebuilding the site.
    if (form.get('kind') === 'favicon') {
      await createAdminClient().from('projects').update({ favicon_url: url }).eq('id', projectId);
    }

    return NextResponse.json({ url, name: safeName });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
