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

/**
 * The origin a published link should be handed out on.
 *
 * It used to be `window.location.origin` — whatever host the owner happened to
 * be looking at. That is right on a preview deployment, where there is no other
 * address, and wrong everywhere else: an owner working on the apex got apex
 * links for every site they published, and if the apex is misconfigured then
 * every link they sent a customer was broken while the app in front of them
 * worked perfectly.
 *
 * So: the configured public address wins whenever there is one. A localhost or
 * an unset value is not an address anybody can visit, and falls back to where
 * the owner actually is.
 */
export function shareOrigin(canonical: string | null | undefined, current: string): string {
  const trimmed = canonical?.trim().replace(/\/+$/, '') ?? '';
  if (!trimmed) return current;
  if (!/^https:\/\//.test(trimmed)) return current;
  if (/^https:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(trimmed)) return current;
  return trimmed;
}
