import { describe, expect, it } from 'vitest';
import { carve } from '../src/level/carve';
import { makeBird } from '../src/logic/birds';
import { makeCritter, stepCritter, type Critter, type Quarry } from '../src/logic/critters';
import { deckAt, layDeck, onDeck, underDeck, type Deck } from '../src/logic/decks';
import { centre, food, makeItem } from '../src/logic/items';
import { isPouring, RAIN, rainAt, rainTurn, type RainSpec } from '../src/logic/rain';
import { createRng } from '../src/logic/rng';
import { Beach, IDLE, type BeachSetup } from '../src/logic/sim';
import { placeCritter } from '../src/logic/spawn';
import { groundRow, isDiggable, isSolid, surfaceRow, tileAt, TILE } from '../src/logic/terrain';

const T = 16;
const GROUND = 12;
const W = 64;
const flat = () => carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });

describe('monsoon rain', () => {
  // 30 s a cycle: 20 s dry (the squall building over the last 3 of them), then 10 s of downpour.
  const spec: RainSpec = { period: 30, pour: 10 };

  it('stays dry, builds as a warning, pours, then eases off and clears', () => {
    expect(rainAt(spec, 5)).toBe(0);
    expect(isPouring(spec, 5)).toBe(false);
    // Building: the first drops, not yet a downpour.
    const building = rainAt(spec, 20 - RAIN.build / 2);
    expect(building).toBeGreaterThan(0);
    expect(building).toBeLessThan(1);
    expect(isPouring(spec, 20 - RAIN.build / 2)).toBe(false);
    expect(rainAt(spec, 22)).toBe(1);
    expect(isPouring(spec, 22)).toBe(true);
    // Easing off at the end of the downpour, still pouring.
    const easing = rainAt(spec, 30 - RAIN.ease / 2);
    expect(easing).toBeGreaterThan(0);
    expect(easing).toBeLessThan(1);
    expect(isPouring(spec, 30 - RAIN.ease / 2)).toBe(true);
    // And round again.
    expect(rainAt(spec, 35)).toBe(0);
    expect(isPouring(spec, 52)).toBe(true);
  });

  it('starts its rhythm `offset` seconds in', () => {
    const soon: RainSpec = { ...spec, offset: 15 };
    expect(isPouring(soon, 6)).toBe(true);
    expect(isPouring(soon, 4)).toBe(false);
  });

  it('tells the clock how long until it pours, or until it clears', () => {
    expect(rainTurn(spec, 5)).toEqual({ pouring: false, seconds: 15 });
    expect(rainTurn(spec, 24)).toEqual({ pouring: true, seconds: 6 });
  });

  it('is never anything but dry without a spec', () => {
    expect(rainAt(undefined, 25)).toBe(0);
    expect(isPouring(undefined, 25)).toBe(false);
  });
});

describe('decks', () => {
  it('lays a level floor of wood its clearance over the highest sand under it', () => {
    const t = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [20, GROUND], [21, GROUND - 1], [W - 1, GROUND - 1]] });
    const deck = layDeck(t, [16, 8, 2, 'boat']);
    const high = Math.min(...Array.from({ length: 8 }, (_, k) => groundRow(t, 16 + k)));
    expect(deck.row).toBe(high - 3);
    for (let x = 16; x < 24; x++) {
      expect(tileAt(t, x, deck.row)).toBe(TILE.wood);
      // Open underneath, down to the sand.
      for (let y = deck.row + 1; y < groundRow(t, x); y++) expect(isSolid(t, x, y)).toBe(false);
      expect(groundRow(t, x) - deck.row - 1).toBeGreaterThanOrEqual(2);
    }
    expect(tileAt(t, 15, deck.row)).toBe(TILE.air);
    expect(tileAt(t, 24, deck.row)).toBe(TILE.air);
  });

  it('is stood on but never dug, and the sand under it is still the ground', () => {
    const t = flat();
    const deck = layDeck(t, [20, 5, 2, 'house']);
    expect(isSolid(t, 22, deck.row)).toBe(true);
    expect(isDiggable(t, 22, deck.row)).toBe(false);
    expect(surfaceRow(t, 22)).toBe(deck.row);
    expect(groundRow(t, 22)).toBe(GROUND);
  });

  it('knows what is under a deck and what is up on one', () => {
    const decks: Deck[] = [{ col: 20, width: 5, row: GROUND - 3, kind: 'rack' }];
    expect(deckAt(decks, 22)).toBe(decks[0]);
    expect(deckAt(decks, 25)).toBeNull();
    const under = { x: 21 * T, y: GROUND * T - 10, w: 12, h: 10 };
    const onTop = { x: 21 * T, y: (GROUND - 3) * T - 10, w: 12, h: 10 };
    expect(underDeck(decks, under, T)).toBe(true);
    expect(onDeck(decks, under, T)).toBe(false);
    expect(underDeck(decks, onTop, T)).toBe(false);
    expect(onDeck(decks, onTop, T)).toBe(true);
    expect(underDeck(decks, { ...under, x: 30 * T }, T)).toBe(false);
  });

  it('never has creatures appear on a deck or under it', () => {
    const t = flat();
    const deck = layDeck(t, [10, 44, 2, 'house']);
    const rng = createRng(5);
    for (let i = 0; i < 40; i++) {
      const k = placeCritter({ terrain: t, tile: T, rng, crabCol: 60, pits: [], dens: [], critters: [], surroundings: { wet: () => false }, start: true }, i, 'mudcrab', [3, 3]);
      if (!k) continue;
      expect(deckAt([deck], Math.floor(centre(k).x / T))).toBeNull();
    }
  });
});

/** A flat beach, the crab at column 8, with whatever else a test needs. */
function harbour(over: Partial<BeachSetup> = {}): Beach {
  const terrain = flat();
  return new Beach({
    terrain, items: [], start: { x: 8 * T + T / 2, y: GROUND * T }, tileSize: T, startShell: 'periwinkle', seed: 3, surfaceFood: 0, ...over,
  });
}

/** Runs the beach `seconds`, the crab standing still (or hiding). */
function run(b: Beach, seconds: number, hide = false): void {
  for (let i = 0; i < seconds * 60; i++) b.step({ ...IDLE, hide }, 1 / 60);
}

describe('rain on the beach', () => {
  const pouring: RainSpec = { period: 100, pour: 60, offset: 41 };
  const dry: RainSpec = { period: 100, pour: 10 };

  it('keeps birds from stooping on a crab out in the open while it pours', () => {
    const wet = harbour({ rain: pouring, birds: [{ count: 1, size: 6, species: 'brahminy' }] });
    const b = makeBird(999, 6, centre(wet.crab.body).x, 2 * T, 1, 'brahminy');
    wet.birds.clear();
    wet.birds.set(b.id, b);
    run(wet, 6);
    expect(wet.lives).toBe(3);
    expect([...wet.birds.values()].every((x) => x.phase !== 'dive')).toBe(true);

    const fine = harbour({ rain: dry, birds: [{ count: 1, size: 6, species: 'brahminy' }] });
    fine.birds.clear();
    fine.birds.set(b.id, b);
    run(fine, 6);
    expect(fine.lives).toBeLessThan(3);
  });

  it('half-blinds a mud crab, but not a monitor that tastes the air', () => {
    const chases = (species: 'mudcrab' | 'monitor', rain: RainSpec): boolean => {
      const b = harbour({ rain });
      const k = makeCritter(500, 6, centre(b.crab.body).x + 3.5 * T, GROUND * T, 1, 99, species);
      b.critters.clear();
      b.critters.set(k.id, k);
      run(b, 0.3);
      const after = b.critters.get(k.id)!;
      return after.dir === -1 && centre(after).x < centre(k).x;
    };
    expect(chases('mudcrab', dry)).toBe(true);
    expect(chases('mudcrab', pouring)).toBe(false);
    expect(chases('monitor', pouring)).toBe(true);
  });

  it('washes food out on the sand quickly, past the usual stock, while it pours', () => {
    const count = (b: Beach): number => [...b.items.values()].filter((i) => i.kind.type === 'food' && !i.buried).length;
    const wet = harbour({ rain: pouring, surfaceFood: 4 });
    const fine = harbour({ rain: dry, surfaceFood: 4 });
    run(wet, 12);
    run(fine, 12);
    expect(count(fine)).toBeLessThanOrEqual(4);
    expect(count(wet)).toBeGreaterThan(4);
    expect(count(wet)).toBeLessThanOrEqual(Math.ceil(4 * (1 + RAIN.extra)));
  });

  it('makes wet sand quick to dig', () => {
    const digs = (rain: RainSpec): number => {
      const b = harbour({ rain });
      let dug = 0;
      for (let i = 0; i < 60; i++) {
        const events = b.step({ ...IDLE, dig: true, aimY: 1, moveX: 0 }, 1 / 60);
        for (const e of events) if (e.type === 'tiles' && e.dug) dug += e.tiles.length;
        // Empty the shell so it keeps digging.
        b.crab = { ...b.crab, sand: 0 };
      }
      return dug;
    };
    expect(digs(pouring)).toBeGreaterThan(digs(dry));
  });
});

describe('decks on the beach', () => {
  it('keeps a crab sheltering under one out of reach of a bird', () => {
    const terrain = flat();
    const deck = layDeck(terrain, [4, 9, 2, 'boat']);
    const b = new Beach({
      terrain, items: [], start: { x: 8 * T + T / 2, y: GROUND * T }, tileSize: T, startShell: 'periwinkle', seed: 3, surfaceFood: 0, decks: [deck],
    });
    b.birds.set(999, makeBird(999, 6, centre(b.crab.body).x, 2 * T, 1, 'brahminy'));
    expect(b.underDeck(b.crab.body)).toBe(true);
    run(b, 8);
    expect(b.lives).toBe(3);
  });

  it('lets food fall onto a deck and lie there', () => {
    const terrain = flat();
    const deck = layDeck(terrain, [20, 6, 2, 'rack']);
    const proto = makeItem(1, food('crumb'), 0, 0, false);
    const b = new Beach({
      terrain, items: [{ ...proto, x: 22 * T, y: (deck.row - 4) * T }], start: { x: 8 * T + T / 2, y: GROUND * T }, tileSize: T, startShell: 'periwinkle', seed: 3, surfaceFood: 0, decks: [deck],
    });
    run(b, 2);
    const item = b.items.get(1)!;
    expect(item.y + item.h).toBeCloseTo(deck.row * T, 0);
  });
});

describe('a walker meeting a deck', () => {
  it('walks under a deck it fits beneath', () => {
    const t = flat();
    layDeck(t, [20, 6, 2, 'boat']);
    const quarry: Quarry = { box: { x: 40 * T, y: GROUND * T - 10, w: 12, h: 10 }, size: 1, hidden: false };
    let k: Critter = makeCritter(1, 3, 17 * T, GROUND * T, 1, 99, 'mudcrab');
    const rng = createRng(2);
    for (let i = 0; i < 480; i++) k = stepCritter(t, k, quarry, 1 / 60, T, rng);
    expect(centre(k).x).toBeGreaterThan(26 * T);
  });
});
