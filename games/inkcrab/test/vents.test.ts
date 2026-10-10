import { describe, expect, it } from 'vitest';
import { shellOf } from '../src/logic/shells';
import { carve } from '../src/level/carve';
import { BEACH_5 } from '../src/level/beach5';
import { buildLevel, TILE_PX } from '../src/level/build';
import { makeCritter } from '../src/logic/critters';
import { food, makeItem } from '../src/logic/items';
import { Beach, IDLE, type BeachSetup, type Input } from '../src/logic/sim';
import { setTile, surfaceRow, TILE } from '../src/logic/terrain';
import { plugged, VENT, ventState, type Vent } from '../src/logic/vents';

const T = 16;
const COL = 20;
/** A vent that throws 8 tiles every 5 s, blowing from 4.3 s to 5 s. */
const SPEC = { col: COL, height: 8, period: 5, offset: 0 } as const;

function beach(over: Partial<BeachSetup> = {}): Beach {
  const terrain = carve({ width: 48, height: 24, seed: 1, profile: [[0, 12], [47, 12]], vents: [COL] });
  const floor = surfaceRow(terrain, COL);
  const vent: Vent = { ...SPEC, top: floor - VENT.shaft, floor };
  return new Beach({ terrain, items: [], start: { x: 6 * T, y: 12 * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0, vents: [vent], ...over });
}

const run = (b: Beach, input: Partial<Input>, seconds: number) => {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};

/** Stands the crab on the vent's rim, straddling the shaft. */
const onVent = (b: Beach): void => {
  const c = b.crab.body;
  const v = b.vents[0]!;
  b.crab = { ...b.crab, body: { ...c, x: (COL + 0.5) * T - c.w / 2, y: v.top * T - c.h, vy: 0, onGround: true } };
};

describe('vent rhythm', () => {
  it('is quiet, then hisses (the warning), then blows, every period', () => {
    expect(ventState(SPEC, 1).phase).toBe('quiet');
    expect(ventState(SPEC, 3.5).phase).toBe('hiss');
    expect(ventState(SPEC, 4.6).phase).toBe('blow');
    expect(ventState(SPEC, 6).phase).toBe('quiet');
    expect(ventState(SPEC, 9.6).puff).toBe(ventState(SPEC, 4.6).puff + 1);
  });

  it('hisses long enough to see it coming', () => {
    expect(VENT.hiss).toBeGreaterThanOrEqual(1);
  });
});

describe('steam vents', () => {
  it('carve a rock-walled shaft open to the sky', () => {
    const b = beach();
    const v = b.vents[0]!;
    expect(plugged(b.terrain, v)).toBe(false);
    expect(b.terrain.tiles[v.floor * b.terrain.width + COL]).toBe(TILE.rock);
    expect(b.terrain.tiles[v.top * b.terrain.width + COL - 1]).toBe(TILE.rock);
  });

  it('throw a crab standing over them about as high as they say, once a blow', () => {
    const b = beach();
    run(b, {}, 0.2);
    onVent(b);
    const feet = b.crab.body.y + b.crab.body.h;
    let highest = feet;
    let thrown = 0;
    for (let i = 0; i < 5 * 60; i++) {
      for (const e of b.step({ ...IDLE }, 1 / 60)) if (e.type === 'thrown') thrown++;
      highest = Math.min(highest, b.crab.body.y + b.crab.body.h);
    }
    expect(thrown).toBe(1);
    // Up to `height` tiles over the rim, from wherever it was (a small crab drops into the shaft first).
    const rim = b.vents[0]!.top * T;
    expect((rim - highest) / T).toBeGreaterThan(SPEC.height - 0.5);
    expect((rim - highest) / T).toBeLessThan(SPEC.height + 0.5);
    expect(feet).toBeLessThanOrEqual(rim);
  });

  it('never harm the crab, hidden in its shell or not', () => {
    const b = beach();
    onVent(b);
    const events = run(b, { hide: true }, 5);
    expect(events.some((e) => e.type === 'thrown')).toBe(true);
    expect(b.lives).toBe(3);
  });

  it('stay quiet when sand plugs the shaft', () => {
    const b = beach();
    const v = b.vents[0]!;
    setTile(b.terrain, COL, v.floor - 1, TILE.placed);
    expect(plugged(b.terrain, v)).toBe(true);
    onVent(b);
    expect(run(b, {}, 5).some((e) => e.type === 'thrown')).toBe(false);
  });

  it('toss creatures and loose food over them too', () => {
    const b = beach({ critters: [] });
    const v = b.vents[0]!;
    // Just before it blows, so the creature hasn't wandered off.
    run(b, {}, 4.2);
    b.critters.set(90, makeCritter(90, 3, (COL + 0.5) * T, v.top * T, 1, 99, 'sallycrab'));
    const crumb = makeItem(91, food('crumb'), (COL + 0.5) * T - 4, v.top * T - 6, false);
    b.items.set(91, crumb);
    let critterTop = Infinity;
    let foodTop = Infinity;
    for (let i = 0; i < 2 * 60; i++) {
      b.step({ ...IDLE }, 1 / 60);
      critterTop = Math.min(critterTop, b.critters.get(90)?.y ?? Infinity);
      foodTop = Math.min(foodTop, b.items.get(91)?.y ?? Infinity);
    }
    expect(critterTop).toBeLessThan((v.top - 4) * T);
    expect(foodTop).toBeLessThan((v.top - 4) * T);
  });
});

describe('ash & basalt', () => {
  for (const def of BEACH_5) {
    it(`${def.id}: every shell on a column has a vent beside it that throws high enough to reach it`, () => {
      const setup = buildLevel(def);
      for (const [kind, col, depth] of def.shells) {
        const ground = Math.max(surfaceRow(setup.terrain, col - 6), surfaceRow(setup.terrain, col + 6));
        const rise = ground - surfaceRow(setup.terrain, col);
        if (depth !== 0 || rise < 3) continue;
        const vent = setup.vents!.find((v) => Math.abs(v.col - col) <= 6 && v.top - v.height < surfaceRow(setup.terrain, col) - 1);
        expect(vent, `${kind} at ${col}`).toBeDefined();
      }
      expect(TILE_PX).toBe(T);
    });
  }
});
