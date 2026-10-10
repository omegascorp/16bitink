import { describe, expect, it } from 'vitest';
import { carve } from '../src/level/carve';
import { makeBird } from '../src/logic/birds';
import { makeCritter, stepCritter, type Critter, type Quarry } from '../src/logic/critters';
import { bankCentres, clearRadius, FOG, fogAt, sightInFog, type FogSpec } from '../src/logic/fog';
import { centre } from '../src/logic/items';
import { underKelp, wrackColumn, type WrackSpec } from '../src/logic/kelp';
import { createRng } from '../src/logic/rng';
import { Beach, IDLE, type BeachSetup } from '../src/logic/sim';
import { SPECIES } from '../src/logic/species';
import { surfaceRow } from '../src/logic/terrain';

const T = 16;
const GROUND = 12;
const W = 64;
const flat = () => carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });

/** A crab of `size` standing at column `col`. */
const crabAt = (col: number, size: number, over: Partial<Quarry> = {}): Quarry => ({
  box: { x: col * T, y: GROUND * T - 10, w: 12, h: 10 }, size, hidden: false, ...over,
});

/** Steps a critter `seconds` towards (or not) the quarry. */
function step(k: Critter, q: Quarry, seconds: number): Critter {
  const rng = createRng(3);
  const t = flat();
  let c = k;
  for (let i = 0; i < seconds * 60; i++) c = stepCritter(t, c, q, 1 / 60, T, rng);
  return c;
}

/** Whether a hunter `tiles` from the crab, facing away, turns to chase it straight away. */
function chases(species: 'dungeness' | 'raccoon', tiles: number, over: Partial<Quarry> = {}): boolean {
  const k = makeCritter(1, 5, (20 - tiles) * T, GROUND * T, -1, 99, species);
  const after = step(k, crabAt(20, 2, over), 0.25);
  return after.dir === 1 && centre(after).x > centre(k).x;
}

describe('fog', () => {
  const spec: FogSpec = { banks: [[20, 16]], drift: 1 };

  it('is thick in the middle of a bank, thins over its edges, and is clear outside it', () => {
    expect(fogAt(spec, W, 20, 0)).toBe(1);
    const edge = fogAt(spec, W, 26, 0);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
    expect(fogAt(spec, W, 40, 0)).toBe(0);
    expect(fogAt(undefined, W, 20, 0)).toBe(0);
  });

  it('drifts on the wind and comes round again', () => {
    expect(fogAt(spec, W, 30, 10)).toBe(1);
    expect(bankCentres(spec, W, 10)[0]).toBeCloseTo(30);
    // Drifting off the right end, it wraps round to the left.
    const loop = W + 16;
    expect(fogAt(spec, W, 20, loop)).toBe(1);
    expect(fogAt({ banks: [[20, 16]], drift: -1 }, W, 10, 10)).toBe(1);
  });

  it('shortens a sighted hunter\'s sight, never past what the crab can see, but not a nose', () => {
    expect(sightInFog(6, 0)).toBe(6);
    expect(sightInFog(6, 1)).toBe(FOG.near);
    expect(sightInFog(6, 0.5)).toBeCloseTo(4);
    expect(sightInFog(4, 1, true)).toBe(4);
    for (const s of Object.values(SPECIES)) {
      expect(sightInFog(s.sight, 1, s.nose), s.id).toBeLessThan(clearRadius(1));
    }
  });

  it('lets a Dungeness crab spot a crab only close up in thick fog', () => {
    expect(chases('dungeness', 4)).toBe(true);
    expect(chases('dungeness', 4, { veil: 1 })).toBe(false);
    expect(chases('dungeness', 1.5, { veil: 1 })).toBe(true);
  });

  it('doesn\'t hide a crab from a raccoon\'s nose', () => {
    expect(chases('raccoon', 3.5, { veil: 1 })).toBe(true);
  });
});

describe('kelp wrack', () => {
  const wrack: WrackSpec[] = [[18, 6]];

  it('covers a crab down among it on the sand, not one in the air over it', () => {
    const t = flat();
    const box = { x: 20 * T, y: GROUND * T - 10, w: 12, h: 10 };
    expect(underKelp(t, wrack, box, T)).toBe(true);
    expect(underKelp(t, wrack, { ...box, y: box.y - 3 * T }, T)).toBe(false);
    expect(underKelp(t, wrack, { ...box, x: 30 * T }, T)).toBe(false);
  });

  it('hides a crab from sight and smell', () => {
    expect(chases('dungeness', 3, { covered: true })).toBe(false);
    expect(chases('raccoon', 3, { covered: true, veil: 1 })).toBe(false);
  });

  it('picks columns for food inside the wrack', () => {
    const many: WrackSpec[] = [[4, 3], [30, 5]];
    for (let r = 0; r < 1; r += 0.05) {
      const col = wrackColumn(many, r)!;
      expect(many.some(([c, w]) => col >= c && col < c + w)).toBe(true);
    }
    expect(wrackColumn([], 0.5)).toBeNull();
  });
});

describe('fog and kelp on the beach', () => {
  function beach(over: Partial<BeachSetup> = {}): Beach {
    return new Beach({ terrain: flat(), items: [], start: { x: 20 * T, y: GROUND * T }, tileSize: T, startShell: 'periwinkle', seed: 1, surfaceFood: 0, ...over });
  }
  const run = (b: Beach, seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) b.step(IDLE, 1 / 60);
  };

  it('keeps a bird from finding a crab in thick fog', () => {
    const watch = (fog?: FogSpec): string => {
      const b = beach({ fog });
      b.birds.set(50, makeBird(50, 6, 20 * T, 2 * T, 1));
      run(b, 0.2);
      return b.birds.get(50)!.phase;
    };
    expect(watch()).toBe('hover');
    expect(watch({ banks: [[20, 20]], drift: 0 })).toBe('patrol');
  });

  it('keeps a bird from finding a crab under kelp', () => {
    const b = beach({ wrack: [[17, 8]] });
    b.birds.set(50, makeBird(50, 6, 20 * T, 2 * T, 1));
    run(b, 0.2);
    expect(b.underKelp(b.crab.body)).toBe(true);
    expect(b.birds.get(50)!.phase).toBe('patrol');
  });

  it('turns up some of its restocked food in the wrack', () => {
    const wrack: WrackSpec[] = [[40, 6]];
    const b = beach({ wrack, surfaceFood: 40 });
    run(b, 60);
    const cols = [...b.items.values()].map((i) => Math.floor(centre(i).x / T));
    const inKelp = cols.filter((c) => c >= 40 && c < 46).length;
    // Six columns of 64 would get under a tenth by chance; the wrack gets a good share.
    expect(inKelp / cols.length).toBeGreaterThan(0.3);
    expect(surfaceRow(b.terrain, 42)).toBe(GROUND);
  });
});
