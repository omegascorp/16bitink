import { describe, expect, it } from 'vitest';
import { carve } from '../src/level/carve';
import { BEACH_9 } from '../src/level/beach9';
import { buildLevel, levelGoal } from '../src/level/build';
import { makeBird } from '../src/logic/birds';
import { makeCritter } from '../src/logic/critters';
import { FOG } from '../src/logic/fog';
import { centre, food, makeItem } from '../src/logic/items';
import { shellOf, type Shell } from '../src/logic/shells';
import { Beach, IDLE, type BeachSetup, type Input } from '../src/logic/sim';
import { isDiggable, isSolid, surfaceRow, tileAt, TILE } from '../src/logic/terrain';
import { inLee, isGusting, scentRange, WIND, windAt, windShare, windTurn, type WindSpec } from '../src/logic/wind';

const T = 16;
const GROUND = 12;
const W = 64;
const flat = () => carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });

describe('wind gusts', () => {
  // 30 s a cycle: 22 s calm (the gust getting up over the last 2 of them), then 8 s of gust.
  const spec: WindSpec = { period: 30, gust: 8 };

  it('stays calm, gets up as a warning, blows, then dies away', () => {
    expect(windAt(spec, 5)).toBe(0);
    const rising = windAt(spec, 22 - WIND.build / 2);
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(1);
    expect(windAt(spec, 25)).toBe(1);
    expect(isGusting(spec, 25)).toBe(true);
    const dying = windAt(spec, 30 - WIND.ease / 2);
    expect(dying).toBeGreaterThan(0);
    expect(dying).toBeLessThan(1);
    expect(windAt(spec, 35)).toBe(0);
    expect(isGusting(spec, 35)).toBe(false);
  });

  it('blows the way it is set, or turns about each gust in a storm', () => {
    expect(windAt({ ...spec, dir: -1 }, 25)).toBe(-1);
    const storm: WindSpec = { ...spec, turns: true };
    expect(windAt(storm, 25)).toBe(1);
    expect(windAt(storm, 55)).toBe(-1);
    expect(windAt(storm, 85)).toBe(1);
    // Getting up, it already blows the coming gust's way.
    expect(windAt(storm, 52 - WIND.build / 2)).toBeLessThan(0);
  });

  it('tells the clock how long until it gusts or dies down, and which way', () => {
    expect(windTurn(spec, 5)).toEqual({ gusting: false, dir: 1, seconds: 17 });
    expect(windTurn(spec, 24)).toEqual({ gusting: true, dir: 1, seconds: 6 });
    expect(windTurn({ ...spec, turns: true }, 40).dir).toBe(-1);
  });

  it('is always calm without a spec', () => {
    expect(windAt(undefined, 25)).toBe(0);
    expect(isGusting(undefined, 25)).toBe(false);
  });

  it('shoves a light shell hardest and a heavy one least', () => {
    expect(windShare(1)).toBeGreaterThan(windShare(2));
    expect(windShare(2)).toBeGreaterThan(windShare(3));
    expect(windShare(null)).toBeGreaterThan(windShare(1));
  });
});

describe('the lee', () => {
  const box = { x: 20 * T, y: GROUND * T - 10, w: 12, h: 10 };

  it('is out in the open on flat sand', () => {
    expect(inLee(flat(), box, -1, T)).toBe(false);
  });

  it('is behind a boulder upwind, but not with the boulder downwind', () => {
    const t = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]], rocks: [[18, GROUND, 1.8]] });
    // Wind from the left: the boulder at column 18 is upwind of the crab at 20.
    expect(inLee(t, box, -1, T)).toBe(true);
    // Wind from the right: nothing upwind.
    expect(inLee(t, box, 1, T)).toBe(false);
  });
});

describe('scent on the wind', () => {
  it('carries a crab\'s scent far downwind of it, and none upwind', () => {
    expect(scentRange(5, 0, 0, 100)).toBe(5);
    // Wind blowing right: a fox to the right of the crab is downwind.
    expect(scentRange(5, 1, 200, 100)).toBe(5 * WIND.scent);
    expect(scentRange(5, 1, 0, 100)).toBe(FOG.near);
  });
});

/** A flat beach, the crab at column 20, with whatever else a test needs. */
function shingle(over: Partial<BeachSetup> = {}, shell: Shell = shellOf('periwinkle')): Beach {
  return new Beach({
    terrain: flat(), items: [], start: { x: 20 * T + T / 2, y: GROUND * T }, tileSize: T, startShell: shell, seed: 3, surfaceFood: 0, ...over,
  });
}

/** Runs the beach `seconds` with the same input every frame. */
function run(b: Beach, seconds: number, input: Partial<Input> = {}): void {
  for (let i = 0; i < seconds * 60; i++) b.step({ ...IDLE, ...input }, 1 / 60);
}

/** Gusting from the start, blowing right. */
const GALE: WindSpec = { period: 100, gust: 60, offset: 41 };

/** World x the crab's middle moves in `seconds` standing still. */
function drift(b: Beach, seconds: number, input: Partial<Input> = {}): number {
  const from = centre(b.crab.body).x;
  run(b, seconds, input);
  return centre(b.crab.body).x - from;
}

describe('wind on the beach', () => {
  it('blows a crab out in the open along the way it blows, a heavy shell less', () => {
    const light = drift(shingle({ wind: GALE }), 1);
    const heavy = drift(shingle({ wind: GALE }, shellOf('icelandwhelk', 5)), 1);
    expect(light).toBeGreaterThan(T);
    expect(heavy).toBeGreaterThan(0);
    expect(heavy).toBeLessThan(light);
    expect(drift(shingle({ wind: { ...GALE, dir: -1 } }), 1)).toBeLessThan(-T);
  });

  it('leaves a crab in the lee of a boulder where it is', () => {
    const terrain = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]], rocks: [[18, GROUND, 1.8]] });
    const b = shingle({ terrain, wind: GALE });
    expect(b.sheltered(b.crab.body)).toBe(true);
    expect(Math.abs(drift(b, 1))).toBeLessThan(1);
  });

  it('carries a jump with the wind behind it further', () => {
    const jumpRun = (wind?: WindSpec): number => {
      const b = shingle({ wind });
      run(b, 0.2);
      const from = centre(b.crab.body).x;
      b.step({ ...IDLE, jump: true, moveX: 1 }, 1 / 60);
      for (let i = 0; i < 120 && !(b.crab.body.onGround && i > 5); i++) b.step({ ...IDLE, moveX: 1 }, 1 / 60);
      return centre(b.crab.body).x - from;
    };
    expect(jumpRun(GALE)).toBeGreaterThan(jumpRun() * 1.4);
  });

  it('can\'t shift a crab clamped down in its shell on sand', () => {
    expect(Math.abs(drift(shingle({ wind: GALE }), 1, { hide: true }))).toBeLessThan(1);
  });

  it('keeps a bird from stooping on a crab out in the open while it gusts', () => {
    const dives = (wind: WindSpec): boolean => {
      const b = shingle({ wind });
      b.birds.set(999, makeBird(999, 6, centre(b.crab.body).x, 2 * T, 1, 'snowyowl'));
      run(b, 6);
      return b.lives < 3;
    };
    expect(dives({ period: 100, gust: 10 })).toBe(true);
    // Out in the open in a gust, the owl can't hold a hover over it.
    expect(dives(GALE)).toBe(false);
  });

  it('lets an Arctic fox smell a crab downwind of it, not upwind', () => {
    const notices = (wind: WindSpec, side: 1 | -1): boolean => {
      const b = shingle({ wind });
      // Hold the crab in its shell's lee-less spot: a heavy shell barely moves.
      const k = makeCritter(500, 6, centre(b.crab.body).x + side * 4 * T, GROUND * T, side, 99, 'arcticfox');
      b.critters.clear();
      b.critters.set(k.id, k);
      run(b, 0.3);
      const after = b.critters.get(k.id)!;
      return after.dir === -side;
    };
    // Blowing right: a fox to the right is downwind of the crab and smells it; one to the left doesn't.
    expect(notices(GALE, 1)).toBe(true);
    expect(notices(GALE, -1)).toBe(false);
  });

  it('blows food into the lee quickly while it gusts', () => {
    const terrain = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]], rocks: [[30, GROUND, 1.8], [46, GROUND, 1.8]] });
    const b = shingle({ terrain, wind: GALE, surfaceFood: 6 });
    run(b, 8);
    const loose = [...b.items.values()].filter((i) => i.kind.type === 'food' && !i.buried);
    expect(loose.length).toBeGreaterThan(0);
    const sheltered = loose.filter((i) => inLee(terrain, { x: i.x, y: i.y, w: i.w, h: i.h }, -1, T));
    expect(sheltered.length).toBeGreaterThan(loose.length / 2);
  });
});

/** A flat beach with a frozen pool from column 14 to 33. */
function icy(over: Partial<BeachSetup> = {}): Beach {
  const terrain = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]], ice: [[14, 20, 2]] });
  return shingle({ terrain, ...over });
}

describe('ice', () => {
  it('is laid flat at the lowest ground across the pool, solid and never dug', () => {
    const t = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [20, GROUND], [21, GROUND + 1], [W - 1, GROUND + 1]], ice: [[16, 10, 2]] });
    for (let x = 16; x < 26; x++) {
      expect(surfaceRow(t, x)).toBe(GROUND + 1);
      expect(tileAt(t, x, GROUND + 1)).toBe(TILE.ice);
      expect(tileAt(t, x, GROUND + 2)).toBe(TILE.ice);
      expect(isSolid(t, x, GROUND + 1)).toBe(true);
      expect(isDiggable(t, x, GROUND + 1)).toBe(false);
    }
  });

  it('carries the slide on through a jump off the ice', () => {
    const b = icy();
    run(b, 1.2, { moveX: 1 });
    const pace = b.crab.body.vx;
    b.step({ ...IDLE, jump: true }, 1 / 60);
    b.step(IDLE, 1 / 60);
    expect(b.crab.body.onGround).toBe(false);
    expect(b.crab.body.vx).toBeGreaterThan(pace * 0.8);
  });

  it('slides a crab on after it lets go, where on sand it stops', () => {
    const coast = (b: Beach): number => {
      run(b, 1.2, { moveX: 1 });
      return drift(b, 0.6);
    };
    const onIce = icy();
    run(onIce, 0.3);
    expect(onIce.onIce(onIce.crab.body)).toBe(true);
    expect(coast(onIce)).toBeGreaterThan(T);
    expect(coast(shingle())).toBeLessThan(1);
  });

  it('lets a gust sweep a crab across it harder than over sand, hidden or not', () => {
    const sand = drift(shingle({ wind: GALE }), 1);
    expect(drift(icy({ wind: GALE }), 1)).toBeGreaterThan(sand);
    expect(drift(icy({ wind: GALE }), 1, { hide: true })).toBeGreaterThan(T);
  });

  it('gets a grip again on sand dropped on it', () => {
    const b = icy();
    run(b, 0.3);
    // A layer of sand over the ice just ahead.
    for (let x = 21; x < 30; x++) b.terrain.tiles[(GROUND - 1) * W + x] = TILE.placed;
    run(b, 0.6, { moveX: 1 });
    expect(b.onIce(b.crab.body)).toBe(false);
    expect(Math.abs(drift(b, 0.6))).toBeLessThan(1);
  });

  it('never has anything buried in it', () => {
    for (const def of BEACH_9.filter((d) => d.ice?.length)) {
      const setup = buildLevel(def);
      for (const i of setup.items.filter((it) => it.buried)) {
        const at = centre(i);
        expect(tileAt(setup.terrain, Math.floor(at.x / T), Math.floor(at.y / T))).not.toBe(TILE.ice);
      }
    }
  });
});

describe('frost shingle', () => {
  it('brings the wind from the second level on, never more gust than calm, the first gust soon', () => {
    expect(BEACH_9[0]!.wind).toBeUndefined();
    for (const def of BEACH_9.slice(1)) {
      const wind = def.wind!;
      expect(wind, def.id).toBeDefined();
      expect(wind.gust).toBeLessThanOrEqual(wind.period - wind.gust);
      const firstGust = wind.period - wind.gust - (wind.offset ?? 0);
      expect(firstGust, def.id).toBeLessThanOrEqual(30);
      expect(firstGust, def.id).toBeGreaterThan(WIND.build);
    }
  });

  for (const def of BEACH_9) {
    describe(def.id, () => {
      it('keeps its frozen pools clear of the start, inside the beach', () => {
        for (const [col, width] of def.ice ?? []) {
          expect(col).toBeGreaterThan(def.startCol + 6);
          expect(col + width).toBeLessThan(def.width - 2);
        }
      });

      it('keeps its hunters under the goal, with one fox and one owl at most', () => {
        const goal = levelGoal(def);
        for (const g of def.critters ?? []) expect(g.sizes[1]).toBeLessThan(goal);
        for (const g of def.birds ?? []) expect(g.size).toBeLessThan(goal);
        const foxes = (def.critters ?? []).filter((g) => g.species === 'arcticfox').reduce((n, g) => n + g.count, 0);
        expect(foxes).toBeLessThanOrEqual(1);
        expect((def.birds ?? []).reduce((n, g) => n + g.count, 0)).toBeLessThanOrEqual(1);
      });
    });
  }

  it('places every shell it lays out, none lost in the ice', () => {
    for (const def of BEACH_9) {
      const shells = buildLevel(def).items.filter((i) => i.kind.type === 'shell');
      expect(shells.length, def.id).toBe(def.shells.length);
    }
  });

  it('starts the crab on sand, never on ice', () => {
    for (const def of BEACH_9) {
      const b = new Beach(buildLevel(def));
      for (let i = 0; i < 30; i++) b.step(IDLE, 1 / 60);
      expect(b.onIce(b.crab.body), def.id).toBe(false);
    }
  });

  it('lays a food item on the ice without sinking it', () => {
    const terrain = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]], ice: [[14, 20, 2]] });
    const proto = makeItem(1, food('crumb'), 0, 0, false);
    const b = shingle({ terrain, items: [{ ...proto, x: 22 * T, y: (GROUND - 4) * T }] });
    run(b, 2);
    const item = b.items.get(1)!;
    expect(item.y + item.h).toBeCloseTo(GROUND * T, 0);
  });
});
