import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { NEKHEN } from '../src/level/twoLands';
import { playPart, type BotRun } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * Part 4's balance on the real rules (docs/inkheroes-design.md, "Part 4:
 * Nekhen", Balance): the bot of partBot.ts plays Nekhen, and map 1 for the
 * yardstick, in three styles, a rusher, a steady player and a careful one.
 * BALANCE_SEEDS=12 plays more seeds and prints the table the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 3);

const runs = (def: MapDef, style: keyof typeof STYLES): BotRun[] => Array.from({ length: SEEDS }, (_, i) => playPart(def, { seed: 1000 + i * 7919, ...STYLES[style] }));
const share = (before: number, after: number): number => Math.round((1 - after / before) * 100);

describe('Nekhen, played by a bot that builds and hires', () => {
  const table = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, nekhen: runs(NEKHEN, style), ashford: runs(ASHFORD, style) }));

  it('is won every time, in about map 1’s days', () => {
    for (const { style, nekhen, ashford } of table) {
      expect(nekhen.every((r) => r.won), style).toBe(true);
      const slowest = Math.max(...ashford.map((r) => r.day));
      expect(Math.max(...nekhen.map((r) => r.day)), style).toBeLessThanOrEqual(slowest + 7);
      expect(Math.max(...nekhen.map((r) => r.day)), style).toBeLessThanOrEqual(NEKHEN.parDays);
    }
  });

  it('makes the Petsuchos cost a real share of the army, and keeps the first week near home safe', () => {
    for (const { style, nekhen } of table) {
      for (const r of nekhen) {
        // A careful player who waits another week for a bigger army may win it cheaply (and later).
        if (style !== 'careful') expect(share(r.goal!.before, r.goal!.after), style).toBeGreaterThanOrEqual(10);
        // The steady and careful players lose a few companies at most in the first week; a rusher may take on the sluice early.
        const early = r.fights.filter((f) => f.day <= 7 && f.id !== NEKHEN.goal.target);
        for (const f of early) expect(share(f.before, f.after), `${style} ${f.id} on day ${f.day}`).toBeLessThanOrEqual(15);
      }
    }
    if (process.env.BALANCE_SEEDS) {
      for (const { style, nekhen, ashford } of table) {
        for (const [name, rs] of [['nekhen', nekhen], ['ashford', ashford]] as const) {
          const days = rs.map((r) => r.day).sort((a, b) => a - b);
          const boss = rs.flatMap((r) => (r.goal ? [share(r.goal.before, r.goal.after)] : [])).sort((a, b) => a - b);
          const early = rs.flatMap((r) => r.fights.filter((f) => f.day <= 7 && f.id !== r.goal?.id).map((f) => share(f.before, f.after)));
          console.info(`${name} ${style}: won ${rs.filter((r) => r.won).length}/${rs.length}, days ${days[0]}–${days.at(-1)}, goal fight lost ${boss[0]}–${boss.at(-1)}% of the army, week-1 fights lost at most ${Math.max(0, ...early)}%`);
        }
      }
    }
  });
});
