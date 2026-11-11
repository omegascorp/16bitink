import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { HLADIR } from '../src/level/longWinter';
import type { MapDef } from '../src/level/types';
import { NEKHEN } from '../src/level/twoLands';
import { playPart, type BotRun } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * Hladir's balance on the real rules (docs/inkheroes-design.md, "Part 1 as
 * built (Nov 11)", Balance): the bot of partBot.ts plays Hladir, and map 1
 * and Nekhen for the yardsticks, in three styles, a rusher, a steady player
 * and a careful one. BALANCE_SEEDS=24 plays more seeds and prints the table
 * the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 3);
/** The steady player's target: 10 to 14 days, as Nekhen and map 1. */
const TWO_WEEKS = 14;

const runs = (def: MapDef, style: keyof typeof STYLES): BotRun[] => Array.from({ length: SEEDS }, (_, i) => playPart(def, { seed: 1000 + i * 7919, ...STYLES[style] }));
const share = (before: number, after: number): number => Math.round((1 - after / before) * 100);

describe('Hladir, played by a bot that builds and hires', () => {
  const table = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, hladir: runs(HLADIR, style), ashford: runs(ASHFORD, style), nekhen: runs(NEKHEN, style) }));

  it('is won every time, by a rusher or a steady player in two weeks at most (Nekhen’s steady 12), by a careful one within par', () => {
    for (const { style, hladir } of table) {
      expect(hladir.every((r) => r.won), style).toBe(true);
      // A careful player waits a week more for an army twice the pack's (and wins it cheaply).
      const most = style === 'careful' ? HLADIR.parDays : TWO_WEEKS;
      expect(Math.max(...hladir.map((r) => r.day)), style).toBeLessThanOrEqual(most);
    }
  });

  it('makes Hrimgrimnir cost a real share of the army, and keeps the first week near home safe', () => {
    for (const { style, hladir } of table) {
      for (const r of hladir) {
        // A careful player who waits another week for a bigger army may win it cheaply (and later).
        if (style !== 'careful') expect(share(r.goal!.before, r.goal!.after), style).toBeGreaterThanOrEqual(10);
        const early = r.fights.filter((f) => f.day <= 7 && f.id !== HLADIR.goal.target);
        for (const f of early) expect(share(f.before, f.after), `${style} ${f.id} on day ${f.day}`).toBeLessThanOrEqual(15);
      }
    }
    if (process.env.BALANCE_SEEDS) {
      for (const { style, hladir, nekhen, ashford } of table) {
        for (const [name, rs] of [['hladir', hladir], ['nekhen', nekhen], ['ashford', ashford]] as const) {
          const days = rs.map((r) => r.day).sort((a, b) => a - b);
          const boss = rs.flatMap((r) => (r.goal ? [share(r.goal.before, r.goal.after)] : [])).sort((a, b) => a - b);
          const early = rs.flatMap((r) => r.fights.filter((f) => f.day <= 7 && f.id !== r.goal?.id).map((f) => share(f.before, f.after)));
          console.info(`${name} ${style}: won ${rs.filter((r) => r.won).length}/${rs.length}, days ${days[0]}–${days.at(-1)}, goal fight lost ${boss[0]}–${boss.at(-1)}% of the army, week-1 fights lost at most ${Math.max(0, ...early)}%`);
        }
      }
    }
  });
});
