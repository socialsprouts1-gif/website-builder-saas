/**
 * Public addresses for published sites.
 *
 * A slug ends up in a URL a business owner reads out over the phone, so it is
 * lowercase, hyphenated and short, and it never collides with a real route.
 */

export function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

/** Reserved because they are, or will be, real routes on this domain. */
export const RESERVED_SLUGS = new Set([
  'app', 'api', 'admin', 'login', 'signup', 'pricing', 'templates', 'ideas',
  'showcase', 'setup', 'preview', 's', 'auth', 'www', 'help', 'docs', 'blog',
]);

export function baseSlug(value: string): string {
  const slug = normaliseSlug(value);
  if (!slug) return '';
  return RESERVED_SLUGS.has(slug) ? `${slug}-site` : slug;
}

/** The nth candidate for an address, when earlier ones are taken. */
export function slugCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt + 1}`;
}

export function publicUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/s/${slug}`;
}
