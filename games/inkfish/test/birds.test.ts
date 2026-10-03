import { describe, expect, it } from 'vitest';
import { BIRD_INFO, birdSize, diveTarget, pickBird, wantsDive, ZONE_BIRDS, type BirdId } from '../src/logic/birds';
import { createRng } from '../src/logic/rng';
import { relationTo } from '../src/logic/sizing';
import { ZONE_IDS, ZONE_SKY } from '../src/levels/zones';

const SURFACE = 60;
const diver = (kind: BirdId, size: number) => ({ kind, size, x: 1000, restUntil: 0 });

describe('birds', () => {
  it('only fly where there is open sky', () => {
    for (const zone of ZONE_IDS) {
      expect(Boolean(ZONE_BIRDS[zone])).toBe(ZONE_SKY[zone]);
      if (!ZONE_SKY[zone]) expect(pickBird(zone, createRng(1))).toBeNull();
    }
  });

  it('follow the size rule: dragonflies are always snacks, pelicans always hunters, terns either', () => {
    const rng = createRng(5);
    const rel = (kind: BirdId): Set<string> => new Set(Array.from({ length: 200 }, () => relationTo(30, birdSize(kind, 30, rng))));
    expect(rel('dragonfly')).toEqual(new Set(['prey']));
    expect(rel('pelican')).toEqual(new Set(['predator']));
    expect(rel('tern').has('prey') && rel('tern').has('predator')).toBe(true);
  });

  it('snacks fly low enough to reach with a leap', () => {
    for (const kind of ['dragonfly', 'tern', 'gull'] as const) expect(BIRD_INFO[kind].height[0]).toBeLessThan(120);
  });

  it('hunters dive only at a smaller fish near the surface, and not at one in cover', () => {
    const near = { x: 1050, y: SURFACE + 60, size: 20, safe: false };
    expect(wantsDive(diver('gannet', 50), near, SURFACE, 0)).toBe(true);
    expect(wantsDive(diver('gannet', 50), { ...near, y: SURFACE + 400 }, SURFACE, 0)).toBe(false);
    expect(wantsDive(diver('gannet', 50), { ...near, x: 1600 }, SURFACE, 0)).toBe(false);
    expect(wantsDive(diver('gannet', 50), { ...near, safe: true }, SURFACE, 0)).toBe(false);
    expect(wantsDive(diver('tern', 15), near, SURFACE, 0)).toBe(false);
    expect(wantsDive(diver('dragonfly', 80), near, SURFACE, 0)).toBe(false);
    expect(wantsDive({ ...diver('gannet', 50), restUntil: 500 }, near, SURFACE, 100)).toBe(false);
  });

  it('a dive never goes deeper than the bird can plunge', () => {
    expect(diveTarget('gull', { x: 5, y: 900 }, SURFACE)).toEqual({ x: 5, y: SURFACE + BIRD_INFO.gull.diveDepth });
    expect(diveTarget('gannet', { x: 5, y: SURFACE + 20 }, SURFACE).y).toBe(SURFACE + 20);
  });
});
