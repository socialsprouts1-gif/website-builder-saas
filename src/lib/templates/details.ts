import { z } from 'zod';

/**
 * What Lumen asks for instead of asking somebody to write a good prompt.
 *
 * The prompt box was the product's worst idea for the people it is built for.
 * A shop owner in Akola does not know that "include a treatments page with
 * prices" is the sentence that gets them a treatments page with prices, and the
 * quality of what they got depended on a skill nobody told them they needed.
 *
 * These are the questions their answers were missing. Every one of them is a
 * fact about their business rather than an instruction about a website, and the
 * blueprint already knows what to do with each.
 */

export const CTA_OPTIONS = [
  'Book an appointment',
  'Call now',
  'Message on WhatsApp',
  'Get a quote',
  'Buy now',
  'Order now',
  'Book a table',
  'Schedule a consultation',
  'Request a demo',
  'Contact us',
] as const;

export const businessDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Your business needs a name.').max(120),
  businessType: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  /** One per line on the form; a list by the time it reaches here. */
  offerings: z.array(z.string().trim().min(1).max(200)).max(24).optional(),
  audience: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().max(160).optional(),
  address: z.string().trim().max(300).optional(),
  hours: z.string().trim().max(300).optional(),
  socials: z.array(z.string().trim().min(1).max(300)).max(8).optional(),
  /** A hex the owner already uses. The rest of the palette is built around it. */
  brandColour: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour like #1F4D3D')
    .optional()
    .or(z.literal('')),
  cta: z.string().trim().max(60).optional(),
});

export type BusinessDetails = z.infer<typeof businessDetailsSchema>;

const line = (label: string, value: string | undefined | null) =>
  value && value.trim() ? `${label}: ${value.trim()}` : null;

/**
 * The form, as the paragraph the generator reads.
 *
 * Written as facts rather than as instructions, because everything downstream
 * already treats the brief as "what the owner told us" and a brief full of
 * commands produces copy that sounds like commands.
 */
export function detailsBrief(details: BusinessDetails): string {
  const parts: (string | null)[] = [
    line('Business', details.name),
    line('What it is', details.businessType),
    line('Where it is', details.location),
    line('In their words', details.description),
    details.offerings?.length
      ? `What they sell or do:\n${details.offerings.map((entry) => `- ${entry}`).join('\n')}`
      : null,
    line('Who it is for', details.audience),
    line('Phone', details.phone),
    line('WhatsApp', details.whatsapp),
    line('Email', details.email),
    line('Address', details.address),
    line('Opening hours', details.hours),
    details.socials?.length ? `Social links: ${details.socials.join(', ')}` : null,
    details.brandColour ? `Brand colour they already use: ${details.brandColour}` : null,
    line('The action that matters most', details.cta),
  ];

  return parts.filter(Boolean).join('\n');
}

/**
 * Enough to build something worth looking at.
 *
 * A name alone produces a site about nothing. This is the line between "we can
 * write this business's website" and "we can write a website", and the form
 * says so rather than generating something hollow and letting them discover it.
 */
export function detailsAreEnough(details: BusinessDetails): boolean {
  const said = [details.description, details.businessType, details.offerings?.join(' ')]
    .filter(Boolean)
    .join(' ')
    .trim();
  return details.name.trim().length > 1 && said.length >= 20;
}
