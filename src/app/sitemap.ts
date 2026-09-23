import type { MetadataRoute } from 'next';
import { canonicalUrl, publicPages } from '@/lib/metadata';

/**
 * Every page worth indexing, as the one file a search engine asks for first.
 *
 * It used to list eight URLs and knew nothing about the legal library, the help
 * and support pages or the per-industry pages — so the only way Google could
 * find them was by following a link, and on a domain with no inbound links
 * there is nothing to follow from.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicPages().map((page) => ({
    url: canonicalUrl(page.path),
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
