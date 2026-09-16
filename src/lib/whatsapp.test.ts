import { describe, expect, it } from 'vitest';
import { normaliseWhatsApp, whatsappHref, withWhatsApp } from './whatsapp';

describe('normaliseWhatsApp', () => {
  // A number that cannot be dialled becomes a button that opens a chat with
  // nobody, which is worse than no button at all.
  it('reads ten digits as an Indian mobile', () => {
    expect(normaliseWhatsApp('98765 43210')).toBe('919876543210');
    expect(normaliseWhatsApp('098765 43210')).toBe('919876543210');
  });

  it('leaves a number that already has its country code', () => {
    expect(normaliseWhatsApp('+91 98765 43210')).toBe('919876543210');
    expect(normaliseWhatsApp('+44 7700 900123')).toBe('447700900123');
  });

  it.each(['12345', '1234567890123456789', '', 'call me'])('refuses %j', (input) => {
    expect(normaliseWhatsApp(input)).toBeNull();
  });
});

describe('whatsappHref', () => {
  it('carries the first message, encoded', () => {
    expect(whatsappHref('919876543210', 'Hi there & thanks')).toContain('Hi%20there%20%26%20thanks');
  });

  it('has no query when there is no message', () => {
    expect(whatsappHref('919876543210', null)).not.toContain('?');
  });
});

describe('withWhatsApp', () => {
  const page = '<html><body><main></main></body></html>';

  it('adds a button that opens a chat', () => {
    const out = withWhatsApp(page, '919876543210', 'Hi');
    expect(out).toContain('data-lumen-whatsapp');
    expect(out).toContain('https://wa.me/919876543210');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('adds nothing twice', () => {
    const once = withWhatsApp(page, '919876543210', 'Hi');
    expect(withWhatsApp(once, '919876543210', 'Hi')).toBe(once);
  });

  it('adds nothing at all without a number', () => {
    expect(withWhatsApp(page, null, 'Hi')).toBe(page);
  });

  it('sits above the assistant rather than on top of it', () => {
    const stacked = withWhatsApp('<html><body><div data-lumen-chat></div></body></html>', '91987', null);
    expect(stacked).toContain('bottom:92px');
    expect(withWhatsApp(page, '919876543210', null)).toContain('bottom:20px');
  });
});
