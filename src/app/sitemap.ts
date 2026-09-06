import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/how-it-works', '/ideas', '/showcase', '/templates', '/pricing', '/login', '/signup'];
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${env.siteUrl}${route}`,
    lastModified,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
