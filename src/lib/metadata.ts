import type { Metadata } from 'next';
import { env } from './env';
import { INDUSTRIES } from './industries';
import { BLUEPRINTS } from './templates';
import { LEGAL_DOCUMENTS } from './legal';

/**
 * Every public page's address, stated once.
 *
 * Two things were wrong and both are invisible from inside the app. There was
 * no canonical URL anywhere, so the same page served from the apex, from www
 * and from a .vercel.app address was three pages competing with each other.
 * And `metadataBase` fell through to http://localhost:3000 whenever
 * NEXT_PUBLIC_SITE_URL was unset, which put localhost into every og:url a
 * crawler read.
 *
 * This module is the one place that knows what the public site consists of, so
 * the sitemap, robots.txt and the per-page tags cannot drift apart.
 */

export type ChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PublicPage {
  /** Rooted path, '' for the home page. Never a trailing slash. */
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
}

/**
 * Pages that exist for somebody mid-task, not for somebody searching.
 *
 * A "Session expired" page in a search result is a bad result for everyone, and
 * every one of these that gets indexed dilutes the pages that should be. They
 * stay reachable and stay crawlable — `follow`, not `noindex, nofollow` — they
 * just do not belong in the index.
 */
export const UNINDEXED_PAGES = [
  '/403',
  '/maintenance',
  '/offline',
  '/session-expired',
  '/onboarding',
  '/setup',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/billing/success',
  '/billing/failed',
  '/billing/pending',
  '/legal/cookie-preferences',
] as const;

/** Route prefixes robots.txt keeps crawlers out of entirely. */
export const DISALLOWED_PREFIXES = ['/app/', '/admin/', '/api/', '/preview/'] as const;

export function publicPages(): PublicPage[] {
  const pages: PublicPage[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/ideas', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/for', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/templates', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/showcase', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/signup', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/login', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/help', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/support', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/legal', priority: 0.4, changeFrequency: 'monthly' },
  ];

  // The pages that answer the question people actually type.
  for (const industry of INDUSTRIES) {
    pages.push({ path: `/for/${industry.slug}`, priority: 0.8, changeFrequency: 'monthly' });
  }

  // Every template has a page of its own, and each one is a page somebody
  // searching for "dental clinic website template" should be able to land on.
  for (const blueprint of BLUEPRINTS) {
    pages.push({ path: `/templates/${blueprint.id}`, priority: 0.6, changeFrequency: 'monthly' });
  }

  // Fifteen real documents. They rank for nothing, and they are a large part of
  // why a payment processor or an app store believes the business exists.
  for (const document of LEGAL_DOCUMENTS) {
    pages.push({ path: `/legal/${document.slug}`, priority: 0.3, changeFrequency: 'yearly' });
  }

  return pages;
}

/** An absolute URL on the one origin search engines should credit. */
export function canonicalUrl(path: string): string {
  const rooted = path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${env.canonicalOrigin}${rooted.replace(/\/+$/, '')}`;
}

export interface PageMetaInput {
  title: string;
  description: string;
  /** Rooted path this page is served at. '' for the home page. */
  path: string;
  /**
   * False for the pages in UNINDEXED_PAGES. A preview deployment overrides
   * this to false whatever the page says.
   */
  index?: boolean;
  /** Overrides the shared social image. */
  image?: string;
  /**
   * Skip the layout's "%s · Lumen" template. The home page already says Lumen
   * in its title; left to the template it would say it twice.
   */
  absoluteTitle?: boolean;
}

/**
 * Title, description, canonical and social tags for one page.
 *
 * The title is left as the bare page title so the root layout's template can
 * append "· Lumen" — repeating the brand inside the title as well gets it
 * rewritten by Google, which is how a carefully written title turns into
 * something nobody chose.
 */
export function pageMetadata(input: PageMetaInput): Metadata {
  const url = canonicalUrl(input.path);
  const index = env.indexable && input.index !== false;
  const image = input.image ?? '/lumen-mark.png';

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: {
      type: 'website',
      url,
      title: input.title,
      description: input.description,
      siteName: 'Lumen',
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary',
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

/** The same thing for a page that should never be indexed. */
export function unindexedMetadata(input: Omit<PageMetaInput, 'index'>): Metadata {
  return pageMetadata({ ...input, index: false });
}

/**
 * A page somebody is sent to, never one they search for.
 *
 * `follow: true` on purpose: the links out of a "signed out" or "payment
 * failed" screen go to real pages, and there is no reason to stop a crawler
 * using them. It is the page itself that does not belong in a result.
 */
export function noIndex(title: string): Metadata {
  return { title, robots: { index: false, follow: true } };
}
