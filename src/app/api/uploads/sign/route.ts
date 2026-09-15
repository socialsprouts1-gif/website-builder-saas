import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ASSET_BUCKET } from '@/lib/generation/storage';
import { kindForType, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/attachments';
import { RATE_LIMITS, rateLimitUser } from '@/lib/rate-limit';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(3).max(120),
  size: z.number().int().positive(),
});

/**
 * An upload URL for a file that has no project yet.
 *
 * A logo or a photograph handed over on the new-site screen has to reach
 * storage before the project exists, because the brief that starts the build
 * has to be able to name it. The bytes land under the caller's own staging
 * folder and the resulting public URL is passed to project creation, which
 * folds it into the brief.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const limit = await rateLimitUser(
      user.id,
      `uploads:${user.id}`,
      RATE_LIMITS.chatEdit.limit,
      RATE_LIMITS.chatEdit.windowSeconds,
    );
    if (!limit.allowed) return jsonError('Too many uploads in a row. Give it a minute.', 429);

    const body = bodySchema.parse(await request.json());

    const kind = kindForType(body.contentType);
    if (!kind) return jsonError('Images and videos only.', 415);

    const cap = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (body.size > cap) {
      return jsonError(
        `${kind === 'image' ? 'Images' : 'Videos'} must be under ${Math.round(cap / (1024 * 1024))}MB.`,
        413,
      );
    }

    // The name is only ever a suffix on a path composed here, so it cannot
    // climb out of this caller's own folder.
    const safeName = body.fileName.replace(/[^\w.-]+/g, '-').slice(-80) || kind;
    const path = `staging/${user.id}/${Date.now()}-${safeName}`;

    const storage = createAdminClient().storage.from(ASSET_BUCKET);
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return jsonError(error?.message ?? 'Could not prepare the upload', 502);

    return NextResponse.json({
      bucket: ASSET_BUCKET,
      path: data.path,
      token: data.token,
      publicUrl: storage.getPublicUrl(path).data.publicUrl,
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
