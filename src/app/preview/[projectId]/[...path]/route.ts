import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles, getVersionFiles } from '@/lib/generation/storage';
import { normalizePath } from '@/lib/generation/parser';
import { EDITOR_BRIDGE } from '@/lib/generation/editor-bridge';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  webmanifest: 'application/manifest+json',
};

/**
 * Serves generated site files for the in-app preview.
 *
 * Generated code is treated as untrusted output (spec Section 16). It is always
 * rendered inside an iframe with `sandbox="allow-scripts"` and no
 * `allow-same-origin`, so it executes in an opaque origin with no access to
 * Lumen's cookies or DOM. The CSP below is a second, independent barrier:
 * no network egress except images, no framing by other origins.
 */
const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'self'",
  "style-src 'unsafe-inline' 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  "img-src 'self' https: data:",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join('; ');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; path: string[] }> },
) {
  if (!isSupabaseConfigured) return new Response('Not found', { status: 404 });

  const { projectId, path } = await context.params;
  const requested = normalizePath(path.join('/')) ?? 'index.html';

  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('id, user_id, is_template')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return new Response('Not found', { status: 404 });

  if (!project.is_template) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== project.user_id) return new Response('Not found', { status: 404 });
  }

  const versionId = request.nextUrl.searchParams.get('version');
  const files = versionId ? await getVersionFiles(versionId) : await getCurrentFiles(projectId);

  const file =
    files.find((candidate) => candidate.path === requested) ??
    (requested.endsWith('/') || !requested.includes('.')
      ? files.find((candidate) => candidate.path === `${requested.replace(/\/$/, '')}.html`)
      : undefined);

  if (!file) {
    return new Response(notFoundPage(requested), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const extension = file.path.split('.').pop() ?? 'txt';

  // Visual-edit mode injects the postMessage bridge. The iframe stays sandboxed
  // without allow-same-origin, so this is the only channel between the two.
  const editorMode = request.nextUrl.searchParams.get('editor') === '1';
  const body =
    editorMode && extension === 'html'
      ? file.content.includes('</body>')
        ? file.content.replace('</body>', `${EDITOR_BRIDGE}</body>`)
        : file.content + EDITOR_BRIDGE
      : file.content;

  return new Response(body, {
    headers: {
      'content-type': CONTENT_TYPES[extension] ?? 'text/plain; charset=utf-8',
      'content-security-policy': PREVIEW_CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'cache-control': 'no-store',
    },
  });
}

function notFoundPage(path: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Not generated</title>
<style>body{font:14px/1.6 system-ui;background:#0a0a08;color:#9c9c93;display:grid;place-items:center;height:100vh;margin:0}
code{color:#d7ff3e}</style></head>
<body><p><code>${escapeHtml(path)}</code> is not part of this site yet.</p></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[character];
  });
}
