import { describe, expect, it } from 'vitest';
import { buildLevel } from '../src/level/build';
import { BEACH_1 } from '../src/level/beach1';
import { Coach, ledgeAhead } from '../src/logic/coach';
import { meterGoal } from '../src/logic/growth';
import { runNote } from '../src/logic/runNote';
import { shellOf } from '../src/logic/shells';
import { Beach, IDLE } from '../src/logic/sim';
import { surfaceRow } from '../src/logic/terrain';

const def = BEACH_1[1]!;

/** Holds right for `seconds`, jumping onto what it can and, when `build`, building steps at a bank too high; returns the furthest column reached. */
function walkRight(b: Beach, seconds: number, build: boolean): number {
  let furthest = 0;
  const T = b.tileSize;
  for (let i = 0; i < seconds * 60; i++) {
    const body = b.crab.body;
    const front = Math.floor((body.x + body.w + 1) / T);
    const walled = surfaceRow(b.terrain, front) < Math.round((body.y + body.h) / T);
    const jump = ledgeAhead(b, 1) !== null;
    b.step({ ...IDLE, moveX: 1, jump, place: build && walled && !jump && body.onGround, aimY: build && walled ? -1 : 0 }, 1 / 60);
    furthest = Math.max(furthest, b.crab.body.x / T);
  }
  return furthest;
}

describe('the second level', () => {
  it('raises its shelf 4 tiles: too high to jump, one step of sand for a full crab in the snail', () => {
    const b = new Beach(buildLevel(def));
    expect(surfaceRow(b.terrain, 32) - surfaceRow(b.terrain, 40)).toBe(4);
    b.crab = { ...b.crab, shell: shellOf('snail', 3), growth: { size: 3, meter: meterGoal(3) } };
    expect(b.jumpTiles).toBeLessThan(4);
    expect(b.jumpTiles).toBeGreaterThanOrEqual(3);
  });

  it('is climbed by building steps at the shelf, not by jumping alone', () => {
    expect(walkRight(new Beach(buildLevel(def)), 12, false)).toBeLessThan(33);
    const builder = new Beach(buildLevel(def));
    builder.crab = { ...builder.crab, sand: 10 };
    expect(walkRight(builder, 12, true)).toBeGreaterThan(40);
  });

  it('buries its cowries in the open sand, none in the shelf', () => {
    const { items, terrain } = buildLevel(def);
    const finds = items.filter((i) => i.kind.type === 'find');
    expect(finds).toHaveLength(3);
    for (const f of finds) expect(surfaceRow(terrain, Math.floor((f.x + f.w / 2) / 16))).toBe(15);
  });

  it('points to the nerite up on the shelf once the snail is full', () => {
    const b = new Beach(buildLevel(def));
    const coach = new Coach(def.teach ?? []);
    b.crab = { ...b.crab, shell: shellOf('snail', 3), growth: { size: 3, meter: meterGoal(3) } };
    coach.observe(b, b.step(IDLE, 1 / 60));
    const h = coach.hint(b, 'keys');
    expect(h?.lesson).toBe('reach');
    expect(Math.floor(h!.target!.x / 16)).toBe(40);
  });

  it('notes how far a run got, for the stats', () => {
    const b = new Beach(buildLevel(def));
    expect(runNote(b)).toBe('size 1/4, finds 0/3');
    b.crab = { ...b.crab, growth: { size: 2, meter: meterGoal(2) } };
    expect(runNote(b)).toBe('size 2/4 full, finds 0/3');
  });
});
