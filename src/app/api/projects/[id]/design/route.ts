import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles, createVersion } from '@/lib/generation/storage';
import { renderStylesheet } from '@/lib/generation/kit/stylesheet';
import { normaliseTokens } from '@/lib/generation/kit/tokens';
import { designVariants, variantById } from '@/lib/generation/kit/variants';
import { withFontLink } from '@/lib/generation/kit/fonts-head';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

const bodySchema = z.object({ variantId: z.enum(['soft', 'sharp', 'warm']) });

/**
 * Switching the site to a different look.
 *
 * One file. The design lives in the tokens and the words live in the sections,
 * so a variant rewrites styles.css and nothing else — which is why this is
 * instant, why it cannot damage anyone's content, and why it undoes cleanly
 * from version history.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const { data: project } = await supabase
      .from('projects')
      .select('id, design_system')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const tokens = normaliseTokens(project.design_system);
    return NextResponse.json({
      variants: designVariants(tokens).map((variant) => ({
        id: variant.id,
        name: variant.name,
        note: variant.note,
        // Enough to draw a swatch without shipping the whole token set.
        swatch: {
          bg: variant.tokens.palette.bg,
          surface: variant.tokens.palette.surface,
          ink: variant.tokens.palette.ink,
          accent: variant.tokens.palette.accent,
          radius: variant.tokens.radius,
        },
      })),
    });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase
      .from('projects')
      .select('id, design_system')
      .eq('id', id)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const { variantId } = bodySchema.parse(await request.json());
    const variant = variantById(normaliseTokens(project.design_system), variantId);
    if (!variant) return jsonError('No such look', 422);

    const files = await getCurrentFiles(id);
    if (files.length === 0) return jsonError('This site has not been built yet.', 409);

    const stylesheet = renderStylesheet(variant.tokens);
    const next = files.some((file) => file.path === 'styles.css')
      ? files.map((file) => (file.path === 'styles.css' ? { ...file, content: stylesheet } : file))
      : [...files, { path: 'styles.css', content: stylesheet }];

    // A look can change the typeface, and the link that loads it lives in each
    // page's head rather than in the stylesheet.
    const withFonts = next.map((file) =>
      file.path.endsWith('.html')
        ? { ...file, content: withFontLink(file.content, variant.tokens.fonts.googleHref) }
        : file,
    );

    const version = await createVersion({
      projectId: id,
      files: withFonts,
      source: 'visual_edit',
      label: `Look: ${variant.name}`,
      designSystem: variant.tokens as never,
    });

    // Remembered on the project too, so the next variant is derived from the
    // look the site actually has rather than from the one it was born with.
    await createAdminClient()
      .from('projects')
      .update({ design_system: variant.tokens as never })
      .eq('id', id);

    return NextResponse.json({ ok: true, versionId: version.id, name: variant.name });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
