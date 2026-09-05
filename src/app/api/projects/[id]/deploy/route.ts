import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFiles } from '@/lib/generation/storage';
import { loadAccountContext } from '@/lib/connectors/registry';
import { deploySchema } from '@/lib/validation';
import { createZip } from '@/lib/zip';
import { deployFiles } from '@/lib/vercel';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Ship it: Vercel, a GitHub repo, or a zip. The generated site is plain static
 * files, so all three targets are a straight upload with no build step.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    const { data: project } = await supabase
      .from('projects')
      .select('id, name, slug, status')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) return jsonError('Project not found', 404);
    if (project.status !== 'ready') return jsonError('Generate the site before deploying it.', 409);

    const body = deploySchema.parse(await request.json());
    const files = await getCurrentFiles(projectId);
    if (files.length === 0) return jsonError('This project has no files to deploy.', 409);

    const repoName = sanitizeRepoName(body.repoName ?? project.name ?? project.slug);

    if (body.target === 'zip') {
      const zip = createZip(files);
      return new Response(new Uint8Array(zip), {
        headers: {
          'content-type': 'application/zip',
          'content-disposition': `attachment; filename="${repoName}.zip"`,
          'content-length': String(zip.length),
        },
      });
    }

    if (body.target === 'vercel') {
      const { credentials } = await loadAccountContext(user.id, 'vercel');
      if (!credentials?.access_token) {
        return jsonError('Connect Vercel in Settings → Connectors first.', 409);
      }

      const result = await deployFiles({
        token: credentials.access_token,
        name: repoName,
        files,
      });
      if (!result.ok) return jsonError(result.error, 422);

      await createAdminClient()
        .from('projects')
        .update({
          vercel_project_id: result.data.projectId,
          vercel_project_name: result.data.projectName,
          deploy_url: result.data.url,
        })
        .eq('id', projectId);

      return NextResponse.json({ url: result.data.url, canAddDomain: Boolean(result.data.projectId) });
    }

    // GitHub: create the repo if needed, then write every file into it.
    const { credentials } = await loadAccountContext(user.id, 'github');
    if (!credentials?.access_token) {
      return jsonError('Connect GitHub in Settings → Connectors first.', 409);
    }

    const headers = {
      authorization: `Bearer ${credentials.access_token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    };

    const userResponse = await fetch('https://api.github.com/user', { headers });
    if (!userResponse.ok) return jsonError('GitHub rejected your connection. Reconnect it.', 422);
    const githubUser = (await userResponse.json()) as { login: string };

    const createResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repoName,
        description: `${project.name} — built with Lumen`,
        private: true,
        auto_init: true,
      }),
    });

    // 422 here means the repo already exists, which is fine — we write into it.
    if (!createResponse.ok && createResponse.status !== 422) {
      return jsonError('Could not create that repository.', 422);
    }

    for (const file of files) {
      const contentsUrl = `https://api.github.com/repos/${githubUser.login}/${repoName}/contents/${file.path}`;
      const existing = await fetch(contentsUrl, { headers });
      const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined;

      await fetch(contentsUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Lumen: update ${file.path}`,
          content: Buffer.from(file.content, 'utf8').toString('base64'),
          ...(sha ? { sha } : {}),
        }),
      });
    }

    return NextResponse.json({ url: `https://github.com/${githubUser.login}/${repoName}` });
  } catch (cause) {
    return handleRouteError(cause);
  }
}

function sanitizeRepoName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return cleaned || 'lumen-site';
}
