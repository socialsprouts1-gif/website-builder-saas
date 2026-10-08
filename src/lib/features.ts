/**
 * What each part of Lumen is called, and whether anybody can see it.
 *
 * Two different questions get confused here constantly, so they are kept
 * apart on purpose:
 *
 *   a PLAN entitlement — "3D websites are on Premium" — which is about what
 *     somebody has paid for, lives in `plans.ts`, and is the same for every
 *     account on that plan.
 *   a FEATURE SWITCH — "nobody can see 3D Studio this week" — which is about
 *     whether the thing is open at all, is set by hand in the admin panel, and
 *     has nothing to do with money.
 *
 * Both have to pass. Turning the switch on does not hand somebody a plan they
 * did not buy, and paying for Premium does not get them into something that is
 * switched off for everyone. The switch is the outer gate.
 *
 * Resolution order, and this is the whole of it:
 *
 *   1. a row for this user, if there is one — on or off, overriding everything
 *   2. the global switch, if it has been set
 *   3. the default written here
 *
 * Which is what makes "off for everyone except this one account" a single row
 * rather than a code change.
 */

import type { Feature as PlanFeature } from './plans';

export type FeatureKey =
  | 'three_d'
  | 'google_import'
  | 'shop'
  | 'chatbot'
  | 'connectors'
  | 'deployments'
  | 'version_history'
  | 'templates'
  | 'referrals'
  | 'api_keys'
  | 'custom_domain'
  | 'voice_input'
  | 'screenshot_input';

export interface FeatureDefinition {
  key: FeatureKey;
  /** What it is called in the admin panel, and to a user. */
  label: string;
  /** One line on what switching it off actually does. */
  blurb: string;
  group: 'Building' | 'Selling' | 'Publishing' | 'Account';
  /** Whether it is on when nothing has been stored. */
  on: boolean;
  /**
   * The nav entry this hides when it is off.
   *
   * Written here rather than in the navigation, so a feature cannot be
   * switched off and still have a link to it in the sidebar — which is the
   * failure this whole file exists to prevent.
   */
  href?: string;
  /**
   * The plan entitlement that also has to pass, where there is one.
   *
   * Both gates, never either: the switch decides whether the feature is open,
   * the plan decides who it is open to.
   */
  plan?: PlanFeature;
}

export const FEATURE_LIST: FeatureDefinition[] = [
  {
    key: 'three_d',
    label: '3D Studio',
    blurb: 'Building 3D websites. Off hides it from the sidebar and refuses the build.',
    group: 'Building',
    on: true,
    href: '/app/studio',
    plan: 'three_d',
  },
  {
    key: 'google_import',
    label: 'Build from a Google listing',
    blurb: 'Importing a business from Google Maps.',
    group: 'Building',
    on: true,
    href: '/app/google',
    plan: 'google_import',
  },
  {
    key: 'templates',
    label: 'Template library',
    blurb: 'Starting from a ready-made design instead of a blank prompt.',
    group: 'Building',
    on: true,
    href: '/templates',
  },
  {
    key: 'voice_input',
    label: 'Voice input',
    blurb: 'Describing a site by speaking rather than typing.',
    group: 'Building',
    on: true,
  },
  {
    key: 'screenshot_input',
    label: 'Build from a screenshot',
    blurb: 'Uploading a design or a visiting card to build from.',
    group: 'Building',
    on: true,
  },
  {
    key: 'shop',
    label: 'Shop & checkout',
    blurb: 'Selling products, with a basket and card payments.',
    group: 'Selling',
    on: true,
  },
  {
    key: 'chatbot',
    label: 'Site assistant',
    blurb: 'The chatbot that answers questions on a published site.',
    group: 'Selling',
    on: true,
  },
  {
    key: 'connectors',
    label: 'Connectors',
    blurb: 'WhatsApp, email and the other places leads are sent.',
    group: 'Selling',
    on: true,
    href: '/app/settings/connectors',
  },
  {
    key: 'deployments',
    label: 'Deployments',
    blurb: 'Publishing to a host, and the deployment history.',
    group: 'Publishing',
    on: true,
    href: '/app/deployments',
  },
  {
    key: 'custom_domain',
    label: 'Custom domains',
    blurb: 'Pointing your own domain at a published site.',
    group: 'Publishing',
    on: true,
    plan: 'custom_domain',
  },
  {
    key: 'version_history',
    label: 'Version history',
    blurb: 'Looking at and restoring earlier versions of a site.',
    group: 'Publishing',
    on: true,
    href: '/app/history',
  },
  {
    key: 'referrals',
    label: 'Refer a friend',
    blurb: 'The referral link and the credits it earns.',
    group: 'Account',
    on: true,
    href: '/app/refer',
  },
  {
    key: 'api_keys',
    label: 'Bring your own key',
    blurb: 'Using a personal OpenAI key instead of Lumen’s.',
    group: 'Account',
    on: true,
    href: '/app/settings/api-keys',
  },
];

export const FEATURE_BY_KEY: Record<FeatureKey, FeatureDefinition> = Object.fromEntries(
  FEATURE_LIST.map((feature) => [feature.key, feature]),
) as Record<FeatureKey, FeatureDefinition>;

export const isFeatureKey = (value: unknown): value is FeatureKey =>
  typeof value === 'string' && value in FEATURE_BY_KEY;

/** What the database had to say: a switch is on, off, or never set. */
export type FlagState = boolean | undefined;

export interface FlagSources {
  /** The global switch, where one has been set. */
  global?: Partial<Record<FeatureKey, boolean>>;
  /** This account's overrides, where any have been set. */
  user?: Partial<Record<FeatureKey, boolean>>;
}

/**
 * Whether this account can see this feature at all.
 *
 * Admins are exempt from the switch and only from the switch. The founder
 * turning 3D Studio off for the week must not lock themselves out of the
 * thing they are in the middle of building — but they are still subject to
 * everything else, and a feature nobody has a plan for stays unavailable.
 */
export function featureOpen(
  key: FeatureKey,
  sources: FlagSources,
  options: { admin?: boolean } = {},
): boolean {
  if (options.admin) return true;

  const override = sources.user?.[key];
  if (typeof override === 'boolean') return override;

  const global = sources.global?.[key];
  if (typeof global === 'boolean') return global;

  return FEATURE_BY_KEY[key]?.on ?? false;
}

/**
 * Every switch resolved at once, for a page that needs several.
 *
 * One pass rather than one call per feature, because the navigation asks about
 * all thirteen on every render.
 */
export function resolveFeatures(
  sources: FlagSources,
  options: { admin?: boolean } = {},
): Record<FeatureKey, boolean> {
  return Object.fromEntries(
    FEATURE_LIST.map((feature) => [feature.key, featureOpen(feature.key, sources, options)]),
  ) as Record<FeatureKey, boolean>;
}

/**
 * The nav entries a switched-off feature takes with it.
 *
 * The sidebar asks this rather than keeping its own list: a feature with a
 * link that is switched off but still shown is a dead end, and the only way
 * to be sure that never happens is for the link to be named next to the
 * switch.
 */
export function hiddenHrefs(resolved: Record<FeatureKey, boolean>): string[] {
  return FEATURE_LIST.filter((feature) => feature.href && !resolved[feature.key]).map(
    (feature) => feature.href as string,
  );
}

/** Grouped for the admin screen, in the order the groups are declared. */
export function featureGroups(): { group: FeatureDefinition['group']; features: FeatureDefinition[] }[] {
  const order: FeatureDefinition['group'][] = ['Building', 'Selling', 'Publishing', 'Account'];
  return order
    .map((group) => ({ group, features: FEATURE_LIST.filter((feature) => feature.group === group) }))
    .filter((entry) => entry.features.length > 0);
}
