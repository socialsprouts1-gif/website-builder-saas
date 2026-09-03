import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createVersion, getCurrentFiles } from '@/lib/generation/storage';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * "Use this as a starting point" — clones a template's seed project into a new
 * project the user owns. Templates are just seeded projects, so the clone then
 * goes through the same edit pipeline as anything else (spec Section 11).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);


    const admin = createAdminClient();
    const { data: template } = await admin
      .from('templates')
      .select('id, name, category, project_id')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (!template?.project_id) return jsonError('That template is not available.', 404);

    const { data: seed } = await admin
      .from('projects')
      .select('id, name, business_type, description, design_system, model')
      .eq('id', template.project_id)
      .maybeSingle();
    if (!seed) return jsonError('That template is not available.', 404);

    const files = await getCurrentFiles(seed.id);
    if (files.length === 0) return jsonError('That template has no content yet.', 409);

    const { data: project, error } = await admin
      .from('projects')
      .insert({
        user_id: user.id,
        name: seed.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        business_type: seed.business_type,
        description: seed.description,
        design_system: seed.design_system,
        model: seed.model,
        status: 'generating',
      })
      .select('id')
      .single();

    if (error || !project) return jsonError(error?.message ?? 'Could not start from that template', 500);

    await createVersion({ projectId: project.id, files, source: 'template', label: `v1 from ${template.name}` });

    await admin.from('chat_messages').insert({
      project_id: project.id,
      role: 'assistant',
      content: `Started from the ${template.name} template. Tell me what to change — the business name, the copy, the colours, anything.`,
    });

    return NextResponse.json({ projectId: project.id });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
