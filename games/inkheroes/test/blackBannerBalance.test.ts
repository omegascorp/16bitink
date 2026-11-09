import { describe, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { partDays, rideOn } from '../src/logic/chapter';
import { armyStrength } from '../src/logic/rival';
import { playPart, rideOnInto, type BotOptions } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * The calibration for part 6 (coordinator, Nov 8): the same `wise` bot on
 * chapter 1's Black Banner under today's rules (the Nov 8 hardening: the
 * race for Eudora, Kassander's 0.75 head start, his retreat), ridden on from
 * Ashford and Thornwood. The Red Land's target is about these numbers. Only
 * with BALANCE_SEEDS set (it takes minutes); it prints the table the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 0);

const range = (xs: readonly number[]): string => (xs.length ? `${Math.min(...xs)}–${Math.max(...xs)}` : '-');

describe('the Black Banner, ridden on into by the wise bot', () => {
  it.skipIf(!SEEDS)('prints its table', () => {
    for (const style of ['rush', 'steady', 'careful'] as const) {
      const rows = Array.from({ length: SEEDS }, (_, i) => {
        const opts: BotOptions = { seed: 1000 + i * 7919, ...STYLES[style] };
        const ashford = playPart(ASHFORD, opts);
        const thornwood = rideOnInto(ashford, ASHFORD, THORNWOOD, opts);
        const opened = rideOn(thornwood.adv, THORNWOOD, BLACK_BANNER);
        const banner = rideOnInto(thornwood, THORNWOOD, BLACK_BANNER, { ...opts, goalFirst: true, wise: true, maxDays: 60 });
        const korax = banner.fights.filter((f) => f.id === BLACK_BANNER.goal.target).map((f) => Math.round((1 - f.after / f.before) * 100));
        return { thornwood, opened, banner, korax };
      });
      const won = rows.filter((r) => r.banner.won);
      const lost = rows.filter((r) => r.banner.adv.status === 'lost');
      const ratio = rows.map((r) => armyStrength(r.opened.rival!.hero!.army) / Math.max(1, armyStrength(r.opened.hero.army)));
      console.info(`banner ${style}: thornwood won ${rows.filter((r) => r.thornwood.won).length}/${rows.length}, rides on day ${range(rows.map((r) => r.thornwood.day))}, Kassander ×${Math.min(...ratio).toFixed(2)}–${Math.max(...ratio).toFixed(2)}; won ${won.length}, lost ${lost.length}, stalled ${rows.length - won.length - lost.length}; part days ${range(won.map((r) => partDays(r.banner.adv)))}; Korax's siege ${range(rows.flatMap((r) => r.korax))}%`);
    }
  }, 3_600_000);
});
