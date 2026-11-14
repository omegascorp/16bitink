import { describe, expect, it } from 'vitest';
import { ch1Level } from '../src/content/ch1/levels';
import { pointInShape, pushOut, rectShape, segmentHits, shapeBounds } from '../src/logic/geom';
import { buildLand, groundAt, isDrivable } from '../src/logic/land';
import { partScore, rollCrate, wantsSwap, wreckPart } from '../src/logic/loot';
import { LOOT_EARLY } from '../src/content/ch1/levels/kit';
import { buildFlow, flowDir, FlowCache } from '../src/logic/nav/flow';
import { buildNav, clearLine, nearestPassable, passable, unblock } from '../src/logic/nav/grid';
import { part, STARTER_LOADOUT } from '../src/logic/parts';
import { createRng } from '../src/logic/rng';

describe('geometry', () => {
  const box = rectShape(100, 20);
  it('tests points, pushes circles out and hits segments', () => {
    expect(pointInShape(box, 0, 0, 10, 5)).toBe(true);
    expect(pointInShape(box, 0, 0, 10, 15)).toBe(false);
    const p = pushOut(box, 0, 0, 0, 20, 15);
    expect(p!.y).toBeCloseTo(5);
    expect(pushOut(box, 0, 0, 0, 40, 15)).toBeNull();
    expect(pushOut({ kind: 'circle', r: 10 }, 0, 0, 15, 0, 10)!.x).toBeCloseTo(5);
    expect(segmentHits(box, 0, 0, -10, -50, -10, 50)).toBe(true);
    expect(segmentHits(box, 0, 0, -80, -50, -80, 50)).toBe(false);
    expect(segmentHits({ kind: 'circle', r: 5 }, 0, 0, -20, 3, 20, 3)).toBe(true);
    expect(shapeBounds(box, 10, 10)).toEqual({ x0: -40, y0: 0, x1: 60, y1: 20 });
  });
});

describe('a level map', () => {
  it('is its screens of ground patches, with water undrivable', () => {
    const l = buildLand(ch1Level(4).land);
    expect(l.area).toBe(9);
    expect([l.width, l.height]).toEqual([2880, 1620]);
    expect(groundAt(l, 1440, 702)).toBe('bridge');
    expect(isDrivable(l, 1440, 702)).toBe(true);
    expect(isDrivable(l, 300, 702)).toBe(false);
    expect(isDrivable(l, -10, 10)).toBe(false);
  });
});

describe('navigation', () => {
  const land = buildLand(ch1Level(4).land);
  const nav = buildNav(land);
  it('blocks water and crosses the river by a bridge', () => {
    expect(passable(nav, 300, 702)).toBe(false);
    expect(passable(nav, 100, 4000)).toBe(false);
    const north = nearestPassable(nav, 300, 400)!;
    const south = nearestPassable(nav, 300, 1000)!;
    expect(clearLine(nav, 300, 400, 300, 1000)).toBe(false);
    const f = buildFlow(nav, Math.floor(south.y / 40) * nav.cols + Math.floor(south.x / 40));
    // Follow the field from the north bank: it must arrive, by a bridge.
    let p = { ...north };
    let crossedAt = -1;
    for (let i = 0; i < 600; i++) {
      const a = flowDir(nav, f, p.x, p.y);
      if (a === null) break;
      p = { x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20 };
      if (crossedAt < 0 && p.y > 702) crossedAt = p.x;
    }
    expect(Math.hypot(p.x - south.x, p.y - south.y)).toBeLessThan(60);
    expect(Math.abs(crossedAt - 1440)).toBeLessThan(140);
  });
  it('caches fields and drops them when a structure breaks', () => {
    const cache = new FlowCache(nav, 2);
    cache.get(1500, 1500);
    cache.get(1500, 1500);
    expect(cache.builds).toBe(1);
    const solidId = [...nav.blocks.keys()][0]!;
    unblock(nav, land, solidId);
    cache.get(1500, 1500);
    expect(cache.builds).toBe(2);
    expect(cache.get(-50, 0)).toBeNull();
  });
});


describe('loot', () => {
  it('rolls crates from the level table', () => {
    const rng = createRng(9);
    const rolls = Array.from({ length: 200 }, () => rollCrate(rng, LOOT_EARLY));
    expect(rolls.some((r) => r.kind === 'kit')).toBe(true);
    expect(rolls.every((r) => r.kind === 'kit' || (r.part.mk < 3 && LOOT_EARLY.families.includes(r.part.family)))).toBe(true);
  });
  it('wrecks leave their best part; bots want better parts and counters', () => {
    expect(wreckPart({ gun: part('cannon', 1), hull: part('heavy', 2), drive: part('tracks', 1) })).toEqual(part('heavy', 2));
    expect(wantsSwap(STARTER_LOADOUT, part('machinegun', 2), null)).toBe(true);
    expect(wantsSwap(STARTER_LOADOUT, part('machinegun', 1), null)).toBe(false);
    expect(partScore(part('rockets'), 'tracks')).toBeGreaterThan(partScore(part('rockets'), 'wheels'));
  });
});
