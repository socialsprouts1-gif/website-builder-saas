# Lumen

**Ship a website from a sentence.**

Lumen turns one prompt into a production-grade website — design system, content,
animations, SEO, and deploy. Iterate in chat, edit visually, ship anywhere.

Built for small businesses (restaurants, gyms, dentists, portfolios, real
estate, ecommerce) who want a finished site fast, plus a built-in AI chatbot for
that site and a connectors hub that plugs it into the tools they already use.

---

## Running it

```bash
pnpm install
cp .env.example .env.local     # fill in the values below
pnpm dev
```

The app boots without any credentials — every unconfigured integration renders
an explicit "connect your key" state rather than crashing — but generation,
billing and connectors each need their own setup.

### 1. Supabase

Create a project, then run the migrations in order:

```bash
supabase db push               # or paste supabase/migrations/*.sql into the SQL editor
```

`0001_init.sql` creates the schema and enables row-level security on every
user-owned table in the same migration. `0002_storage.sql` creates the
`project-assets` bucket for uploaded screenshots and images.

Two extensions are required and are enabled by the migration: `pgcrypto` and
`vector` (the chatbot's embeddings).

Then set:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

For Google sign-in, enable the Google provider in Supabase Auth and add
`<your-url>/auth/callback` as a redirect URL.

### 2. Encryption key

Every third-party credential — users' OpenAI keys, connector OAuth tokens — is
encrypted at rest with AES-256-GCM before it touches the database.

```bash
openssl rand -base64 32        # → LUMEN_ENCRYPTION_KEY
```

Rotating this key invalidates stored credentials: they are treated as "not
connected" rather than throwing, so a rotation degrades instead of breaking.

### 3. OpenAI

`OPENAI_API_KEY` is Lumen's pooled key, and it is metered: each account gets
`DAILY_PLATFORM_CREDITS` (10 by default, in `src/lib/env.ts`) credits per UTC
day. Every call that costs money is priced in `CREDIT_COST` — building a site
is 3, an edit is 1, a screenshot pass adds 1, indexing a chatbot is 1, and a
chatbot reply to a visitor is 1. Transcription is free but rate limited.

Ten credits is deliberately "one site plus a few rounds of changes". Past that
a user adds their own key in Settings → API keys, which removes the ceiling and
bills OpenAI directly.

Leave it blank to make bring-your-own-key mandatory.

Note that a published chatbot answers *visitor* traffic on the owner's credits.
On the shared key a busy site will exhaust a day's balance quickly, which is
intended — it caps your exposure — but it means the chatbot really wants BYOK
before it goes live.

### 4. Razorpay

Create a ₹500/month plan in the Razorpay dashboard, then set `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID` and `RAZORPAY_WEBHOOK_SECRET`.

Point a webhook at `<your-url>/api/billing/webhook` subscribed to
`subscription.activated`, `subscription.charged`, `subscription.halted`,
`subscription.cancelled` and `payment.failed`. Signatures are verified before
any payload is trusted.

### 5. Connectors (all optional)

Each OAuth connector needs a client ID and secret named after its `envKey` in
`src/lib/connectors/providers.ts` — e.g. `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET`. Redirect URI is
`<your-url>/api/connectors/<provider>/callback`.

API-key connectors (Netlify, Mailchimp, Airtable, Zapier, Stripe, Shopify)
need nothing from you — the user supplies the credential.

---

## How it is put together

```
src/
  app/                      routes — marketing, /app shell, /admin, /api, /preview
  components/
    ui/                     the design system: Badge, Button, PromptBar,
                            CategoryChip, CodeWindow, Logo, form controls
    marketing/              nav, footer, hero prompt, template gallery
    app/                    workspace, visual editor, connector grid, billing…
  lib/
    generation/             the pipeline: prompts, streaming parser, HTML edit
                            engine, version storage
    openai/                 key resolution (BYOK vs platform) and the live
                            model catalog
    connectors/             connector contract, factories, provider registry
    supabase/               browser, server and service-role clients
supabase/migrations/        schema and RLS
```

### The generation pipeline

`src/lib/generation/pipeline.ts` is the single path all three input modes take:

1. **Vision pass** (screenshot mode only) — extracts layout, palette and
   component structure. Deliberately extracts *structure*, never the business
   name, logo or verbatim copy.
2. **Brief** — expands one sentence into a concrete site plan: which pages, what
   tone, which conversion action.
3. **Design system** — a palette, font pairing and spacing scale generated *per
   project*, so two Lumen sites do not look alike.
4. **Code** — streamed file-by-file and parsed as it arrives, so the workspace
   shows real progress instead of a spinner.
5. **Persist** — one transactional version row.

Chat iteration (`runChatEdit`) re-emits only the files it changed and merges
them over the current set, so earlier customisations survive. Versions are
append-only; "restore" writes a new version carrying the old files rather than
destroying history.

### The preview sandbox

Generated code is untrusted output and is treated as such in two independent
ways: it is served from `/preview/[projectId]/[...path]` under a strict CSP with
no network egress beyond images, and rendered in an iframe with
`sandbox="allow-scripts"` and **no** `allow-same-origin`, so it executes in an
opaque origin with no access to Lumen's cookies or DOM.

The visual editor therefore cannot reach into the preview's DOM — by design. It
drives the page over `postMessage` via a bridge script injected only in editor
mode, and edits are applied server-side back into the real generated HTML
(`src/lib/generation/html-edit.ts`), not into an overlay layer.

### Models

Nothing hardcodes a permanent model dropdown. `src/lib/openai/models.ts` fetches
`GET /v1/models` with whichever key is active, caches it for an hour, and buckets
the live IDs into **Best quality**, **Fast & cheap** and **Custom** using naming
heuristics plus a `LUMEN_MODEL_OVERRIDES` escape hatch. A retired or renamed
model fails over to the next best option and surfaces a notice — never a crash.

The seed list in `SEED_MODELS` is a fallback for when that call fails. It will
age; that is expected, and the whole point of the live fetch.

---

## Decisions taken that the brief left open

These were unspecified. Each is reversible and isolated.

- **Generated output is static HTML + CSS + vanilla JS**, not a Next.js app.
  The brief allows either. Static output is what makes preview, visual editing,
  zip export and one-click deploy all work with no build step anywhere — the
  core loop genuinely runs end to end rather than needing a container per
  project. `CODE_RULES` in `src/lib/generation/prompts.ts` is where to change
  the target.
- **Preview sandboxing is a CSP-hardened server route plus an opaque-origin
  iframe**, rather than WebContainers or a per-project container. No extra
  service, and it is a strictly stronger isolation boundary than same-origin
  preview with a build step.
- **No external queue.** Generation runs inside the SSE route that streams it,
  so progress reaches the browser directly. A job that is already `succeeded` or
  `failed` replays its outcome instead of regenerating, so reloading the
  workspace never costs a second generation.
- **Rate limiting is Postgres-backed** (`rate_limit_events`) rather than Redis —
  no second datastore for a handful of counters.
- **Generated code lives in `project_versions.files` (jsonb)**, not Storage, so
  a version is written as one transactional row. Storage holds the genuinely
  blob-shaped things: uploaded screenshots and images.
- **Every account starts on a 1-day trial row** (`TRIAL_DAYS`), so `entitled`
  is a single check everywhere and a new user can build their first site before
  paying. One day pairs with the daily credit allowance: a full day and 10
  credits is enough to build a site and decide.
- **Zip export uses a small store-only ZIP writer** (`src/lib/zip.ts`) rather
  than a dependency — generated sites are small text files.

## What still needs a human

- **Templates are empty until seeded.** They are just projects flagged
  `is_template`; generate the sites you want to feature, then insert rows into
  `templates` pointing at them. Until then `/templates` funnels users into the
  generator, which is the honest fallback.
- **The showcase needs moderation before it is public.** `flagged_content` and
  the admin queue exist; nothing writes to them yet.
- **Admin access**: set `LUMEN_ADMIN_EMAILS` to a comma-separated list and
  those addresses get in on first sign-in, with the `is_admin` flag written to
  their row. `/admin/users` then manages everyone else — grant or revoke admin,
  extend free access, or end it. Migration `0003` also grants the founding
  account directly.
- **Model names.** Check `platform.openai.com/docs/models` before you ship and
  update `SEED_MODELS` if the fallback matters to you.

## Commands

```bash
pnpm dev          # development server
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```
