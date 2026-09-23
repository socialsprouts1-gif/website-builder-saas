import { PLAN_PRICE_LABEL, PLAN_PRICE_PAISE } from './env';
import { canonicalUrl } from './metadata';

/**
 * What Lumen is, in the vocabulary a search engine reads.
 *
 * The AI Overview for "lumensite.in" said there was no site matching the
 * address and offered four unrelated companies called Lumen. Part of that is a
 * new domain nobody has linked to, and part of it is that the pages said
 * nothing machine-readable about who they belong to: no Organization, no name,
 * no logo, no "this is a product and here is what it costs". Structured data
 * does not make a site rank, but it is how a search engine tells one Lumen from
 * another, and it is the difference between a bare blue link and a result with
 * the mark next to it.
 *
 * Everything here describes something true. Invented ratings and fake review
 * counts are a manual-action risk and are the main way this markup gets abused.
 */

export const ORGANIZATION_ID = '#organization';
export const WEBSITE_ID = '#website';

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': canonicalUrl(`/${ORGANIZATION_ID}`),
    name: 'Lumen',
    url: canonicalUrl(''),
    logo: canonicalUrl('/lumen-mark.png'),
    description:
      'Lumen builds a complete website from a sentence — design system, copy, pages, shop and deploy — and edits it back in chat.',
    foundingDate: '2025',
    areaServed: 'IN',
    knowsLanguage: ['en', 'hi', 'mr'],
  };
}

export function webSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': canonicalUrl(`/${WEBSITE_ID}`),
    name: 'Lumen',
    url: canonicalUrl(''),
    publisher: { '@id': canonicalUrl(`/${ORGANIZATION_ID}`) },
    inLanguage: 'en',
  };
}

/**
 * The product itself, with the real price.
 *
 * `price` is in rupees rather than the paise the payment code works in, because
 * this field is read by a machine that will print it to a person.
 */
export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Lumen',
    url: canonicalUrl(''),
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    description:
      'An AI website builder for small businesses: describe the business in a sentence and Lumen writes the design system, the copy, every page, an online shop if you need one, and publishes it.',
    publisher: { '@id': canonicalUrl(`/${ORGANIZATION_ID}`) },
    offers: {
      '@type': 'Offer',
      price: String(PLAN_PRICE_PAISE / 100),
      priceCurrency: 'INR',
      description: `${PLAN_PRICE_LABEL} a month, with a free tier that builds a site without a card.`,
      url: canonicalUrl('/pricing'),
      availability: 'https://schema.org/InStock',
    },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

/**
 * JSON-LD, safe to drop into a <script> tag.
 *
 * `<` and `>` are escaped because a description containing `</script>` would
 * otherwise close the tag it is being written into and turn the rest of the
 * page into executable markup. Everything here is written by us today, but the
 * day somebody passes a business name through is the day that stops being true.
 */
export function jsonLdText(data: Record<string, unknown> | Record<string, unknown>[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
