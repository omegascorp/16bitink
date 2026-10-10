import { describe, expect, it } from 'vitest';
import { growRoots } from '../src/level/mangrove';
import { moveBody, type Body } from '../src/logic/body';
import { CRITTER, makeCritter, stepCritter, type Critter, type Quarry, type Surroundings } from '../src/logic/critters';
import { createRng } from '../src/logic/rng';
import { createRoots, isLedge, isRoot, perchRow, setRoot, type Roots } from '../src/logic/roots';
import { Beach, IDLE, type BeachSetup, type Input } from '../src/logic/sim';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;
const W = 48;
const GROUND = 12;

/** Flat sand from row 12; with `mud`, mud four rows deep on top from column 30. */
function flat(mud = false): Terrain {
  const t = createTerrain(W, 20);
  for (let x = 0; x < W; x++) for (let y = GROUND; y < 20; y++) setTile(t, x, y, mud && x >= 30 && y < GROUND + 4 ? TILE.mud : TILE.sand);
  return t;
}

/** A stem up column 20 from the sand to row 4, and a branch along row 4 out to column 27. */
function tree(): Roots {
  const r = createRoots(W, 20);
  for (let y = 4; y < GROUND; y++) setRoot(r, 20, y);
  for (let x = 20; x <= 27; x++) setRoot(r, x, 4);
  return r;
}

function beach(over: Partial<BeachSetup> = {}): Beach {
  return new Beach({ terrain: flat(), items: [], start: { x: 10 * T, y: GROUND * T }, tileSize: T, startShell: 'periwinkle', seed: 1, surfaceFood: 0, roots: tree(), ...over });
}

const run = (b: Beach, input: Partial<Input>, seconds: number) => {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};

/** Puts the crab's feet at (col, row) world tiles, centred on the column. */
const put = (b: Beach, col: number, row: number, onGround = true): void => {
  const c = b.crab.body;
  b.crab = { ...b.crab, body: { ...c, x: col * T + T / 2 - c.w / 2, y: row * T - c.h, vy: 0, onGround } };
};

const feetRow = (b: Beach): number => (b.crab.body.y + b.crab.body.h) / T;

describe('roots', () => {
  it('know their tops (ledges) and the highest root in a column', () => {
    const r = tree();
    expect(isRoot(r, 20, 8)).toBe(true);
    expect(isLedge(r, 20, 8)).toBe(false);
    expect(isLedge(r, 24, 4)).toBe(true);
    expect(perchRow(r, 24)).toBe(4);
    expect(perchRow(r, 30)).toBeNull();
  });

  it('grow from a tree spec: a trunk to the top, with roots down to the mud and leaves over it', () => {
    const t = flat();
    const r = growRoots(t, [[20, 8, 5]], 7);
    for (let y = GROUND - 8; y < GROUND - 3; y++) expect(isRoot(r, 20, y) && isRoot(r, 21, y)).toBe(true);
    // Prop roots reach the ground on both sides.
    expect([...Array(6).keys()].some((d) => isRoot(r, 20 - 2 - d, GROUND - 1) || isRoot(r, 20 - 2 - d, GROUND))).toBe(true);
    expect([...Array(6).keys()].some((d) => isRoot(r, 22 + 2 + d, GROUND - 1) || isRoot(r, 22 + 2 + d, GROUND))).toBe(true);
    expect(r.leaves.length).toBeGreaterThanOrEqual(3);
  });
});

describe('ledges', () => {
  const box = (x: number, y: number): Body => ({ x, y, w: 12, h: 10, vx: 0, vy: 0, onGround: false });
  const ledge = (x: number, y: number): boolean => y === 6 && x >= 4 && x <= 8;

  it('catch a body falling onto them', () => {
    let b = box(5 * T, 2 * T);
    for (let i = 0; i < 120; i++) b = moveBody(flat(), b, 0, 0, 1 / 60, T, undefined, ledge);
    expect(b.y + b.h).toBe(6 * T);
    expect(b.onGround).toBe(true);
  });

  it('let a body through from below, and when it drops (no ledges)', () => {
    let up: Body = { ...box(5 * T, 7 * T), vy: -300 };
    for (let i = 0; i < 10; i++) up = moveBody(flat(), up, 0, 0, 1 / 60, T, undefined, ledge);
    expect(up.y + up.h).toBeLessThan(6 * T);
    let drop = box(5 * T, 6 * T - 10);
    for (let i = 0; i < 120; i++) drop = moveBody(flat(), drop, 0, 0, 1 / 60, T);
    expect(drop.y + drop.h).toBe(GROUND * T);
  });
});

describe('climbing', () => {
  it('starts by holding up among the roots, and climbs', () => {
    const b = beach();
    put(b, 20, GROUND);
    run(b, {}, 0.2);
    expect(b.crab.climbing).toBe(false);
    run(b, { aimY: -1 }, 1);
    expect(b.crab.climbing).toBe(true);
    expect(feetRow(b)).toBeLessThan(GROUND - 2);
  });

  it('hangs on with no gravity when let be, and climbs down', () => {
    const b = beach();
    put(b, 20, GROUND);
    run(b, { aimY: -1 }, 1);
    const y = b.crab.body.y;
    run(b, {}, 1);
    expect(b.crab.body.y).toBe(y);
    run(b, { aimY: 1 }, 0.5);
    expect(b.crab.body.y).toBeGreaterThan(y);
  });

  it('does nothing without roots: holding up is just aiming', () => {
    const b = beach();
    run(b, { aimY: -1 }, 1);
    expect(b.crab.climbing).toBe(false);
    expect(feetRow(b)).toBe(GROUND);
  });

  it('climbs off the top onto the branch, and walks along it', () => {
    const b = beach();
    put(b, 20, GROUND);
    run(b, { aimY: -1 }, 4);
    expect(b.crab.climbing).toBe(false);
    expect(feetRow(b)).toBe(4);
    run(b, { moveX: 1 }, 0.8);
    expect(feetRow(b)).toBe(4);
    expect(b.crab.body.x).toBeGreaterThan(22 * T);
  });

  it('drops off a branch holding down, and lets go with a jump', () => {
    const b = beach();
    put(b, 24, 4);
    run(b, {}, 0.3);
    expect(feetRow(b)).toBe(4);
    run(b, { aimY: 1 }, 1.2);
    expect(feetRow(b)).toBe(GROUND);
    const c = beach();
    put(c, 20, GROUND);
    run(c, { aimY: -1 }, 0.6);
    run(c, { jump: true }, 1 / 60);
    expect(c.crab.climbing).toBe(false);
    run(c, {}, 1.5);
    expect(feetRow(c)).toBe(GROUND);
  });

  it('lets go when it pulls into its shell', () => {
    const b = beach();
    put(b, 20, GROUND);
    run(b, { aimY: -1 }, 1);
    run(b, { hide: true }, 1.5);
    expect(b.crab.climbing).toBe(false);
    expect(feetRow(b)).toBe(GROUND);
  });

  it('keeps food on the roots where it falls', () => {
    const b = beach({ surfaceFood: 40, seed: 3 });
    run(b, {}, 60);
    const perched = [...b.items.values()].filter((i) => i.kind.type === 'food' && i.y + i.h === 4 * T);
    expect(perched.length).toBeGreaterThan(0);
  });
});

describe('mud', () => {
  it('slows the crab down', () => {
    const pace = (col: number): number => {
      const b = beach({ terrain: flat(true), roots: undefined });
      put(b, col, GROUND);
      run(b, {}, 0.2);
      const x0 = b.crab.body.x;
      run(b, { moveX: 1 }, 0.5);
      return b.crab.body.x - x0;
    };
    expect(pace(34)).toBeLessThan(pace(4) * 0.7);
  });

  it('digs quicker than sand', () => {
    const dug = (col: number): number => {
      const b = beach({ terrain: flat(true), roots: undefined });
      put(b, col, GROUND);
      run(b, {}, 0.2);
      let n = 0;
      for (const e of run(b, { aimY: 1, dig: true }, 0.6)) if (e.type === 'tiles' && e.dug) n++;
      return n;
    };
    expect(dug(34)).toBeGreaterThan(dug(4));
  });
});

/** Creatures on the flat beach of a test, with the test tree's roots. */
const env = (r: Roots): Surroundings => ({ wet: () => false, root: (x, y) => isRoot(r, x, y) });
const step = (t: Terrain, c: Critter, q: Quarry | null, seconds: number, e: Surroundings): Critter => {
  const rng = createRng(5);
  let out = c;
  for (let i = 0; i < Math.round(seconds * 60); i++) out = stepCritter(t, out, q, 1 / 60, T, rng, e);
  return out;
};
const crabAt = (col: number, row: number, size = 2, over: Partial<Quarry> = {}): Quarry => ({ box: { x: col * T, y: row * T - 12, w: 14, h: 12 }, size, hidden: false, ...over });

describe('herons', () => {
  it('stalk up to a small crab out in the open, freeze to aim, then stab where it is', () => {
    const t = flat();
    const h = makeCritter(1, 6, 8 * T, GROUND * T, 1, 10, 'heron');
    const q = crabAt(16, GROUND);
    let k = h;
    let aimed = false;
    let stabbed = false;
    const rng = createRng(2);
    for (let i = 0; i < 6 * 60 && !stabbed; i++) {
      k = stepCritter(t, k, q, 1 / 60, T, rng, env(tree()));
      if (k.strike !== undefined && k.arm === 0) aimed = true;
      if (k.arm > 0.5) stabbed = true;
    }
    expect(aimed).toBe(true);
    expect(stabbed).toBe(true);
    expect(k.x).toBeGreaterThan(h.x);
    expect(k.aimX).toBeGreaterThan(0);
  });

  it('leave a crab in among the roots alone', () => {
    const k = step(flat(), makeCritter(1, 6, 15 * T, GROUND * T, 1, 10, 'heron'), crabAt(19, GROUND, 2, { inRoots: true }), 4, env(tree()));
    expect(k.strike).toBeUndefined();
    expect(k.arm).toBe(0);
  });

  it('catch a crab in the open with the bill, and glance off one hiding in its shell', () => {
    const open = beach({ roots: undefined, critters: [] });
    put(open, 14, GROUND);
    open.critters.set(99, makeCritter(99, 6, 10 * T, GROUND * T, 1, 10, 'heron'));
    const caught = run(open, {}, 4).filter((e) => e.type === 'caught');
    expect(caught.length).toBeGreaterThanOrEqual(1);
    expect(open.caughtBy).toBe('heron');
    const hiding = beach({ roots: undefined, critters: [] });
    put(hiding, 14, GROUND);
    // Seen first, then hiding as it takes aim.
    hiding.critters.set(99, { ...makeCritter(99, 6, 10 * T, GROUND * T, 1, 10, 'heron'), strike: 0, aimX: 1, aimY: 0.3, reach: 0.8 });
    const events = run(hiding, { hide: true }, 2);
    expect(events.some((e) => e.type === 'caught')).toBe(false);
    expect(hiding.lives).toBe(3);
  });

  it('never stab through the roots', () => {
    const b = beach({ critters: [] });
    put(b, 20, GROUND);
    run(b, { aimY: -1 }, 0.4);
    b.critters.set(99, { ...makeCritter(99, 6, 16 * T, GROUND * T, 1, 10, 'heron'), strike: 0, aimX: 0.8, aimY: -0.6, reach: 1 });
    expect(run(b, {}, 1.5).some((e) => e.type === 'caught')).toBe(false);
  });
});

describe('tree crabs', () => {
  it('take hold of the roots and climb after a smaller crab up there', () => {
    const r = tree();
    const k = makeCritter(1, 5, 20 * T + T / 2, GROUND * T, 1, 10, 'treecrab');
    const after = step(flat(), k, crabAt(20, 6), 3, env(r));
    expect(after.y + after.h).toBeLessThan(GROUND * T - 3 * T);
  });

  it('walk the mud like anything else where there are no roots', () => {
    const k = makeCritter(1, 5, 30 * T, GROUND * T, 1, 10, 'treecrab');
    const after = step(flat(), k, null, 2, env(tree()));
    expect(after.y + after.h).toBeCloseTo(GROUND * T, 3);
    expect(after.x).not.toBe(k.x);
  });

  it('let go and drop on a crab right below them', () => {
    const r = tree();
    const k = { ...makeCritter(1, 5, 20 * T + T / 2, 8 * T, 1, 10, 'treecrab'), y: 8 * T };
    const after = step(flat(), k, crabAt(20, GROUND), 2, env(r));
    expect(after.y + after.h).toBeGreaterThan(GROUND * T - T);
  });
});

describe('mudskippers', () => {
  it('cannot climb: they walk on through under the roots', () => {
    const k = makeCritter(1, 6, 17 * T, GROUND * T, 1, 10, 'mudskipper');
    const after = step(flat(), k, crabAt(20, 6), 3, env(tree()));
    expect(after.y + after.h).toBeCloseTo(GROUND * T, 3);
  });

  it('go after a small crab on the mud', () => {
    const k = makeCritter(1, 6, 12 * T, GROUND * T, -1, 10, 'mudskipper');
    const after = step(flat(), k, crabAt(17, GROUND), 1.5, env(tree()));
    expect(after.dir).toBe(1);
    expect(after.x).toBeGreaterThan(k.x);
  });
});

describe('the heron constants', () => {
  it('give fair warning before the stab', () => {
    expect(CRITTER.aimFor).toBeGreaterThanOrEqual(0.6);
  });
});

describe('sand on the mangrove beach', () => {
  it('is never made or lost, mud included, in random play among the roots', async () => {
    const { buildLevel } = await import('../src/level/build');
    const { BEACH_4 } = await import('../src/level/beach4');
    const b = new Beach(buildLevel(BEACH_4[0]!));
    const count = (): number => b.terrain.tiles.reduce((n, v) => n + (v === TILE.sand || v === TILE.placed || v === TILE.mud ? 1 : 0), 0) + b.crab.sand;
    const start = count();
    const rng = createRng(11);
    let input: Input = IDLE;
    let dug = 0;
    for (let frame = 0; frame < 60 * 90; frame++) {
      const digging = Math.floor(frame / 600) % 2 === 0;
      if (frame % 8 === 0) {
        input = {
          ...IDLE, moveX: [-1, 0, 1][Math.floor(rng() * 3)]!, aimY: ([-1, 0, 1] as const)[Math.floor(rng() * 3)]!,
          jump: rng() < 0.1, dig: digging, place: !digging, hide: rng() < 0.03,
        };
      }
      for (const e of b.step(input, 1 / 60)) if (e.type === 'tiles' && e.dug) dug += e.tiles.length;
      b.lives = 3;
      expect(count()).toBe(start);
    }
    expect(dug).toBeGreaterThan(20);
  }, 30_000);
});

describe('letting go of the roots', () => {
  it('hops clear with a jump even with up still held, catching hold again on the way down', () => {
    const b = beach();
    put(b, 20, GROUND);
    run(b, { aimY: -1 }, 0.6);
    run(b, { aimY: -1, jump: true }, 1 / 60);
    const climbing: boolean[] = [];
    for (let i = 0; i < 12; i++) {
      b.step({ ...IDLE, aimY: -1, moveX: 1 }, 1 / 60);
      climbing.push(b.crab.climbing);
    }
    expect(climbing.slice(0, 6).every((c) => !c)).toBe(true);
  });

  it('digging up beside a root digs rather than taking hold', () => {
    const b = beach();
    put(b, 20, GROUND);
    run(b, { aimY: -1, dig: true }, 0.3);
    expect(b.crab.climbing).toBe(false);
  });

  it('climbs near the mud at the same pace as higher up', () => {
    const r = createRoots(W, 20);
    for (let y = 2; y < GROUND; y++) setRoot(r, 34, y);
    const b = beach({ terrain: flat(true), roots: r });
    put(b, 34, GROUND);
    run(b, { aimY: -1 }, 0.1);
    const y0 = b.crab.body.y;
    run(b, { aimY: -1 }, 0.25);
    const low = y0 - b.crab.body.y;
    run(b, { aimY: -1 }, 0.5);
    const y1 = b.crab.body.y;
    run(b, { aimY: -1 }, 0.25);
    expect(low).toBeCloseTo(y1 - b.crab.body.y, 0);
  });
});
