import { describe, expect, it } from 'vitest';
import { INDUSTRIES } from './industries';
import { canonicalUrl } from './metadata';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  jsonLdText,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from './structured-data';

describe('the markup that says which Lumen this is', () => {
  it('names the organisation, its logo and its address', () => {
    const data = organizationJsonLd();
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBe('Lumen');
    expect(String(data.logo)).toMatch(/^https?:\/\/.+\.png$/);
    expect(data.url).toBe(canonicalUrl(''));
  });

  it('ties the site to the organisation rather than declaring it twice', () => {
    expect(webSiteJsonLd().publisher).toEqual({ '@id': organizationJsonLd()['@id'] });
  });

  it('prices the product in rupees, not in paise', () => {
    const offers = softwareApplicationJsonLd().offers as Record<string, unknown>;
    expect(offers.price).toBe('500');
    expect(offers.priceCurrency).toBe('INR');
  });

  /**
   * Inventing these is the main way this markup gets a site a manual action,
   * so the absence is the thing worth asserting.
   */
  it('claims no rating and no review count', () => {
    const text = JSON.stringify(softwareApplicationJsonLd());
    expect(text).not.toContain('aggregateRating');
    expect(text).not.toContain('reviewCount');
  });
});

describe('faqJsonLd', () => {
  it('carries each question with its answer', () => {
    const data = faqJsonLd([{ question: 'Does it?', answer: 'Yes.' }]);
    expect(data.mainEntity).toEqual([
      { '@type': 'Question', name: 'Does it?', acceptedAnswer: { '@type': 'Answer', text: 'Yes.' } },
    ]);
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the trail from one and makes every item absolute', () => {
    const data = breadcrumbJsonLd([
      { name: 'Lumen', path: '' },
      { name: 'By trade', path: '/for' },
    ]);
    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items.map((item) => item.position)).toEqual([1, 2]);
    expect(items[1].item).toBe(canonicalUrl('/for'));
  });
});

describe('jsonLdText', () => {
  /**
   * A business name is user input on the generated-site side of this codebase,
   * and this helper is one import away from it.
   */
  it('cannot close the script tag it is written into', () => {
    const text = jsonLdText({ name: '</script><img src=x onerror=alert(1)>' });
    expect(text).not.toContain('</script>');
    expect(text).not.toContain('<img');
  });
});

describe('the per-trade FAQs', () => {
  it('are not the same three questions with the noun swapped', () => {
    const questions = INDUSTRIES.flatMap((industry) => industry.faqs.map((faq) => faq.question));
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('answer at length enough to be worth indexing', () => {
    for (const industry of INDUSTRIES) {
      expect(industry.faqs.length, industry.slug).toBeGreaterThanOrEqual(3);
      for (const faq of industry.faqs) {
        expect(faq.answer.length, `${industry.slug}: ${faq.question}`).toBeGreaterThan(80);
      }
    }
  });
});
