import { z } from 'zod';

/** Every API boundary validates with one of these (spec Section 16). */

export const createProjectSchema = z.object({
  prompt: z.string().trim().min(3, 'Tell Lumen a little more.').max(2000),
  category: z.string().max(64).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  inputMode: z.enum(['prompt', 'screenshot', 'voice', 'template']).default('prompt'),
  screenshotDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, 'Unsupported image type')
    .max(9_000_000)
    .nullable()
    .optional(),
  templateSlug: z.string().max(120).nullable().optional(),
});

export const chatEditSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  model: z.string().max(120).nullable().optional(),
  source: z.enum(['chat', 'voice']).default('chat'),
});

export const visualEditSchema = z.object({
  edits: z
    .array(
      z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('text'), lumenId: z.string().min(1).max(200), value: z.string().max(5000) }),
        z.object({ kind: z.literal('image'), lumenId: z.string().min(1).max(200), src: z.string().url().max(2000), alt: z.string().max(300).optional() }),
        z.object({ kind: z.literal('remove'), lumenId: z.string().min(1).max(200) }),
        z.object({ kind: z.literal('token'), name: z.string().min(1).max(80), value: z.string().min(1).max(80) }),
      ]),
    )
    .min(1)
    .max(50),
  path: z.string().min(1).max(200),
});

export const apiKeySchema = z.object({
  key: z.string().trim().min(20, 'That does not look like an OpenAI key.').max(300),
});

export const chatbotConfigSchema = z.object({
  name: z.string().trim().min(1).max(60),
  greeting: z.string().trim().min(1).max(300),
  tone: z.enum(['friendly', 'professional', 'concise']),
  faq: z.string().max(20_000).optional(),
  isActive: z.boolean().optional(),
});

export const chatbotAskSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  sessionId: z.string().min(6).max(120),
});

export const subscribeSchema = z.object({
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'That GSTIN does not look valid.')
    .optional()
    .or(z.literal('')),
});

export const connectorConnectSchema = z.object({
  provider: z.string().min(2).max(60),
  credentials: z.record(z.string().max(4000)).optional(),
  config: z.record(z.unknown()).optional(),
});

export const deploySchema = z.object({
  target: z.enum(['vercel', 'github', 'zip']),
  repoName: z.string().max(120).optional(),
});
