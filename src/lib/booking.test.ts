import { describe, expect, it } from 'vitest';
import { bookingSection, cleanServices, withBooking } from './booking';

const today = new Date().toISOString().slice(0, 10);

describe('cleanServices', () => {
  it('tidies what someone typed into a comma-separated box', () => {
    expect(cleanServices([' Haircut ', 'Haircut', 'Colour', ''])).toEqual(['Haircut', 'Colour']);
    expect(cleanServices(['Cut', 3, null, { a: 1 }])).toEqual(['Cut']);
    expect(cleanServices('Cut, Colour')).toEqual([]);
  });

  it('stops at a dozen', () => {
    expect(cleanServices(Array.from({ length: 30 }, (_, index) => `S${index}`))).toHaveLength(12);
  });
});

describe('bookingSection', () => {
  const section = bookingSection({ enabled: true, services: ['Haircut', 'Colour'], note: 'We confirm on WhatsApp.' });

  it('is a form the site script already knows how to send', () => {
    expect(section).toContain('data-lumen-form');
    expect(section).toContain('data-lumen-booking');
  });

  it('asks what for, which day and what time', () => {
    expect(section).toContain('name="service"');
    expect(section).toContain('name="preferred_date"');
    expect(section).toContain('name="preferred_time"');
  });

  it('will not let anyone book yesterday', () => {
    expect(section).toContain(`min="${today}"`);
  });

  // The owner has to message back. Saying "booked" would be a promise the site
  // cannot keep.
  it('says a request is not a confirmed slot', () => {
    expect(section).toMatch(/not a confirmed slot/i);
  });

  it('cannot be broken out of by a service name', () => {
    const nasty = bookingSection({ enabled: true, services: ['</option><script>x</script>'], note: null });
    expect(nasty).not.toContain('<script>x');
  });
});

describe('withBooking', () => {
  const contact = '<html><body><main><section data-section="hero"></section></main></body></html>';

  it('puts the form on the contact page, inside main', () => {
    const out = withBooking(contact, { enabled: true, services: [], note: null }, true);
    expect(out).toContain('data-lumen-booking');
    expect(out.indexOf('data-lumen-booking')).toBeLessThan(out.indexOf('</main>'));
  });

  it('adds nothing twice', () => {
    const once = withBooking(contact, { enabled: true, services: [], note: null }, true);
    expect(withBooking(once, { enabled: true, services: [], note: null }, true)).toBe(once);
  });

  it('adds nothing when it is switched off', () => {
    expect(withBooking(contact, { enabled: false, services: [], note: null }, true)).toBe(contact);
  });
});
