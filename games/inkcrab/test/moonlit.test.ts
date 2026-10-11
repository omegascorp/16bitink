import { describe, expect, it } from 'vitest';
import { carve } from '../src/level/carve';
import { BEACH_10 } from '../src/level/beach10';
import { levelGoal } from '../src/level/build';
import { makeCritter } from '../src/logic/critters';
import { centre } from '../src/logic/items';
import { darknessAt, GLOW, isDark, MOON, moonTurn, Plankton, type MoonSpec } from '../src/logic/moon';
import { shellOf } from '../src/logic/shells';
import { Beach, IDLE, type BeachSetup, type Input } from '../src/logic/sim';
import type { SpeciesId } from '../src/logic/species';

const T = 16;
const GROUND = 12;
const W = 64;
const flat = () => carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });

describe('clouds over the moon', () => {
  // 40 s a cycle: 26 s of moonlight (a cloud coming over in the last 2.5), then 14 s dark.
  const spec: MoonSpec = { period: 40, dark: 14 };

  it('stays moonlit, fades as a warning, goes dark, then the moon comes out', () => {
    expect(darknessAt(spec, 5)).toBe(0);
    const fading = darknessAt(spec, 26 - MOON.fade / 2);
    expect(fading).toBeGreaterThan(0);
    expect(fading).toBeLessThan(1);
    expect(isDark(spec, 26 - MOON.fade / 2)).toBe(false);
    expect(darknessAt(spec, 30)).toBe(1);
    expect(isDark(spec, 30)).toBe(true);
    const clearing = darknessAt(spec, 40 - MOON.fade / 2);
    expect(clearing).toBeGreaterThan(0);
    expect(clearing).toBeLessThan(1);
    expect(darknessAt(spec, 45)).toBe(0);
  });

  it('tells the clock how long until it goes dark, or the moon comes out', () => {
    expect(moonTurn(spec, 6)).toEqual({ dark: false, seconds: 20 });
    expect(moonTurn(spec, 30)).toEqual({ dark: true, seconds: 10 });
  });

  it('is never dark without a spec', () => {
    expect(darknessAt(undefined, 30)).toBe(0);
    expect(isDark(undefined, 30)).toBe(false);
  });
});

describe('plankton', () => {
  const box = { x: 20 * T, y: GROUND * T - 10, w: 12, h: 10 };

  it('lights up under something walking in it, and fades', () => {
    const p = new Plankton([[18, 24]], T);
    p.stir(box, 60, 10);
    expect(p.brightness(20, 10)).toBe(1);
    expect(p.brightness(20, 10 + GLOW.fade / 2)).toBeCloseTo(0.5);
    expect(p.brightness(20, 10 + GLOW.fade + 0.1)).toBe(0);
    expect(p.lit(box, 10 + GLOW.linger / 2)).toBe(true);
    expect(p.lit(box, 10 + GLOW.linger + 0.1)).toBe(false);
  });

  it('isn\'t stirred by standing still, or outside its strand', () => {
    const p = new Plankton([[30, 40]], T);
    p.stir(box, 60, 1);
    expect(p.lit(box, 1)).toBe(false);
    const q = new Plankton([[18, 24]], T);
    q.stir(box, 0, 1);
    expect(q.lit(box, 1)).toBe(false);
  });
});

/** A flat beach, the crab at column 20, with whatever else a test needs. */
function bay(over: Partial<BeachSetup> = {}): Beach {
  return new Beach({
    terrain: flat(), items: [], start: { x: 20 * T + T / 2, y: GROUND * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 3, surfaceFood: 0, ...over,
  });
}

function run(b: Beach, seconds: number, input: Partial<Input> = {}): void {
  for (let i = 0; i < seconds * 60; i++) b.step({ ...IDLE, ...input }, 1 / 60);
}

/** Dark from the start; moonlit throughout. */
const DARK: MoonSpec = { period: 100, dark: 60, offset: 45 };
const MOONLIT: MoonSpec = { period: 100, dark: 10 };

describe('night on the beach', () => {
  /** Whether a hunter 4 tiles off turns to chase the crab. */
  const chases = (species: SpeciesId, over: Partial<BeachSetup>, input: Partial<Input> = {}): boolean => {
    const b = bay(over);
    const k = makeCritter(500, 6, centre(b.crab.body).x + 4 * T, GROUND * T, 1, 99, species);
    b.critters.clear();
    b.critters.set(k.id, k);
    run(b, 0.3, input);
    return b.critters.get(k.id)!.dir === -1;
  };

  it('half-blinds a horn-eyed ghost crab in the dark, but not a coconut crab that smells', () => {
    expect(chases('horneyed', { moon: MOONLIT })).toBe(true);
    expect(chases('horneyed', { moon: DARK })).toBe(false);
    expect(chases('coconutcrab', { moon: DARK })).toBe(true);
  });

  it('gives a crab away in the dark while it walks on glowing plankton', () => {
    // Walking left, away from the hunter, through the plankton.
    expect(chases('horneyed', { moon: DARK }, { moveX: -1 })).toBe(false);
    expect(chases('horneyed', { moon: DARK, glow: [[4, 40]] }, { moveX: -1 })).toBe(true);
  });

  it('lights the plankton under walking creatures, so they show in the dark', () => {
    const b = bay({ moon: DARK, glow: [[30, 60]] });
    b.critters.clear();
    const k = makeCritter(500, 2, 44 * T, GROUND * T, 1, 99, 'brittlestar');
    b.critters.set(k.id, k);
    run(b, 1);
    expect(b.plankton!.glowing(b.elapsed).length).toBeGreaterThan(0);
  });

  it('leaves no glow under a crab hidden in its shell', () => {
    const b = bay({ moon: DARK, glow: [[4, 40]] });
    run(b, 0.5, { hide: true });
    expect(b.lit).toBe(false);
  });

  it('brings sand hoppers out quicker in the dark', () => {
    const count = (b: Beach): number => [...b.items.values()].filter((i) => i.kind.type === 'food' && !i.buried).length;
    const dark = bay({ moon: DARK, surfaceFood: 8 });
    const lit = bay({ moon: MOONLIT, surfaceFood: 8 });
    run(dark, 6);
    run(lit, 6);
    expect(count(dark)).toBeGreaterThan(count(lit));
  });
});

describe('moonlit bay', () => {
  it('brings clouds over the moon from the second level on (bar the clear night of the glowing tide), never darker than light, the first cloud soon', () => {
    expect(BEACH_10[0]!.moon).toBeUndefined();
    for (const def of BEACH_10.slice(1)) {
      if (def.tide) {
        expect(def.moon, def.id).toBeUndefined();
        continue;
      }
      const moon = def.moon!;
      expect(moon, def.id).toBeDefined();
      expect(moon.dark).toBeLessThanOrEqual(moon.period - moon.dark);
      const first = moon.period - moon.dark - (moon.offset ?? 0);
      expect(first, def.id).toBeLessThanOrEqual(30);
      expect(first, def.id).toBeGreaterThan(MOON.fade);
    }
  });

  for (const def of BEACH_10) {
    describe(def.id, () => {
      it('has glowing plankton on the strand, clear of the start, inside the beach', () => {
        expect(def.glow?.length).toBeGreaterThan(0);
        for (const [from, to] of def.glow ?? []) {
          expect(from).toBeGreaterThan(def.startCol + 6);
          expect(to).toBeLessThan(def.width - 2);
          expect(to).toBeGreaterThan(from);
        }
      });

      it('keeps its hunters under the goal, with one coconut crab at most', () => {
        const goal = levelGoal(def);
        for (const g of def.critters ?? []) expect(g.sizes[1]).toBeLessThan(goal);
        const coconuts = (def.critters ?? []).filter((g) => g.species === 'coconutcrab').reduce((n, g) => n + g.count, 0);
        expect(coconuts).toBeLessThanOrEqual(1);
      });
    });
  }
});
