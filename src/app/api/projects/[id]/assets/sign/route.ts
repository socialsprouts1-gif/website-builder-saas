import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSET_BUCKET } from "@/lib/generation/storage";
import {
  kindForType,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/attachments";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(3).max(120),
  size: z.number().int().positive(),
});

/**
 * A one-shot upload URL, so the file goes straight to storage.
 *
 * Not through this route. A serverless function tops out at a few megabytes of
 * request body, which an image from a phone already exceeds and a video exceeds
 * many times over — posting the bytes here would fail at the platform edge,
 * before any of this code ran. The browser gets a signed URL scoped to one path
 * in the project's own folder and uploads to storage directly; the checks that
 * matter (who is asking, what type, how big) all still happen here first.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Sign in first", 401);

    // RLS scopes this select to the caller, so a hit proves ownership.
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) return jsonError("Project not found", 404);

    const body = bodySchema.parse(await request.json());

    const kind = kindForType(body.contentType);
    if (!kind) return jsonError("Images and videos only.", 415);

    const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (body.size > limit) {
      return jsonError(
        `${kind === "image" ? "Images" : "Videos"} must be under ${Math.round(limit / (1024 * 1024))}MB.`,
        413,
      );
    }

    // The name is only ever a suffix on a path this route composes, so it
    // cannot climb out of the project's folder.
    const safeName = body.fileName.replace(/[^\w.-]+/g, "-").slice(-80) || kind;
    const path = `${projectId}/${Date.now()}-${safeName}`;

    const storage = createAdminClient().storage.from(ASSET_BUCKET);
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data)
      return jsonError(error?.message ?? "Could not prepare the upload", 502);

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
