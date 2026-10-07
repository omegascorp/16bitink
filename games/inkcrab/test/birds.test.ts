import { describe, expect, it } from 'vitest';
import { BIRD, makeBird, patrolY, stepBird, underSky, type Bird, type SkyQuarry } from '../src/logic/birds';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

/** Sand from row 20 down, 60 wide. */
function flat(): Terrain {
  const t = createTerrain(60, 26);
  for (let x = 0; x < 60; x++) for (let y = 20; y < 26; y++) setTile(t, x, y, TILE.sand);
  return t;
}

const crab = (col: number, size = 2, over: Partial<SkyQuarry> = {}): SkyQuarry => ({ box: { x: col * T, y: 20 * T - 12, w: 14, h: 12 }, size, hidden: false, open: true, ...over });

function fly(t: Terrain, b: Bird, q: SkyQuarry | null, seconds: number, until?: (b: Bird) => boolean): Bird {
  let out = b;
  for (let i = 0; i < seconds * 60; i++) {
    out = stepBird(t, out, q, 1 / 60, T);
    if (until?.(out)) break;
  }
  return out;
}

const kestrel = (t: Terrain, col: number, size = 5): Bird => {
  const b = makeBird(1, size, col * T, 0, 1);
  return { ...b, y: patrolY(t, T, b.h) };
};

describe('kestrels', () => {
  it('patrol back and forth over the beach, on screen', () => {
    const t = flat();
    let b = kestrel(t, 30);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      b = stepBird(t, b, null, 1 / 60, T);
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      expect(b.y).toBeGreaterThanOrEqual(0);
    }
    expect(minX).toBeLessThan(5 * T);
    expect(maxX).toBeGreaterThan(50 * T);
  });

  it('hover over a smaller crab in the open, then stoop on it', () => {
    const t = flat();
    const q = crab(34);
    const hovering = fly(t, kestrel(t, 30), q, 1, (b) => b.phase === 'hover');
    expect(hovering.phase).toBe('hover');
    const diving = fly(t, hovering, q, 6, (b) => b.phase === 'dive');
    expect(diving.phase).toBe('dive');
    expect(Math.abs(diving.aimX - (34 * T + 7))).toBeLessThan(T);
  });

  it('give a moment of warning before the stoop', () => {
    const t = flat();
    const q = crab(30);
    let b = fly(t, kestrel(t, 30), q, 1, (x) => x.phase === 'hover');
    let hovered = 0;
    while (b.phase === 'hover' && hovered < 10) {
      b = stepBird(t, b, q, 1 / 60, T);
      hovered += 1 / 60;
    }
    expect(hovered).toBeGreaterThanOrEqual(BIRD.hoverFor);
  });

  it('ignore crabs as big as they are', () => {
    const t = flat();
    expect(fly(t, kestrel(t, 30, 4), crab(32, 4), 3).phase).toBe('patrol');
  });

  it('stoop on a hidden crab all the same (the shell takes it)', () => {
    const t = flat();
    const hovering = fly(t, kestrel(t, 30), crab(32), 1, (b) => b.phase === 'hover');
    expect(fly(t, hovering, crab(32, 2, { hidden: true }), 6, (b) => b.phase === 'dive').phase).toBe('dive');
  });

  it('give up soon on a crab gone under cover', () => {
    const t = flat();
    const hovering = fly(t, kestrel(t, 30), crab(32), 1, (b) => b.phase === 'hover');
    const gaveUp = fly(t, hovering, crab(32, 2, { open: false }), BIRD.waitFor + 0.5);
    expect(gaveUp.phase).not.toBe('hover');
    expect(gaveUp.bored).toBeGreaterThan(0);
  });

  it('stop at the sand when they stoop: a crab under it is out of reach', () => {
    const t = flat();
    const q = crab(30);
    let b = fly(t, kestrel(t, 30), q, 6, (x) => x.phase === 'dive');
    b = fly(t, b, q, 3, (x) => x.phase !== 'dive');
    expect(b.phase).toBe('climb');
    expect(b.y + b.h).toBeLessThanOrEqual(20 * T + 1);
  });
});

describe('under the sky', () => {
  it('is any crab with nothing over it, and none under a roof of sand', () => {
    const t = flat();
    const box = { x: 30 * T, y: 22 * T, w: 14, h: 12 };
    setTile(t, 30, 22, TILE.air);
    expect(underSky(t, box, T)).toBe(false);
    expect(underSky(t, { ...box, y: 20 * T - 12 }, T)).toBe(true);
  });
});
