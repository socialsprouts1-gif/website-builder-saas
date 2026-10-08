import { describe, expect, it } from 'vitest';
import {
  FEATURE_BY_KEY,
  FEATURE_LIST,
  featureOpen,
  featureGroups,
  hiddenHrefs,
  isFeatureKey,
  resolveFeatures,
} from './features';
import { FEATURES as PLAN_FEATURES } from './plans';

describe('the feature catalogue', () => {
  it('has a unique key, a label and a sentence for every switch', () => {
    expect(new Set(FEATURE_LIST.map((feature) => feature.key)).size).toBe(FEATURE_LIST.length);
    for (const feature of FEATURE_LIST) {
      expect(feature.label.trim(), feature.key).not.toBe('');
      expect(feature.blurb.trim().length, feature.key).toBeGreaterThan(10);
    }
  });

  /** Every feature appears exactly once on the admin screen. */
  it('groups every feature exactly once', () => {
    const grouped = featureGroups().flatMap((entry) => entry.features);
    expect(grouped).toHaveLength(FEATURE_LIST.length);
    expect(new Set(grouped.map((feature) => feature.key)).size).toBe(FEATURE_LIST.length);
  });

  /**
   * A switch that names a plan entitlement has to name a real one, or the
   * "also needs the plan" badge is pointing at nothing.
   */
  it('only names plan entitlements that exist', () => {
    for (const feature of FEATURE_LIST) {
      if (!feature.plan) continue;
      expect(PLAN_FEATURES[feature.plan], feature.key).toBeTruthy();
    }
  });

  it('knows its own keys', () => {
    expect(isFeatureKey('three_d')).toBe(true);
    expect(isFeatureKey('nonsense')).toBe(false);
    expect(isFeatureKey(undefined)).toBe(false);
  });
});

describe('resolving a switch', () => {
  /**
   * The order is the whole design: a row for the user beats the global
   * switch, which beats the default in the code. "Off for everyone except
   * this one account" has to be one row, not a code change.
   */
  it('lets one account into something that is closed', () => {
    const sources = { global: { three_d: false }, user: { three_d: true } };
    expect(featureOpen('three_d', sources)).toBe(true);
    // And the other way round, which is the half people forget.
    expect(featureOpen('three_d', { global: { three_d: true }, user: { three_d: false } })).toBe(false);
  });

  it('falls back to the global switch, then to the default', () => {
    expect(featureOpen('three_d', { global: { three_d: false } })).toBe(false);
    expect(featureOpen('three_d', {})).toBe(FEATURE_BY_KEY.three_d.on);
  });

  /**
   * An admin is exempt from the switch and only from the switch. Turning 3D
   * off for the week must not lock the founder out of the thing they are in
   * the middle of building.
   */
  it('never switches an admin out of anything', () => {
    const closed = { global: { three_d: false }, user: { three_d: false } };
    expect(featureOpen('three_d', closed, { admin: true })).toBe(true);
    const resolved = resolveFeatures(closed, { admin: true });
    expect(Object.values(resolved).every(Boolean)).toBe(true);
  });

  it('resolves every switch in one pass', () => {
    const resolved = resolveFeatures({ global: { shop: false } });
    expect(Object.keys(resolved)).toHaveLength(FEATURE_LIST.length);
    expect(resolved.shop).toBe(false);
    expect(resolved.three_d).toBe(FEATURE_BY_KEY.three_d.on);
  });

  /**
   * A switched-off feature must take its sidebar link with it. A link that
   * survives the switch is a dead end — and worse, on a surface where the
   * server now refuses, a 404 the person was invited to walk into.
   */
  it('hides the link of anything switched off', () => {
    const hidden = hiddenHrefs(resolveFeatures({ global: { three_d: false, referrals: false } }));
    expect(hidden).toContain('/app/studio');
    expect(hidden).toContain('/app/refer');
    expect(hidden).not.toContain('/app/deployments');

    // Nothing is hidden when nothing is switched off.
    expect(hiddenHrefs(resolveFeatures({}))).toEqual([]);
  });

  /** A feature with no page of its own hides nothing, and must not crash. */
  it('copes with a feature that has no link', () => {
    expect(FEATURE_BY_KEY.voice_input.href).toBeUndefined();
    expect(hiddenHrefs(resolveFeatures({ global: { voice_input: false } }))).toEqual([]);
  });
});
