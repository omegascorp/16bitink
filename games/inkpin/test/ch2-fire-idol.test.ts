import { describe, expect, it } from 'vitest';
import { FIRE_IDOL } from '../src/level/ch2/fireIdol';
import { parseStep, type LevelDef, type Stop } from '../src/logic/level';
import { inRooms } from '../src/logic/rooms';
import { LAVA, STEPS_PER_SECOND, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** The crown (the idol's cistern: the brow and the tank) and the three mouths, as boxes. */
const CROWN = { x0: 470, x1: 1120, y0: 330, y1: 540 };
const MOUTHS = [
  { x0: 470, x1: 578, y0: 540, y1: 670 },
  { x0: 590, x1: 698, y0: 720, y1: 850 },
  { x0: 710, x1: 818, y0: 900, y1: 1030 },
];

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[], level: LevelDef = FIRE_IDOL): string => {
  const r = play(level, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

const count = (w: World, kind: number, b: { x0: number; x1: number; y0: number; y1: number }): number => {
  const g = w.grains;
  let n = 0;
  for (let i = 0; i < g.count; i++) if (g.kind[i] === kind && g.x[i]! > b.x0 && g.x[i]! < b.x1 && g.y[i]! > b.y0 && g.y[i]! < b.y1) n++;
  return n;
};

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports what it left behind: the hot lava in each mouth when the
 * gate went back in, and the crown's water when the flood pin came out.
 */
function watchSolution(): { won: boolean; seconds: number; hot: number[]; flood: number; world: World } {
  const w = new World(FIRE_IDOL);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = FIRE_IDOL.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command({ kind: 'goto', x: s.x });
      run(steps);
    }
  };
  let hot: number[] = [];
  let flood = 0;
  const steps = FIRE_IDOL.solution.map(parseStep);
  steps.forEach(({ id, wait }, i) => {
    if (wait !== null) for (let s = Math.round(wait * STEPS_PER_SECOND); s > 0; s--) w.step();
    if (id === 'F') flood = count(w, WATER, CROWN);
    w.tap(id);
    if (steps[i + 1]?.wait != null) return;
    run(STEPS_PER_SECOND * 8);
    if (id === 'A' && wait !== null) hot = MOUTHS.map((m) => count(w, LAVA, m));
    visit(stops, STEPS_PER_SECOND * 8);
  });
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, hot, flood, world: w };
}

/** The gate's window, in seconds after it was pulled: the third mouth has just steamed, and late, with the crown low but still enough. */
const WINDOW = [6, 10];

/** Tempting wrong orders, and how each loses. */
const LOSSES: readonly (readonly [readonly string[], string])[] = [
  // The tempting pin: the flood, right over the boss. It washes the Old Salamander away, but the crown is spent:
  // the gate pours nothing on the mouths, and the first jaw drops Nib beside a mouthful of lava.
  [['F', 'A', 'A~6', 'J1', 'J2', 'J3'], 'burnt'],
  // The jaw under Nib first: the first mouth is still hot.
  [['J1', 'A', 'A~6', 'F', 'J2', 'J3'], 'burnt'],
  // The gate back in too soon: only the first mouth set, and the second pours its lava on the idol's gold.
  [['A', 'A~1.5', 'F', 'J1', 'J2', 'J3'], 'melted'],
  // A little later, but still before the third mouth steamed: its lava lands on Nib's way to the bath.
  [['A', 'A~4', 'F', 'J1', 'J2', 'J3'], 'burnt'],
  // The gate never pushed back: the crown runs away down the sump, and there's no flood left for the boss.
  [['A', 'F', 'J1', 'J2', 'J3'], 'inked'],
  // Nib all the way down before the flood: the bath is still hot lava.
  [['A', 'A~6', 'J1', 'J2', 'J3', 'F'], 'burnt'],
  // The middle jaw before the gate: its hot mouth melts the gold under it.
  [['J2', 'A', 'A~6', 'F', 'J1', 'J3'], 'melted'],
];

describe('The Fire Idol', () => {
  it('is won by its hint in a minute or more: three mouths cooled with a splash each, the rest of the crown on the boss', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // Every mouth set to stone before its jaw opened.
    expect(r.hot).toEqual([0, 0, 0]);
    // Most of the crown was saved for the flood.
    expect(r.flood).toBeGreaterThan(120);
    expect(r.world.blots[0]!.gone).toBe('washed');
    expect(r.world.coinsCollected).toBeGreaterThanOrEqual(FIRE_IDOL.coinsNeeded);
  });

  it('keeps to the grain budget, opens at rest, and starts every grain inside the rooms', () => {
    expect(FIRE_IDOL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
    const w = new World(FIRE_IDOL);
    expect(w.status.state).toBe('playing');
    const g = w.grains;
    for (let i = 0; i < g.count; i++) expect(inRooms(FIRE_IDOL.rooms, g.x[i]!, g.y[i]!)).toBe(true);
  });

  it('gives the Old Salamander its 80 px of headroom', () => {
    const w = new World(FIRE_IDOL);
    const b = w.blots[0]!;
    expect(b.boss).toBe(true);
    expect(b.animal).toBe('salamander');
    expect(w.overlaps(b.x, b.y - b.r - 40, 40)).toBe(false);
  });

  // The gate's window: once the third mouth steams (the earliest win), and late, with the crown low but still enough.
  it.each(WINDOW)('wins with the gate back in after %f s', (wait) => {
    expect(outcome(['A', `A~${wait}`, 'F', 'J1', 'J2', 'J3'])).toBe('won');
  });

  it.each(LOSSES)('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(FIRE_IDOL))), 3_600_000);
}, 600_000);
