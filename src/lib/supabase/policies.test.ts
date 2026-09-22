import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The schema, read as text.
 *
 * Row-level security cannot be exercised without a database, and this project
 * deliberately has no mocked Supabase — so what is checked here is the one
 * thing that is checkable without one: that the schema does not say something
 * it must never say again.
 *
 * It earned its place. A single policy in migration 0008 made every published
 * project selectable by every signed-in account, which put every user's sites
 * in every other user's "My sites" list and, because much of the app proved
 * ownership by selecting through that same policy, let one account edit
 * another's site. Nothing in the test suite could have caught it, because
 * nothing in the test suite looked at the schema.
 */
const setup = readFileSync(join(process.cwd(), 'supabase/setup.sql'), 'utf8');

/** The statements that are live at the end, with dropped ones removed. */
function livePolicies(sql: string): string[] {
  const dropped = new Set(
    [...sql.matchAll(/drop policy if exists "([^"]+)" on ([\w.]+)/gi)].map(
      (match) => `${match[2]}::${match[1]}`,
    ),
  );

  const created: { key: string; index: number; body: string }[] = [];
  for (const match of sql.matchAll(
    /create policy "([^"]+)"\s+on ([\w.]+)([\s\S]*?);/gi,
  )) {
    created.push({ key: `${match[2]}::${match[1]}`, index: match.index ?? 0, body: match[0] });
  }

  // A policy is live if its last `create` comes after its last `drop`.
  return created
    .filter((policy) => {
      if (!dropped.has(policy.key)) return true;
      const lastDrop = sql.lastIndexOf(`drop policy if exists "${policy.key.split('::')[1]}"`);
      return policy.index > lastDrop;
    })
    .map((policy) => policy.body);
}

describe('projects row-level security', () => {
  const live = livePolicies(setup);
  const onProjects = live.filter((policy) => /on public\.projects/i.test(policy));

  it('has policies on the projects table at all', () => {
    expect(onProjects.length).toBeGreaterThan(0);
  });

  /**
   * The bug, stated as a rule. A published site is served by the service role,
   * which does not consult these policies at all — so nothing needs a policy
   * keyed on `published_at`, and anything that has one is handing every
   * signed-in account somebody else's project.
   */
  it('never grants access to a project for being published', () => {
    for (const policy of onProjects) {
      expect(policy).not.toMatch(/published_at/i);
      expect(policy).not.toMatch(/public_slug/i);
    }
  });

  /** Templates are the one genuinely public case, and they say so explicitly. */
  it('opens a project to everyone only when it is a template', () => {
    const open = onProjects.filter((policy) => !/auth\.uid\(\)/i.test(policy));
    for (const policy of open) expect(policy).toMatch(/is_template/);
  });

  it('still lets an owner reach their own projects', () => {
    expect(onProjects.some((policy) => /auth\.uid\(\) = user_id/.test(policy))).toBe(true);
  });
});

describe('the sites list', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/app/page.tsx'), 'utf8');

  /**
   * Belt as well as braces. The policy above is the fix; this is the reason
   * the fix cannot be undone by a single future mistake.
   */
  it('asks for this account’s projects rather than trusting a policy', () => {
    expect(page).toContain("eq('user_id', user.id)");
  });
});
