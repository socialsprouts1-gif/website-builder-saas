import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentFiles, getVersionFiles } from '@/lib/generation/storage';
import { normalizePath } from '@/lib/generation/parser';
import { EDITOR_BRIDGE } from '@/lib/generation/editor-bridge';
import { isSupabaseConfigured } from '@/lib/env';
import { selfOrigin } from '@/lib/self-origin';
import { pendingPage } from '@/lib/generation/kit/placeholder';

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
function previewCsp(origin: string): string {
  // The origin is named literally rather than written as 'self'.
  //
  // Because the iframe has no allow-same-origin, the document inside it runs
  // in an opaque origin, and 'self' resolves to *that* — matching nothing, not
  // even the deployment that served the page. Sites used to be one HTML file
  // with its CSS inline, so nothing noticed. They are a real stylesheet and a
  // real script now, and both were being blocked: the preview rendered as bare
  // black-on-white text and links while the same page opened in a tab looked
  // finished.
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${origin}`,
    `style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com`,
    'font-src https://fonts.gstatic.com data:',
    `img-src ${origin} https: data:`,
    "form-action 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
  ].join('; ');
}

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

  const origin = selfOrigin(request.headers, request.nextUrl.origin);

  if (!file) {
    // A page the nav links to but the build has not assembled yet. The owner is
    // watching their own site fill in, so say that, in the site's own styling.
    const wantsPage = !requested.includes('.') || requested.endsWith('.html');
    if (!wantsPage) return new Response('Not found', { status: 404 });

    const sheet = files.find((candidate) => candidate.path === 'styles.css');
    const hasHome = files.some((candidate) => candidate.path === 'index.html');

    return new Response(
      pendingPage({
        title: 'Still being written',
        label: 'Coming up',
        heading: 'This page is still being written',
        message:
          'The rest of the site is being assembled right now. Give it a moment and this page will be here.',
        homeHref: hasHome ? 'index.html' : undefined,
        css: sheet && !/<\/\s*style/i.test(sheet.content) ? sheet.content : null,
      }),
      {
        status: 404,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'content-security-policy': previewCsp(origin),
          'cache-control': 'no-store',
        },
      },
    );
  }

  const extension = file.path.split('.').pop() ?? 'txt';

  // Visual-edit mode injects the postMessage bridge. The iframe stays sandboxed
  // without allow-same-origin, so this is the only channel between the two.
  const editorMode = request.nextUrl.searchParams.get('editor') === '1';
  const html = extension === 'html' ? inlineAssets(file.content, files) : file.content;
  const body =
    editorMode && extension === 'html'
      ? html.includes('</body>')
        ? html.replace('</body>', `${EDITOR_BRIDGE}</body>`)
        : html + EDITOR_BRIDGE
      : html;

  return new Response(body, {
    headers: {
      'content-type': CONTENT_TYPES[extension] ?? 'text/plain; charset=utf-8',
      'content-security-policy': previewCsp(origin),
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'cache-control': 'no-store',
    },
  });
}

/**
 * Folds the site's stylesheet and script into the page before serving it.
 *
 * The preview iframe is sandboxed without allow-same-origin, which has two
 * consequences for anything the page loads for itself. Its origin is opaque, so
 * a CSP written with 'self' matches nothing; and its requests are not same-site,
 * so the session cookie this route authenticates with is not sent with them.
 * A separate styles.css therefore could not load under any policy, and the
 * preview rendered as unstyled text while the same page opened in a tab looked
 * finished. Inlining removes the subresource rather than trying to authorise it.
 *
 * Published sites at /s/<slug> are ordinary top-level pages and keep their real
 * stylesheet and script files.
 */
function inlineAssets(html: string, files: { path: string; content: string }[]): string {
  const asset = (path: string, closer: string) => {
    const content = files.find((file) => file.path === path)?.content;
    // A file that could close its own tag would break out of it. Ours never
    // does; anything that does keeps its <link> and simply does not apply.
    if (!content || new RegExp(`</\\s*${closer}`, 'i').test(content)) return null;
    return content;
  };

  let out = html;

  const css = asset('styles.css', 'style');
  if (css) {
    out = out.replace(
      /<link\b[^>]*href=["']\.?\/?styles\.css["'][^>]*>/i,
      `<style>\n${css}\n</style>`,
    );
  }

  const js = asset('script.js', 'script');
  if (js) {
    out = out.replace(
      /<script\b[^>]*src=["']\.?\/?script\.js["'][^>]*>\s*<\/script>/i,
      `<script>\n${js}\n</script>`,
    );
  }

  return out;
}
