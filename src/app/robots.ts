import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The app shell, the generated-site preview and every API surface are
      // per-user and have no business in an index.
      disallow: ['/app/', '/admin/', '/api/', '/preview/'],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
