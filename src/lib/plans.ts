/**
 * What Lumen sells, in one place.
 *
 * There was one plan, hardcoded as a price label and a single Razorpay plan id,
 * and every screen that mentioned money repeated the number by hand. Adding a
 * second tier that way means finding every one of those sentences and hoping.
 * So the catalogue is data: the price, the period, the credits, the features and
 * which environment variable carries the Razorpay plan id, all read from here by
 * the billing page, the pricing page, the upgrade dialog, the subscribe route,
 * the webhook and the allowance.
 *
 * Nothing here is server-only — the billing screen renders it — so it holds no
 * secrets. The Razorpay plan ids are named, not included.
 */

export type PlanTier = 'free' | 'pro' | 'premium';
export type BillingPeriod = 'monthly' | 'yearly';

/** What goes in subscriptions.plan. A free account is a plan, not an absence. */
export type PlanKey = 'free' | 'pro_monthly' | 'pro_yearly' | 'premium_monthly' | 'premium_yearly';

/**
 * The things a plan can unlock.
 *
 * Only what is actually gated. A feature nobody is kept out of does not belong
 * here — it belongs on the free tier's list, where it reads as generosity
 * rather than as a thing somebody is about to lose.
 */
export type Feature = 'custom_domain' | 'gst_invoices' | 'google_import' | 'three_d';

export interface PlanFeature {
  label: string;
  /** Not built yet. It may be listed, but never as if it were there today. */
  soon?: boolean;
}

export interface Plan {
  key: PlanKey;
  tier: PlanTier;
  name: string;
  period: BillingPeriod | null;
  /** What Razorpay charges each period, in paise. Zero on free. */
  pricePaise: number;
  /** The same money as a per-month figure, for comparing a year against a month. */
  perMonthPaise: number;
  /**
   * The ceiling for a month, not a day.
   *
   * Never shown. It exists so one runaway account cannot outspend its own
   * subscription on the shared key, and it is set high enough that a small
   * business will not meet it — which is why printing it on a card was the
   * wrong idea: a number nobody will reach reads as a limit rather than as the
   * absence of one.
   */
  monthlyCredits: number;
  /** The environment variable holding this plan's Razorpay plan id. */
  envVar: string | null;
  features: Feature[];
  /** One line on the card. */
  note: string;
  /** What the card says this plan is, in the owner's terms rather than ours. */
  highlights: string[];
}

/**
 * A year costs ten months. Two months free is the standard trade and it is
 * worth being plain about rather than pricing at some number ending in 99 and
 * letting people work out the discount themselves.
 */
const YEAR_IN_MONTHS = 10;

const PRO_MONTHLY_PAISE = 50_000;
const PREMIUM_MONTHLY_PAISE = 200_000;

const PRO_FEATURES: Feature[] = ['custom_domain', 'gst_invoices'];
const PREMIUM_FEATURES: Feature[] = [...PRO_FEATURES, 'google_import', 'three_d'];

/**
 * A month's ceiling, not a day's, and not something anybody is shown.
 *
 * It was a daily number printed on the card — "200 credits every day" — which
 * made the plan sound like a meter running rather than a subscription. These
 * are set where a small business will never meet them: roughly two hundred
 * whole websites a month on Professional, four times that on Premium. They
 * exist so one account cannot outspend its own subscription on the shared key,
 * and for no other reason.
 */
const PRO_MONTHLY_CREDITS = 1_000;
const PREMIUM_MONTHLY_CREDITS = 4_000;

/**
 * What the cards say instead of a number.
 *
 * Written as what the owner gets, not as what we meter. Nothing here is a
 * quantity, because the honest answer to "how many websites" is "more than you
 * are going to build".
 */
const PRO_HIGHLIGHTS = [
  'Build and rebuild as much as the business needs',
  'Every feature in Free, with no ceiling on projects or pages',
  'Change anything, any time, by saying what you want',
];

const PREMIUM_HIGHLIGHTS = [
  'Everything in Professional',
  'Whatever is built next lands here first',
];

export const PLANS: Plan[] = [
  {
    key: 'free',
    tier: 'free',
    name: 'Free',
    period: null,
    pricePaise: 0,
    perMonthPaise: 0,
    monthlyCredits: 0,
    envVar: null,
    features: [],
    note: 'Ten credits, once. No card, nothing expires.',
    highlights: [],
  },
  {
    key: 'pro_monthly',
    tier: 'pro',
    name: 'Professional',
    period: 'monthly',
    pricePaise: PRO_MONTHLY_PAISE,
    perMonthPaise: PRO_MONTHLY_PAISE,
    monthlyCredits: PRO_MONTHLY_CREDITS,
    envVar: 'RAZORPAY_PLAN_PRO_MONTHLY',
    features: PRO_FEATURES,
    note: 'For somebody whose websites are the business.',
    highlights: PRO_HIGHLIGHTS,
  },
  {
    key: 'pro_yearly',
    tier: 'pro',
    name: 'Professional',
    period: 'yearly',
    pricePaise: PRO_MONTHLY_PAISE * YEAR_IN_MONTHS,
    perMonthPaise: Math.round((PRO_MONTHLY_PAISE * YEAR_IN_MONTHS) / 12),
    monthlyCredits: PRO_MONTHLY_CREDITS,
    envVar: 'RAZORPAY_PLAN_PRO_YEARLY',
    features: PRO_FEATURES,
    note: 'For somebody whose websites are the business. Two months free.',
    highlights: PRO_HIGHLIGHTS,
  },
  {
    key: 'premium_monthly',
    tier: 'premium',
    name: 'Premium',
    period: 'monthly',
    pricePaise: PREMIUM_MONTHLY_PAISE,
    perMonthPaise: PREMIUM_MONTHLY_PAISE,
    monthlyCredits: PREMIUM_MONTHLY_CREDITS,
    envVar: 'RAZORPAY_PLAN_PREMIUM_MONTHLY',
    features: PREMIUM_FEATURES,
    note: 'Everything, including what is built next.',
    highlights: PREMIUM_HIGHLIGHTS,
  },
  {
    key: 'premium_yearly',
    tier: 'premium',
    name: 'Premium',
    period: 'yearly',
    pricePaise: PREMIUM_MONTHLY_PAISE * YEAR_IN_MONTHS,
    perMonthPaise: Math.round((PREMIUM_MONTHLY_PAISE * YEAR_IN_MONTHS) / 12),
    monthlyCredits: PREMIUM_MONTHLY_CREDITS,
    envVar: 'RAZORPAY_PLAN_PREMIUM_YEARLY',
    features: PREMIUM_FEATURES,
    note: 'Everything, including what is built next. Two months free.',
    highlights: PREMIUM_HIGHLIGHTS,
  },
];

export const FREE_PLAN = PLANS[0];

export function planByKey(key: string | null | undefined): Plan | undefined {
  return PLANS.find((plan) => plan.key === key);
}

export function planFor(tier: PlanTier, period: BillingPeriod): Plan | undefined {
  return PLANS.find((plan) => plan.tier === tier && plan.period === period);
}

/** The paid plans for one billing period, cheapest first. The cards. */
export function paidPlans(period: BillingPeriod): Plan[] {
  return PLANS.filter((plan) => plan.period === period).sort(
    (a, b) => a.pricePaise - b.pricePaise,
  );
}

/**
 * What each feature is called, and whether it exists yet.
 *
 * `soon` is the honest half. Lumen does not build 3D sites today; listing it on
 * the premium card is a promise about the roadmap, and a promise has to read as
 * one. Anything marked here is never counted as a reason the plan is worth the
 * money today, and the UI prints the label beside it.
 */
export const FEATURES: Record<Feature, PlanFeature> = {
  custom_domain: { label: 'Your own domain, with HTTPS' },
  gst_invoices: { label: 'GST-compliant invoices' },
  google_import: { label: 'Build from your Google Business listing' },
  three_d: { label: '3D websites', soon: true },
};

/** Features that exist today — what a plan is actually worth now. */
export const availableFeatures = (plan: Plan): Feature[] =>
  plan.features.filter((feature) => !FEATURES[feature].soon);

/**
 * Whether this account may use a feature.
 *
 * Admins are not a tier anybody buys; they are the founder's own account and
 * are never kept out of anything.
 */
export function planAllows(tier: PlanTier | 'admin', feature: Feature): boolean {
  if (tier === 'admin') return true;
  if (FEATURES[feature].soon) return false;
  const plan = PLANS.find((entry) => entry.tier === tier && entry.period !== null)
    ?? FREE_PLAN;
  return plan.features.includes(feature);
}

/** The cheapest tier that includes a feature, for "upgrade to get this". */
/** What a tier is called, wherever a sentence needs to name one. */
export function tierName(tier: PlanTier): string {
  return PLANS.find((plan) => plan.tier === tier)?.name ?? 'Free';
}

export function tierFor(feature: Feature): PlanTier {
  for (const tier of ['pro', 'premium'] as PlanTier[]) {
    const plan = PLANS.find((entry) => entry.tier === tier && entry.period === 'monthly');
    if (plan?.features.includes(feature)) return tier;
  }
  return 'premium';
}

/**
 * The free tier, in one sentence, wherever a paid screen needs to say what
 * happens if somebody does not pay. It is the promise that stops the paywall
 * reading as a threat, so it is written once and quoted rather than retold.
 */
export const FREE_CREDITS_NOTE =
  'Every site you have built stays live, published and exportable whatever you choose — a plan buys model time, not access to your own work.';

export function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** "₹500 / month", "₹5,000 / year". */
export function priceLabel(plan: Plan): string {
  if (plan.pricePaise === 0) return '₹0';
  return `${formatInr(plan.pricePaise)} / ${plan.period === 'yearly' ? 'year' : 'month'}`;
}

/** What a year works out at per month, for the comparison that sells it. */
export function savingLabel(plan: Plan): string | null {
  if (plan.period !== 'yearly') return null;
  const monthly = planFor(plan.tier, 'monthly');
  if (!monthly) return null;
  const saved = monthly.pricePaise * 12 - plan.pricePaise;
  if (saved <= 0) return null;
  return `${formatInr(plan.perMonthPaise)} a month — you save ${formatInr(saved)} a year`;
}
