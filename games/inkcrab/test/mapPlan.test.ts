import { describe, expect, it } from 'vitest';
import { BIOMES, LEVELS_PER_BEACH } from '../src/level/biomes';
import { computeMapLayout, MAP, routeDistance, type MapBeach } from '../src/scenes/map/layout';
import { edgeDistance, inside, islandPlans, seaRoutePath } from '../src/scenes/map/plan';

const beaches: MapBeach[] = BIOMES.map((biome, i) => ({
  biome,
  built: i < 9,
  levelIds: Array.from({ length: LEVELS_PER_BEACH }, (_, k) => `b${i + 1}-${k + 1}`),
}));
const layout = computeMapLayout(beaches);
const plans = islandPlans(layout);

describe('island plans', () => {
  it('plans every island once, and reuses the plans', () => {
    expect(plans).toHaveLength(BIOMES.length);
    expect(islandPlans(layout)).toBe(plans);
  });

  it('never puts water or extra land under a level ring', () => {
    for (const n of layout.nodes) {
      const plan = plans[n.region]!;
      for (const s of [...plan.waters, ...plan.islets]) {
        expect(inside(s.shape, n)).toBe(false);
        expect(edgeDistance(s.shape, n)).toBeGreaterThan(MAP.nodeRadius + 6);
      }
    }
  });

  it('keeps every level ring on dry land, clear of the sea by its whole width', () => {
    for (const n of layout.nodes) {
      for (const dx of [-MAP.nodeRadius, 0, MAP.nodeRadius]) {
        expect(n.y + MAP.nodeRadius).toBeLessThan(layout.coastAt(n.x + dx));
        expect(n.y - MAP.nodeRadius).toBeGreaterThan(layout.topAt(n.x + dx));
      }
    }
  });

  it('hangs each name cartouche on the chart, clear of the levels', () => {
    for (const [i, p] of plans.entries()) {
      const { x, y, w, h } = p.label;
      expect(y - h / 2).toBeGreaterThanOrEqual(6);
      const r = layout.regions[i]!;
      expect(x).toBeGreaterThan(r.x0);
      expect(x).toBeLessThan(r.x1);
      for (const n of layout.nodes) {
        const clear = n.y - MAP.nodeRadius - 30 > y + h / 2 || Math.abs(n.x - x) > w / 2 + MAP.nodeRadius;
        expect(clear).toBe(true);
      }
    }
  });

  it("keeps each island's waters and islets in its own stretch of the chart", () => {
    for (const [i, p] of plans.entries()) {
      const r = layout.regions[i]!;
      for (const s of [...p.waters, ...p.islets]) {
        for (const q of s.shape) {
          expect(q.x).toBeGreaterThan(r.x0 - MAP.strait / 2);
          expect(q.x).toBeLessThan(r.x1 + MAP.strait / 2);
          expect(q.y).toBeGreaterThan(-60);
          expect(q.y).toBeLessThan(layout.height - 8);
        }
      }
    }
  });

  it("keeps islets out of the name cartouches", () => {
    for (const p of plans) {
      const { x, y, w, h } = p.label;
      for (const s of p.islets) for (const q of s.shape) expect(Math.abs(q.x - x) < w / 2 && Math.abs(q.y - y) < h / 2).toBe(false);
    }
  });
});

describe('sea routes', () => {
  it('runs from each island\'s last level to the next island\'s first, through open water', () => {
    for (let i = 0; i < layout.regions.length - 1; i++) {
      const path = seaRoutePath(layout, i);
      const last = layout.nodes.filter((n) => n.region === i).at(-1)!;
      const first = layout.nodes.find((n) => n.region === i + 1)!;
      expect(path[0]!.x).toBeGreaterThan(last.x);
      expect(path.at(-1)!.x).toBeLessThan(first.x);
      // Its low point is in sight above the tab bar, and it misses every islet.
      expect(Math.max(...path.map((q) => q.y))).toBeLessThan(MAP.height - 120);
      for (const p of [plans[i]!, plans[i + 1]!]) for (const s of p.islets) for (const q of path) expect(inside(s.shape, q)).toBe(false);
    }
  });
});

describe('route distance', () => {
  it('is zero-ish on a ring and grows away from the route', () => {
    const n = layout.nodes[12]!;
    expect(routeDistance(layout, n.x, n.y)).toBeLessThan(0);
    expect(routeDistance(layout, n.x, n.y - MAP.nodeRadius)).toBeCloseTo(0, 0);
    expect(routeDistance(layout, n.x, n.y - 200)).toBeGreaterThan(150);
  });

  it('counts the tracks between levels, not the sea between islands', () => {
    const a = layout.nodes[3]!;
    const b = layout.nodes[4]!;
    expect(routeDistance(layout, (a.x + b.x) / 2, (a.y + b.y) / 2)).toBeLessThan(1);
    const last = layout.nodes[9]!;
    const first = layout.nodes[10]!;
    expect(routeDistance(layout, (last.x + first.x) / 2, (last.y + first.y) / 2)).toBeGreaterThan(100);
  });
});

describe('island silhouettes', () => {
  const region = (id: string): number => layout.regions.findIndex((r) => r.beach.biome.id === id);
  const nodesOf = (i: number) => layout.nodes.filter((n) => n.region === i);

  it('runs the Dune Sea\'s desert off the top of the chart, narrowing to a spit in the east', () => {
    const r = layout.regions[region('dunes')]!;
    expect(layout.topAt((r.x0 + r.x1) / 2)).toBeLessThan(0);
    expect(layout.topAt(r.x0 + (r.x1 - r.x0) * 0.88)).toBeGreaterThan(200);
    expect(plans[region('dunes')]!.islets.some((s) => s.kind === 'spit')).toBe(true);
  });

  it('bends the route into Wreck Cove\'s cove and round Moonlit Bay\'s crescent', () => {
    for (const id of ['wreck', 'moonlit']) {
      const ns = nodesOf(region(id));
      const mid = ns.slice(4, 6).reduce((s, n) => s + layout.coastAt(n.x), 0) / 2;
      const ends = (layout.coastAt(ns[0]!.x) + layout.coastAt(ns.at(-1)!.x)) / 2;
      expect(ends - mid).toBeGreaterThan(40);
    }
  });

  it('rings the atoll\'s lagoon with land and breaks its rim with passes', () => {
    const p = plans[region('atoll')]!;
    expect(p.waters.filter((w) => w.kind === 'lagoon')).toHaveLength(1);
    expect(p.waters.filter((w) => w.kind === 'pass').length).toBeGreaterThanOrEqual(2);
  });

  it('cuts creeks into the mangroves and fjords into the cold coast, all ending above the sand', () => {
    for (const [id, kind] of [['mangrove', 'creek'], ['kelp', 'fjord']] as const) {
      const ws = plans[region(id)]!.waters.filter((w) => w.kind === kind);
      expect(ws.length).toBeGreaterThanOrEqual(3);
      for (const w of ws) for (const q of w.shape) expect(q.y).toBeLessThan(layout.coastAt(q.x) - MAP.sandBand / 2);
    }
  });

  it('builds the harbour a breakwater', () => {
    expect(plans[region('harbour')]!.islets.some((s) => s.kind === 'breakwater')).toBe(true);
  });
});
