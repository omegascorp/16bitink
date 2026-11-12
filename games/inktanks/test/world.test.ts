import { describe, expect, it } from 'vitest';
import { CH1_LAND } from '../src/content/ch1/land';
import { CH1_REGIONS } from '../src/content/ch1/regions';
import { pointInShape, pushOut, rectShape, segmentHits, shapeBounds } from '../src/logic/geom';
import { groundAt, isDrivable, openCircle, openLand, regionCentre, scaleForArea } from '../src/logic/land';
import { CH1_LOOT, partScore, rollCrate, rollLoadout, rollSupply, supplyTimes, wantsSwap, wreckPart } from '../src/logic/loot';
import { buildFlow, flowDir, FlowCache } from '../src/logic/nav/flow';
import { buildNav, clearLine, nearestPassable, passable, unblock } from '../src/logic/nav/grid';
import { part, STARTER_LOADOUT } from '../src/logic/parts';
import { createRng } from '../src/logic/rng';
import { calmStorm, insideCircle, planStorm, stormAt } from '../src/logic/storm';

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

describe('the growing land', () => {
  it('has 10 regions covering 7×7 screens, 4 screens at level 1 and 49 at 10', () => {
    expect(CH1_REGIONS).toHaveLength(10);
    expect(CH1_REGIONS.reduce((s, r) => s + r.cells.length, 0)).toBe(49);
    expect(openLand(CH1_LAND, 1).area).toBe(4);
    expect(openLand(CH1_LAND, 10).area).toBe(49);
    const areas = CH1_REGIONS.map((r) => openLand(CH1_LAND, r.level).area);
    expect([...areas].sort((a, b) => a - b)).toEqual(areas);
  });
  it('keeps earlier regions, opens only its own, and scales bots and crates with area', () => {
    const l1 = openLand(CH1_LAND, 1);
    const l3 = openLand(CH1_LAND, 3);
    expect(l3.structures.length).toBeGreaterThan(l1.structures.length);
    expect(l1.region?.id).toBe('farm');
    const c = openCircle(l1);
    expect(isDrivable(l1, c.x, c.y)).toBe(true);
    expect(isDrivable(l1, 100, 100)).toBe(false);
    expect(groundAt(l3, 528, 900)).toBe('water');
    expect(groundAt(l3, 528, 1350)).toBe('bridge');
    expect(scaleForArea(4)).toEqual({ bots: 5, crates: 8 });
    expect(scaleForArea(49).bots).toBe(16);
    expect(regionCentre(CH1_REGIONS[0]!)).toEqual({ x: 1920, y: 1620 });
  });
});

describe('navigation', () => {
  const land = openLand(CH1_LAND, 3);
  const nav = buildNav(land);
  it('blocks water and closed land, and crosses the river by a bridge', () => {
    expect(passable(nav, 528, 900)).toBe(false);
    expect(passable(nav, 100, 4000)).toBe(false);
    const west = nearestPassable(nav, 250, 1350)!;
    const east = nearestPassable(nav, 1200, 1350)!;
    expect(clearLine(nav, 250, 900, 1200, 900)).toBe(false);
    const f = buildFlow(nav, Math.floor(east.y / 40) * nav.cols + Math.floor(east.x / 40));
    // Follow the field from the west bank: it must arrive.
    let p = { ...west };
    for (let i = 0; i < 400; i++) {
      const a = flowDir(nav, f, p.x, p.y);
      if (a === null) break;
      p = { x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20 };
    }
    expect(Math.hypot(p.x - east.x, p.y - east.y)).toBeLessThan(60);
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

describe('storm', () => {
  const start = { x: 1000, y: 1000, r: 1100 };
  it('shrinks inside the last circle, phase by phase, then closes', () => {
    const plan = planStorm(start, createRng(3), { area: 4, length: 240 });
    expect(plan.phases).toHaveLength(5);
    for (const p of plan.phases) expect(Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y) + p.to.r).toBeLessThanOrEqual(p.from.r + 1e-6);
    const s0 = stormAt(plan, 0);
    expect(s0.dps).toBe(0);
    expect(s0.circle.r).toBe(1100);
    const last = stormAt(plan, plan.end + 1);
    expect(last.circle.r).toBe(0);
    const mid = plan.phases[1]!;
    const sh = stormAt(plan, mid.start + mid.wait + mid.shrink / 2);
    expect(sh.shrinking).toBe(true);
    expect(sh.circle.r).toBeLessThan(mid.from.r);
    expect(planStorm(start, createRng(3), { area: 30 }).phases).toHaveLength(6);
    expect(insideCircle(start, 1000, 2000)).toBe(true);
    expect(stormAt(calmStorm(start), 500).dps).toBe(0);
  });
});

describe('loot', () => {
  it('rolls crates, supply drops and bot tanks from the table', () => {
    const rng = createRng(9);
    const rolls = Array.from({ length: 200 }, () => rollCrate(rng, CH1_LOOT));
    expect(rolls.some((r) => r.kind === 'kit')).toBe(true);
    expect(rolls.every((r) => r.kind === 'kit' || r.part.mk < 3)).toBe(true);
    expect(rollSupply(rng, CH1_LOOT).mk).toBe(3);
    const l = rollLoadout(rng, { ...CH1_LOOT, families: ['cannon', 'light', 'wheels'] });
    expect([l.gun.family, l.hull.family, l.drive.family]).toEqual(['cannon', 'light', 'wheels']);
    expect(supplyTimes(2, 300)).toEqual([120, 165]);
  });
  it('wrecks leave their best part; bots want better parts and counters', () => {
    expect(wreckPart({ gun: part('cannon', 1), hull: part('heavy', 2), drive: part('tracks', 1) })).toEqual(part('heavy', 2));
    expect(wantsSwap(STARTER_LOADOUT, part('machinegun', 2), null)).toBe(true);
    expect(wantsSwap(STARTER_LOADOUT, part('machinegun', 1), null)).toBe(false);
    expect(partScore(part('rockets'), 'tracks')).toBeGreaterThan(partScore(part('rockets'), 'wheels'));
  });
});
