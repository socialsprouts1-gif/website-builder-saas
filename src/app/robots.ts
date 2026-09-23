import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { DISALLOWED_PREFIXES, canonicalUrl } from '@/lib/metadata';

export default function robots(): MetadataRoute.Robots {
  // Vercel gives every branch and every commit its own public URL. Indexed,
  // those are duplicates of the real site that compete with it, so only the
  // production deployment invites a crawler in.
  if (!env.indexable) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The app shell, the generated-site preview and every API surface are
      // per-user and have no business in an index.
      disallow: [...DISALLOWED_PREFIXES],
    },
    sitemap: canonicalUrl('/sitemap.xml'),
    host: env.canonicalOrigin,
  };
}
