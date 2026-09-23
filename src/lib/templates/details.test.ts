import { describe, expect, it } from 'vitest';
import { businessDetailsSchema, detailsAreEnough, detailsBrief } from './details';

describe('the business details form', () => {
  const full = {
    name: 'SmileCare Dental',
    businessType: 'Dental clinic',
    location: 'Akola, Maharashtra',
    description: 'Family dentistry since 2011, with same-day emergency slots.',
    offerings: ['Root canal', 'Braces', 'Implants'],
    phone: '+91 98765 43210',
    cta: 'Book an appointment',
  };

  it('reads back as facts about the business, not instructions about a website', () => {
    const brief = detailsBrief(businessDetailsSchema.parse(full));
    expect(brief).toContain('SmileCare Dental');
    expect(brief).toContain('- Root canal');
    expect(brief).toContain('Akola');
    expect(brief).not.toMatch(/\b(create|build|generate|make a)\b/i);
  });

  it('leaves out what was not filled in, rather than writing empty labels', () => {
    const brief = detailsBrief(businessDetailsSchema.parse({ name: 'Just a name' }));
    expect(brief).toBe('Business: Just a name');
  });

  it('refuses a brand colour that is not a colour', () => {
    expect(() => businessDetailsSchema.parse({ name: 'x', brandColour: 'dark blue' })).toThrow();
    expect(businessDetailsSchema.parse({ name: 'x', brandColour: '#1F4D3D' }).brandColour).toBe('#1F4D3D');
  });

  it('knows when there is not enough to write a site about', () => {
    expect(detailsAreEnough(businessDetailsSchema.parse({ name: 'SmileCare' }))).toBe(false);
    expect(detailsAreEnough(businessDetailsSchema.parse(full))).toBe(true);
  });
});
