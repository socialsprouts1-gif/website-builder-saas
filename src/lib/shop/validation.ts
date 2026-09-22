import { z } from 'zod';

/**
 * What a checkout is allowed to send.
 *
 * Quantities and product ids only — the prices are the shop's business, not
 * the browser's. Shared by the public endpoint and the owner's preview one so
 * the two cannot accept different things.
 */
export const orderSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  shippingRateId: z.string().uuid().nullable().optional(),
  name: z.string().trim().max(200),
  contact: z.string().trim().max(60),
  email: z.string().trim().max(200).optional().default(''),
  address: z.string().trim().max(600),
  city: z.string().trim().max(120),
  postcode: z.string().trim().max(20),
  note: z.string().trim().max(2000).optional().default(''),
  /** The field no person sees, so no person fills it in. */
  website: z.string().max(200).optional().default(''),
});
