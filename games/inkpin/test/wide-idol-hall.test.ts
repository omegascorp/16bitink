import { describe, expect, it } from 'vitest';
import { IDOL_HALL } from '../src/level/idolHall';
import type { Stop } from '../src/logic/level';
import { STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';

/** The Great Boar's pins: Nib waits on its ledge while they come out. */
const BOSS_PINS = new Set(['B', 'A', 'R', 'C']);
/** Longest the bot waits for things to settle after a pull, or for Nib to reach a stop. */
const MAX_WAIT = STEPS_PER_SECOND * 8;
/** The idol hall's left wall: the first stop past it is Nib's ledge. */
const HALL_X = 1440;

/**
 * Plays a pull order: through the approach Nib is eager (after each pull,
 * once things settle, it walks the stops up to the idol hall's ledge as far
 * as the way is open), then waits on the ledge while the boss's pins come
 * out, then climbs down to the chest and leaves. Returns 'won', the loss
 * cause, 'playing' (stuck) or 'blocked', the steps taken, and the world.
 */
function drive(order: readonly string[]): { readonly end: string; readonly steps: number; readonly world: World } {
  const w = new World(IDOL_HALL);
  const stops = IDOL_HALL.stops ?? [];
  const ledge = stops.findIndex((s) => s.x > HALL_X);
  const settle = (): void => {
    for (let s = 0; s < MAX_WAIT && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const visit = (list: readonly Stop[]): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command(s.y === undefined ? { kind: 'goto', x: s.x } : { kind: 'goto', x: s.x, y: s.y });
      for (let k = 0; k < MAX_WAIT && !w.finished; k++) {
        w.step();
        if (k > 30 && w.nibOrder.kind === 'stay') break;
      }
    }
  };
  for (const id of order) {
    if (w.finished) break;
    if (!w.pull(id)) return { end: 'blocked', steps: w.steps, world: w };
    settle();
    if (!BOSS_PINS.has(id)) visit(stops.slice(0, ledge + 1));
  }
  visit(stops.slice(ledge));
  w.leave();
  return { end: w.status.state === 'lost' ? w.status.cause : w.status.state, steps: w.steps, world: w };
}

describe('The Idol Hall, wide', () => {
  it('wins with the hint, and takes the bot at least a minute', () => {
    const r = drive(IDOL_HALL.solution);
    expect(r.end).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('rides the crate down into its pit, sets the moat to stone and grows the seed', () => {
    const w = drive(IDOL_HALL.solution).world;
    const crate = w.boulders.find((b) => b.crate)!;
    expect(crate.gone).toBe(false);
    // Settled in the pit, its top about level with the floor.
    expect(Math.abs(crate.x - 436)).toBeLessThan(8);
    expect(crate.y).toBeGreaterThan(650);
    let stone = 0;
    for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === STONE) stone++;
    expect(stone).toBeGreaterThan(50);
    expect(w.vines[0]!.grown).toBe(1);
    expect(w.blots[0]!.gone).toBe('washed');
  });

  it('walks Nib into the lava moat when the gate opens before its water', () => {
    expect(drive(['K', 'G', 'M', 'D', 'S', 'B', 'A', 'R', 'C']).end).toBe('burnt');
  });

  it('melts the moat’s gold when it comes before the water', () => {
    expect(drive(['K', 'D', 'M', 'G', 'S', 'B', 'A', 'R', 'C']).end).toBe('melted');
  });

  it('never beats the Great Boar when the cistern opens before both tanks are in it', () => {
    expect(['inked', 'playing']).toContain(drive(['K', 'M', 'D', 'G', 'S', 'R', 'A', 'B', 'C']).end);
  });
}, 120_000);
