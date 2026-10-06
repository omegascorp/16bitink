import { describe, expect, it } from 'vitest';
import { meterGoal } from '../src/logic/growth';
import { Beach, IDLE, type Input } from '../src/logic/sim';
import { SWAP_SECONDS } from '../src/logic/swap';
import { createTerrain, setTile, TILE, tileAt, type Terrain } from '../src/logic/terrain';
import { makeItem, type Item } from '../src/logic/items';
import { MOUTH_OFFSET, sandCapacity, shellPx, SHELLS } from '../src/logic/shells';
import { makeCritter } from '../src/logic/critters';

const T = 16;

function flatBeach(items: Item[] = []): Beach {
  const terrain: Terrain = createTerrain(40, 30);
  for (let x = 0; x < 40; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
  return new Beach({ terrain, items, start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: 'bottlecap', seed: 1, surfaceFood: 0 });
}

const step = (b: Beach, input: Partial<Input> = {}, seconds = 1 / 60) => {
  const events = [];
  for (let i = 0; i < Math.max(1, Math.round(seconds * 60)); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};

/** Sand tiles (packed or placed) in the grid. */
const solidSand = (t: Terrain): number => t.tiles.reduce((n, v) => n + (v === TILE.sand || v === TILE.placed ? 1 : 0), 0);

const foodAt = (id: number, x: number, points: number): Item => makeItem(id, { type: 'food', food: 'crumb', points }, x, 10 * T - 8, false);

describe('beach simulation', () => {
  it('drops the crab onto the sand', () => {
    const b = flatBeach();
    step(b, {}, 1);
    expect(b.crab.body.onGround).toBe(true);
  });

  it('eats food it walks over and grows', () => {
    const b = flatBeach([foodAt(1, 5 * T, meterGoal(1))]);
    const events = step(b, {}, 0.5);
    expect(events.some((e) => e.type === 'ate')).toBe(true);
    expect(events.some((e) => e.type === 'grew')).toBe(true);
    expect(b.crab.growth.size).toBe(2);
    expect(b.items.has(1)).toBe(false);
  });

  it('banks food once the bottle cap is full and says so', () => {
    const b = flatBeach([foodAt(1, 5 * T, meterGoal(1) + meterGoal(2) + 3)]);
    const events = step(b, {}, 0.5);
    expect(b.crab.growth.size).toBe(2);
    expect(b.crab.growth.bank).toBe(3);
    expect(events.some((e) => e.type === 'ate' && e.banked > 0)).toBe(true);
    expect(b.capped).toBe(true);
  });

  it('digs the sand below and keeps a clump per tile', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const below = Math.floor((b.crab.body.y + b.crab.body.h) / T);
    const col = Math.floor((b.crab.body.x + b.crab.body.w / 2) / T);
    const events = step(b, { aimY: 1, dig: true });
    const dug = events.find((e) => e.type === 'tiles');
    expect(dug?.type === 'tiles' && dug.dug).toBe(true);
    expect(tileAt(b.terrain, col, below)).toBe(TILE.air);
    expect(b.crab.sand).toBe(dug?.type === 'tiles' ? dug.tiles.length : -1);
  });

  it('places sand with its own button, one clump at a time', () => {
    const b = flatBeach();
    step(b, {}, 1);
    step(b, { aimY: 1, dig: true });
    step(b, {}, 1);
    const before = b.crab.sand;
    const events = step(b, { place: true });
    const placed = events.find((e) => e.type === 'tiles');
    expect(placed?.type === 'tiles' && !placed.dug && placed.tiles.length === 1).toBe(true);
    expect(b.crab.sand).toBe(before - 1);
  });

  it('does nothing when placing with empty claws', () => {
    const b = flatBeach();
    step(b, {}, 1);
    expect(step(b, { place: true }).some((e) => e.type === 'tiles')).toBe(false);
  });

  it('keeps digging while the button is held, and fills up to its shell\'s capacity', () => {
    const b = flatBeach();
    step(b, {}, 1);
    step(b, { aimY: 1, dig: true }, 3);
    expect(b.crab.sand).toBe(sandCapacity(SHELLS.bottlecap));
    expect(b.sandCapacity).toBe(sandCapacity(SHELLS.bottlecap));
    expect(b.crab.body.y + b.crab.body.h).toBeGreaterThan(12 * T);
  });

  it('never loses sand: once full it digs nothing until it unloads', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const total = (): number => solidSand(b.terrain) + b.crab.sand;
    const before = total();
    step(b, { aimY: 1, dig: true }, 3);
    expect(b.crab.sand).toBe(b.sandCapacity);
    const full = solidSand(b.terrain);
    expect(step(b, { moveX: 1, dig: true }, 1).some((e) => e.type === 'tiles' && e.dug)).toBe(false);
    expect(solidSand(b.terrain)).toBe(full);
    expect(total()).toBe(before);
    // Put one clump down and it can dig again.
    step(b, { jump: true });
    step(b, {}, 0.3);
    step(b, { aimY: 1, place: true });
    step(b, {}, 1);
    expect(b.crab.sand).toBe(b.sandCapacity - 1);
    expect(step(b, { aimY: 1, dig: true }).some((e) => e.type === 'tiles' && e.dug)).toBe(true);
    expect(total()).toBe(before);
  });

  it('digs one clump per dig at the smallest size, and drops into the hole', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const bottom = b.crab.body.y + b.crab.body.h;
    const events = step(b, { aimY: 1, dig: true });
    const dug = events.flatMap((e) => (e.type === 'tiles' && e.dug ? e.tiles : []));
    expect(dug).toHaveLength(1);
    expect(b.crab.sand).toBe(1);
    step(b, {}, 0.5);
    expect(b.crab.body.y + b.crab.body.h).toBeCloseTo(bottom + T);
  });

  it('digs straight up through a ceiling', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const top = Math.floor(b.crab.body.y / T);
    const col = Math.floor((b.crab.body.x + b.crab.body.w / 2) / T);
    setTile(b.terrain, col, top - 1, TILE.sand);
    step(b, { aimY: -1, dig: true });
    expect(tileAt(b.terrain, col, top - 1)).toBe(TILE.air);
  });

  it('cuts a climbable step up-ahead from inside a tight tunnel', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const s = { x0: Math.floor(b.crab.body.x / T), x1: Math.floor((b.crab.body.x + b.crab.body.w - 1e-6) / T) };
    const top = Math.floor(b.crab.body.y / T);
    // Bury the crab: solid everywhere except the tiles it occupies.
    for (let x = 0; x < 40; x++) for (let y = 0; y < 10; y++) {
      if (y < top || x < s.x0 || x > s.x1) setTile(b.terrain, x, y, TILE.sand);
    }
    step(b, { moveX: 1, aimY: -1, dig: true });
    step(b, { moveX: 1 }, 0.5);
    expect(Math.floor(b.crab.body.y / T)).toBe(top - 1);
  });

  it('tunnels diagonally down-ahead while walking and digging down', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const bottomRow = (): number => Math.floor((b.crab.body.y + b.crab.body.h - 1e-6) / T);
    const start = { x: b.crab.body.x, row: bottomRow() };
    step(b, { moveX: 1, aimY: 1, dig: true }, 1.5);
    const rows = bottomRow() - start.row;
    const cols = (b.crab.body.x - start.x) / T;
    expect(rows).toBeGreaterThanOrEqual(2);
    // A slope, not a shaft: it moved ahead about as far as it went down.
    expect(cols).toBeGreaterThanOrEqual(rows - 1);
  });

  it('tunnels diagonally up-ahead while walking and digging up', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const s = { x0: Math.floor(b.crab.body.x / T), x1: Math.floor((b.crab.body.x + b.crab.body.w - 1e-6) / T) };
    const top = Math.floor(b.crab.body.y / T);
    for (let x = 0; x < 40; x++) for (let y = 0; y < 10; y++) {
      if (y < top || x < s.x0 || x > s.x1) setTile(b.terrain, x, y, TILE.sand);
    }
    const startX = b.crab.body.x;
    step(b, { moveX: 1, aimY: -1, dig: true }, 1.5);
    const rows = top - Math.floor(b.crab.body.y / T);
    expect(rows).toBeGreaterThanOrEqual(2);
    expect((b.crab.body.x - startX) / T).toBeGreaterThanOrEqual(rows - 1);
  });

  it('builds a pillar out of a deep pit by jumping and dropping sand underfoot', () => {
    const b = flatBeach();
    step(b, {}, 1);
    step(b, { aimY: 1, dig: true }, 2);
    const bottom = b.crab.body.y + b.crab.body.h;
    expect(bottom).toBeGreaterThan(14 * T);
    for (let i = 0; i < 6; i++) {
      step(b, { jump: true });
      step(b, {}, 0.3);
      step(b, { aimY: 1, place: true });
      step(b, {}, 0.6);
    }
    expect(b.crab.body.y + b.crab.body.h).toBeLessThan(bottom - 3 * T);
  });

  it('drops placed sand until it lands, never leaving it in mid-air', () => {
    const b = flatBeach();
    step(b, {}, 1);
    step(b, { aimY: 1, dig: true });
    step(b, {}, 0.5);
    step(b, { jump: true });
    step(b, {}, 0.2);
    expect(b.crab.body.onGround).toBe(false);
    step(b, { aimY: 1, place: true });
    const at = [...b.terrain.tiles].findIndex((v) => v === TILE.placed);
    expect(Math.floor(at / b.terrain.width)).toBe(10);
  });

  it('hops a couple of tiles off the ground, and not again in mid-air', () => {
    const b = flatBeach();
    step(b, {}, 1);
    const ground = b.crab.body.y;
    step(b, { jump: true });
    step(b, {}, 0.1);
    const rising = b.crab.body.vy;
    expect(rising).toBeLessThan(0);
    step(b, { jump: true });
    // A second press in mid-air doesn't relaunch: gravity keeps slowing the climb.
    expect(b.crab.body.vy).toBeGreaterThan(rising);
    let peak = b.crab.body.y;
    for (let i = 0; i < 40; i++) {
      step(b);
      peak = Math.min(peak, b.crab.body.y);
    }
    expect(ground - peak).toBeGreaterThan(2 * T);
    expect(ground - peak).toBeLessThan(3 * T);
    step(b, {}, 1);
    expect(b.crab.body.y).toBeCloseTo(ground, 3);
  });

  it('jumps higher as it grows', () => {
    const peakOf = (size: number): number => {
      const b = flatBeach();
      b.crab = { ...b.crab, growth: { size, meter: 0, bank: 0 } };
      step(b, {}, 1);
      const ground = b.crab.body.y;
      step(b, { jump: true });
      let peak = ground;
      for (let i = 0; i < 90; i++) {
        step(b);
        peak = Math.min(peak, b.crab.body.y);
      }
      return (ground - peak) / T;
    };
    const small = peakOf(1);
    const grown = peakOf(2);
    expect(grown).toBeGreaterThan(small + 0.3);
    expect(grown).toBeLessThan(small + 0.5);
  });

  it('hops out of a two-tile pit', () => {
    const b = flatBeach();
    step(b, {}, 1);
    for (let i = 0; i < 2; i++) {
      step(b, { aimY: 1, dig: true });
      step(b, {}, 0.5);
    }
    expect(b.crab.body.y + b.crab.body.h).toBeCloseTo(12 * T, 3);
    for (let i = 0; i < 4; i++) {
      step(b, { jump: true, moveX: 1 });
      step(b, { moveX: 1 }, 0.6);
    }
    step(b, {}, 1);
    expect(b.crab.body.y + b.crab.body.h).toBeCloseTo(10 * T, 3);
  });

  it('uncovers buried items when their sand is dug', () => {
    const buried = makeItem(1, { type: 'food', food: 'clam', points: 4 }, 5 * T + 2, 10 * T + 2, true);
    const b = flatBeach([buried]);
    step(b, {}, 1);
    const events = step(b, { aimY: 1, dig: true });
    expect(events.some((e) => e.type === 'revealed' && e.id === 1)).toBe(true);
  });

  it('swaps into a bigger shell: exposed for a second, then the banked growth bursts', () => {
    const conchless = makeItem(2, { type: 'shell', shell: 'can' }, 5 * T, 10 * T - 20, false);
    const b = flatBeach([foodAt(1, 5 * T, meterGoal(1) + meterGoal(2) + meterGoal(3) + 1), conchless]);
    step(b, {}, 0.5);
    expect(b.crab.growth.size).toBe(2);
    expect(b.nearbyShell?.id).toBe(2);
    const startEvents = step(b, { interact: true });
    expect(startEvents.some((e) => e.type === 'swapStart')).toBe(true);
    expect(b.exposed).toBe(true);
    // Can't walk off mid-swap.
    const x = b.crab.body.x;
    step(b, { moveX: 1 }, SWAP_SECONDS * 0.5);
    expect(b.crab.body.x).toBe(x);
    const done = step(b, {}, SWAP_SECONDS);
    expect(done.some((e) => e.type === 'swapDone')).toBe(true);
    expect(b.exposed).toBe(false);
    expect(b.crab.shell).toBe('can');
    expect(b.crab.growth.size).toBe(4);
    // The old bottle cap is left behind as a loose shell.
    expect([...b.items.values()].some((i) => i.kind.type === 'shell' && i.kind.shell === 'bottlecap')).toBe(true);
  });

  it('moves house mouth to mouth: ends up in the new shell facing back the way it came', () => {
    const can = makeItem(2, { type: 'shell', shell: 'can' }, 5 * T, 10 * T - 40, false);
    const b = flatBeach([foodAt(1, 5 * T, meterGoal(1)), can]);
    step(b, {}, 0.5);
    const before = b.crab;
    expect(before.facing).toBe(1);
    step(b, { interact: true });
    step(b, {}, SWAP_SECONDS + 0.1);
    expect(b.crab.shell).toBe('can');
    expect(b.crab.facing).toBe(-1);
    // The new shell sat mouth to mouth ahead of the old one, so the crab is now further along.
    const was = before.body.x + before.body.w / 2;
    const now = b.crab.body.x + b.crab.body.w / 2;
    const reach = MOUTH_OFFSET * (shellPx(SHELLS.bottlecap.maxSize) + shellPx(SHELLS.can.maxSize));
    expect(now - was).toBeCloseTo(reach, 0);
    // The old cap is left where the crab was.
    const cap = [...b.items.values()].find((i) => i.kind.type === 'shell' && i.kind.shell === 'bottlecap')!;
    expect(cap.x + cap.w / 2).toBeCloseTo(was, 0);
  });

  it('stays put when a wall is where the new shell would go', () => {
    const can = makeItem(2, { type: 'shell', shell: 'can' }, 5 * T, 10 * T - 40, false);
    const b = flatBeach([foodAt(1, 5 * T, meterGoal(1)), can]);
    step(b, {}, 0.5);
    for (let y = 0; y < 10; y++) setTile(b.terrain, 7, y, TILE.rock);
    const was = b.crab.body.x + b.crab.body.w / 2;
    step(b, { interact: true });
    step(b, {}, SWAP_SECONDS + 0.1);
    expect(b.crab.shell).toBe('can');
    expect(b.crab.body.x + b.crab.body.w / 2).toBeCloseTo(was, 0);
  });

  it('refuses shells the crab does not fit', () => {
    const conch = makeItem(2, { type: 'shell', shell: 'conch' }, 5 * T, 10 * T - 40, false);
    const b = flatBeach([conch]);
    step(b, {}, 0.5);
    expect(b.nearbyShell?.id).toBe(2);
    expect(b.nearbyFits).toBe(false);
    const events = step(b, { interact: true });
    expect(events.some((e) => e.type === 'swapStart')).toBe(false);
  });

  it('keeps the surface stocked with food', () => {
    const terrain: Terrain = createTerrain(40, 16);
    for (let x = 0; x < 40; x++) for (let y = 10; y < 16; y++) setTile(terrain, x, y, TILE.sand);
    const b = new Beach({ terrain, items: [], start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: 'bottlecap', seed: 3, surfaceFood: 4 });
    step(b, {}, 30);
    const food = [...b.items.values()].filter((i) => i.kind.type === 'food');
    expect(food.length).toBeGreaterThan(0);
    expect(food.length).toBeLessThanOrEqual(4);
  });

  describe('ghost crabs', () => {
    /** A ghost crab of `size` standing on the sand just ahead of the crab, facing it. */
    const ahead = (b: Beach, size: number): void => {
      const x = b.crab.body.x + b.crab.body.w + critterGap;
      b.critters.set(99, makeCritter(99, size, x, 10 * T, -1, 10));
    };
    const critterGap = 6;

    it('eats a smaller one it touches and grows from it', () => {
      const b = flatBeach();
      b.crab = { ...b.crab, growth: { size: 2, meter: 0, bank: 0 } };
      step(b, {}, 1);
      ahead(b, 1);
      const events = step(b, { moveX: 1 }, 0.5);
      expect(b.critters.has(99)).toBe(false);
      expect(events.some((e) => e.type === 'ate')).toBe(true);
      expect(b.crab.growth.meter).toBeGreaterThan(0);
    });

    it('is caught by a bigger one: drops its shell and a size, then is safe for a moment', () => {
      const b = flatBeach();
      b.crab = { ...b.crab, growth: { size: 2, meter: 1, bank: 0 } };
      step(b, {}, 1);
      ahead(b, 4);
      const events = step(b, {}, 1);
      expect(events.some((e) => e.type === 'caught')).toBe(true);
      expect(b.crab.shell).toBeNull();
      expect(b.crab.growth.size).toBe(1);
      expect([...b.items.values()].some((i) => i.kind.type === 'shell' && i.kind.shell === 'bottlecap')).toBe(true);
      expect(b.crab.safe).toBeGreaterThan(0);
      // Still touching it, but safe: no second catch.
      expect(step(b, {}, 0.5).some((e) => e.type === 'caught')).toBe(false);
    });

    it('ignores one its own size', () => {
      const b = flatBeach();
      step(b, {}, 1);
      ahead(b, 1);
      const events = step(b, { moveX: 1 }, 0.5);
      expect(events.some((e) => e.type === 'caught' || e.type === 'ate')).toBe(false);
      expect(b.critters.has(99)).toBe(true);
    });

    it('hiding in the shell is safe, and the hunter loses interest', () => {
      const b = flatBeach();
      step(b, {}, 1);
      ahead(b, 4);
      const events = step(b, { hide: true }, 1);
      expect(events.some((e) => e.type === 'caught')).toBe(false);
      expect(b.crab.shell).toBe('bottlecap');
      expect(b.critters.get(99)!.bored).toBeGreaterThan(0);
    });

    it('cannot walk, dig or jump while hiding', () => {
      const b = flatBeach();
      step(b, {}, 1);
      const before = { ...b.crab.body };
      step(b, { hide: true, moveX: 1, jump: true, dig: true, aimY: 1 }, 0.5);
      expect(b.crab.hidden).toBe(true);
      expect(b.crab.body.x).toBe(before.x);
      expect(b.crab.body.y).toBeCloseTo(before.y, 3);
      expect(b.crab.sand).toBe(0);
      step(b, {});
      expect(b.crab.hidden).toBe(false);
    });

    it('cannot hide without a shell', () => {
      const b = flatBeach();
      b.crab = { ...b.crab, shell: null };
      step(b, { hide: true });
      expect(b.crab.hidden).toBe(false);
    });

    it('keeps the beach stocked with ghost crabs, out of sight of the player', () => {
      const terrain: Terrain = createTerrain(120, 30);
      for (let x = 0; x < 120; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
      const b = new Beach({ terrain, items: [], start: { x: 10 * T, y: 10 * T }, tileSize: T, startShell: 'bottlecap', seed: 1, surfaceFood: 0, critters: 4 });
      expect(b.critters.size).toBe(4);
      for (const c of b.critters.values()) expect(Math.abs(c.x - 10 * T)).toBeGreaterThan(12 * T);
    });
  });
});
