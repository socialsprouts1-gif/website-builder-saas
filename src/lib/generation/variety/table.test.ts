import { describe, it } from 'vitest';
import { chooseDirection, fingerprint, type Fingerprint } from './index';

/** Prints what five builds of one product, and five trades, actually produce. */
describe('what it produces', () => {
  it('five builds of the same product', () => {
    const recent: Fingerprint[] = [];
    const rows = ['', '  SAME PRODUCT (a perfume house), five builds:'];
    for (let build = 0; build < 5; build += 1) {
      const d = chooseDirection({ seed: 1000 + build, businessType: 'Perfume house', recent });
      recent.unshift(fingerprint(d));
      rows.push(
        `  ${build + 1}. ${d.archetype.label.padEnd(20)} ${d.fonts.id.padEnd(22)} ${d.recipe.padEnd(9)} h${String(d.hue).padStart(3)}  ${d.rig.padEnd(9)} bg ${d.palette.bg}  accent ${d.palette.accent}  hero=${d.layouts.hero ?? '—'}`,
      );
    }
    rows.push('', '  FIVE DIFFERENT TRADES:');
    for (const trade of ['Perfume house', 'Sneaker brand', 'Coffee roastery', 'SaaS billing app', 'Furniture showroom']) {
      const d = chooseDirection({ seed: trade.length * 7919, businessType: trade });
      rows.push(`  ${trade.padEnd(19)} → ${d.archetype.label.padEnd(20)} ${d.fonts.id.padEnd(22)} bg ${d.palette.bg}  accent ${d.palette.accent}`);
    }
    console.log(rows.join('\n'));
  });
});
