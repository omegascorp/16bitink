import { describe, expect, it } from 'vitest';
import { BIOMES, LEVELS_PER_BEACH } from '../src/level/biomes';
import { computeMapLayout, MAP, regionIndexAt, type MapBeach } from '../src/scenes/map/layout';

const beaches: MapBeach[] = BIOMES.map((biome, i) => ({
  biome,
  built: i === 0,
  levelIds: Array.from({ length: LEVELS_PER_BEACH }, (_, k) => `b${i + 1}-${k + 1}`),
}));
const layout = computeMapLayout(beaches);

describe('map layout', () => {
  it('has a node for every level of every beach, in order', () => {
    expect(layout.nodes).toHaveLength(100);
    layout.nodes.forEach((n, i) => {
      expect(n.index).toBe(i);
      expect(n.region).toBe(Math.floor(i / LEVELS_PER_BEACH));
    });
  });

  it('runs left to right, one island per beach, never overlapping', () => {
    for (let i = 1; i < layout.nodes.length; i++) expect(layout.nodes[i]!.x).toBeGreaterThan(layout.nodes[i - 1]!.x);
    for (let i = 1; i < layout.regions.length; i++) expect(layout.regions[i]!.x0).toBeGreaterThanOrEqual(layout.regions[i - 1]!.x1);
  });

  it('keeps every node on its island, on the beach between the scrub and the sea', () => {
    for (const n of layout.nodes) {
      const r = layout.regions[n.region]!;
      expect(n.x).toBeGreaterThan(r.x0);
      expect(n.x).toBeLessThan(r.x1);
      const coast = layout.coastAt(n.x);
      expect(n.y).toBeLessThan(coast - MAP.nodeRadius);
      expect(n.y).toBeGreaterThan(coast - MAP.sandBand + MAP.nodeRadius * 0.5);
    }
  });

  it('fits inside the world', () => {
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(layout.width);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(layout.height);
    }
  });

  it('leaves open water between islands, each beach its own island', () => {
    for (let i = 1; i < layout.regions.length; i++) {
      const strait = (layout.regions[i - 1]!.x1 + layout.regions[i]!.x0) / 2;
      expect(layout.coastAt(strait)).toBeCloseTo(layout.topAt(strait));
    }
    for (const r of layout.regions) {
      const mid = (r.x0 + r.x1) / 2;
      expect(layout.coastAt(mid) - layout.topAt(mid)).toBeGreaterThan(MAP.sandBand * 1.5);
    }
  });

  it('tells which island the camera is over', () => {
    const r = layout.regions[3]!;
    expect(regionIndexAt(layout, (r.x0 + r.x1) / 2)).toBe(3);
    expect(regionIndexAt(layout, -100)).toBe(0);
    expect(regionIndexAt(layout, layout.width + 100)).toBe(9);
  });

  it('refuses an empty map', () => {
    expect(() => computeMapLayout([])).toThrow();
  });
});
