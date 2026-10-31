import { describe, expect, it } from 'vitest';
import { BLACK_STEPS as LEVEL } from '../src/level/ch2/blackSteps';
import { LEDGE_T } from '../src/logic/ledges';
import type { Stop } from '../src/logic/level';
import { inRooms } from '../src/logic/rooms';
import { STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** The lid's seat: the slab's top lies here once it has dropped onto it, flush with the chute. */
const SEAT_TOP = 876 - 8 - 2 * LEDGE_T;
/** The armadillo's pen. */
const PEN = { x0: 1110, x1: 1310, y0: 1180, y1: 1252 };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(LEVEL, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** Steps the world until it settles and Nib stands still (as the bot does), at most `steps`. */
function settle(w: World, steps: number): void {
  for (let s = 0; s < steps && !w.finished; s++) {
    w.step();
    if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
  }
}

/** Sends Nib along the stops, as the bot does. */
function walk(w: World, list: readonly Stop[], steps: number): void {
  for (const s of list) {
    if (w.finished) return;
    w.command({ kind: 'goto', x: s.x });
    settle(w, steps);
  }
}

/**
 * Plays the hint step for step the way the bot does (test/solver.ts's play),
 * and also reports where the lid came to rest, how the armadillo went, and
 * the stone left in its pen.
 */
function watchSolution(): { won: boolean; seconds: number; lid: number; armadillo: string; penStone: number } {
  const w = new World(LEVEL);
  const stops = LEVEL.stops ?? [];
  let lid = 0;
  for (const id of LEVEL.solution) {
    w.pull(id);
    settle(w, STEPS_PER_SECOND * 8);
    walk(w, stops, STEPS_PER_SECOND * 8);
    if (id === 'C') lid = w.ledges[1]!.y;
  }
  const g = w.grains;
  let penStone = 0;
  for (let i = 0; i < g.count; i++) if (g.kind[i] === STONE && g.x[i]! > PEN.x0 && g.x[i]! < PEN.x1 && g.y[i]! > PEN.y0 - 20 && g.y[i]! < PEN.y1) penStone++;
  const back = [...stops].reverse();
  walk(w, [...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, lid, armadillo: w.blots[0]!.gone ?? 'alive', penStone };
}

describe('Black Steps', () => {
  it('is won by its hint in a minute or more: the lid shuts the hole, the lava scorches the armadillo and the water sets it', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    expect(r.lid).toBeCloseTo(SEAT_TOP, 0);
    expect(r.armadillo).toBe('scorched');
    expect(r.penStone).toBeGreaterThan(30);
  });

  it('also wins with the water first: it washes the armadillo, and the lava sets on it', () => {
    expect(outcome(['C', 'W', 'V', 'G'])).toBe('won');
  });

  it('keeps to the grain budget', () => {
    expect(LEVEL.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it('opens at rest, with every grain inside the rooms and enough treasure', () => {
    const w = new World(LEVEL);
    const g = w.grains;
    const outside: string[] = [];
    for (let i = 0; i < g.count; i++) if (!inRooms(LEVEL.rooms, g.x[i]!, g.y[i]!)) outside.push(`${g.x[i]!.toFixed(0)},${g.y[i]!.toFixed(0)}`);
    expect(outside).toEqual([]);
    expect(w.coinsTotal).toBeGreaterThanOrEqual(LEVEL.coinsNeeded);
    expect(w.ledges.every((l) => l.state === 'up')).toBe(true);
    expect(w.status.state).toBe('playing');
  });

  it('walking down before any pull drops the gold bridge into the fire: its gold, poured after, melts', () => {
    const w = new World(LEVEL);
    walk(w, LEVEL.stops ?? [], STEPS_PER_SECOND * 8);
    expect(w.ledges[0]!.state).toBe('down');
    expect(w.status.state).toBe('playing');
    w.pull('C');
    settle(w, STEPS_PER_SECOND * 8);
    expect(w.status).toEqual({ state: 'lost', cause: 'melted' });
  });

  it('the lid is Nib’s walk, not a pin: lava poured while he waits short of the second ledge goes through the hole', () => {
    const w = new World(LEVEL);
    w.pull('C');
    settle(w, STEPS_PER_SECOND * 8);
    walk(w, [{ x: 950 }], STEPS_PER_SECOND * 8);
    expect(w.ledges[0]!.state).toBe('down');
    expect(w.ledges[1]!.state).toBe('up');
    w.pull('V');
    settle(w, STEPS_PER_SECOND * 8);
    expect(w.status).toEqual({ state: 'lost', cause: 'melted' });
  });

  it.each([
    // The lava before Nib has walked over the second ledge: it pours through the hole onto the cellar's gold.
    [['V', 'C', 'W', 'G'], 'melted'],
    // Anything but the gold first: Nib walks down at once, over the gold bridge, which falls into the fire; its gold follows it there.
    [['W', 'C', 'V', 'G'], 'melted'],
    // Nib's gate first: he walks all the way down and into the armadillo.
    [['G', 'C', 'V', 'W'], 'inked'],
    // The gate before the lava: Nib drops into the pen onto the armadillo's spikes.
    [['C', 'G', 'V', 'W'], 'pricked'],
    // The gate on the hot lava, before the water: Nib walks into it.
    [['C', 'V', 'G', 'W'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(LEVEL))), 3_600_000);
}, 300_000);
