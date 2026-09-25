import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A payment window is somebody else's code running while a customer types a
 * card number, so the hosts that may serve it are named rather than opened up.
 *
 * Read as source because the policy is assembled in a route handler: what
 * matters is the shape of the rule — that the default stays closed, that the
 * gateway is allowed by name, and that no wildcard crept in next to it.
 */
const published = readFileSync(join(process.cwd(), 'src/app/s/[slug]/[[...path]]/route.ts'), 'utf8');
const preview = readFileSync(
  join(process.cwd(), 'src/app/preview/[projectId]/[...path]/route.ts'),
  'utf8',
);

describe('a published site that takes no payments', () => {
  it('keeps scripts to itself', () => {
    expect(published).toContain(`"script-src 'self'"`);
  });

  it('is served the closed policy unless the shop has a gateway', () => {
    expect(published).toContain('if (!options.payments) return HTML_CSP;');
    expect(published).toContain('shop?.enabled ? Boolean(await shopPaymentKeys(project.id)) : false');
  });
});

describe('the gateway hosts', () => {
  it('are named, never wildcarded', () => {
    for (const source of [published, preview]) {
      expect(source).toContain('https://checkout.razorpay.com');
      expect(source).not.toMatch(/script-src[^;'"`]*\*\.razorpay/);
      expect(source).not.toMatch(/script-src[^;'"`]*'unsafe-eval'/);
    }
  });

  it('let the payment window talk back to its own API and frame itself', () => {
    for (const source of [published, preview]) {
      expect(source).toContain('https://api.razorpay.com');
    }
  });

  it('never open the published policy to inline script', () => {
    // The preview is an opaque-origin iframe of the owner's own site and has
    // always needed inline; a published page must not.
    const csp = published.slice(published.indexOf('const HTML_CSP = ['));
    expect(csp).not.toContain("'unsafe-inline'; script");
    expect(csp).toContain(`"script-src 'self'"`);
  });
});
