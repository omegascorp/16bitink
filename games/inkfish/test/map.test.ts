import { describe, expect, it } from 'vitest';
import { DEMO_CHAPTER, LOCKED_CHAPTER_TEASERS } from '../src/levels/demo';
import { generateChapter, generateLevel } from '../src/levels/generate';
import { levelNumber } from '../src/levels/twists';
import { parseChapters } from '../src/levels/validate';
import { LEVELS_PER_CHAPTER, ZONE_DARKNESS, ZONE_INFO } from '../src/levels/zones';
import { computeMapLayout, MAP, zoneIndexAt, type MapChapter } from '../src/scenes/map/layout';
import { ZONE_FAUNA } from '../src/scenes/map/fauna';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';

const chapters: MapChapter[] = [
  { info: DEMO_CHAPTER, levelIds: DEMO_CHAPTER.levels.map((l) => l.id), locked: false },
  ...LOCKED_CHAPTER_TEASERS.map((t) => ({
    info: t, locked: true, levelIds: Array.from({ length: t.levelCount }, (_, i) => `c${t.id}-l${i + 1}`),
  })),
];

describe('zones', () => {
  it('go strictly deeper, chapter by chapter', () => {
    ZONE_INFO.forEach((z, i) => {
      expect(z.id).toBe(i + 1);
      if (i > 0) expect(z.depth[0]).toBe(ZONE_INFO[i - 1]!.depth[1]);
      if (i > 0) expect(ZONE_DARKNESS[z.zone]).toBeGreaterThan(ZONE_DARKNESS[ZONE_INFO[i - 1]!.zone]);
    });
  });

  it('add up to 100 levels with chapter 1 free', () => {
    const total = DEMO_CHAPTER.levels.length + LOCKED_CHAPTER_TEASERS.reduce((n, t) => n + t.levelCount, 0);
    expect(total).toBe(ZONE_INFO.length * LEVELS_PER_CHAPTER);
    expect(DEMO_CHAPTER.levels).toHaveLength(LEVELS_PER_CHAPTER);
  });

  it('gives every level its own id, each chapter numbering its levels in order', () => {
    const levels = [...DEMO_CHAPTER.levels, ...INKFISH_FULL_CHAPTERS.flatMap((c) => c.levels)];
    expect(new Set(levels.map((l) => l.id)).size).toBe(ZONE_INFO.length * LEVELS_PER_CHAPTER);
    expect(levels.map(levelNumber)).toEqual(levels.map((_, i) => i + 1));
  });
});

describe('level generator', () => {
  const info = ZONE_INFO[2]!;
  const recipe = {
    levels: Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => ({ id: `test-${i}`, name: `Test ${i}` })), spawns: [{ species: 'minnow' as const, weight: 4, size: [8, 14] as const }, { species: 'pike' as const, weight: 1, size: [40, 50] as const }],
    maxFish: [20, 30] as const, jellyfish: [0, 4] as const, hookEverySec: [20, 10] as const,
    goal: [50, 100] as const, finalSize: [40, 50] as const, boss: 'bass' as const,
  };

  it('ramps difficulty across the chapter', () => {
    const first = generateLevel(info, recipe, 0);
    // The giant's level caps everyone else's size, so compare the level before it.
    const last = generateLevel(info, recipe, LEVELS_PER_CHAPTER - 2);
    expect(last.tiers.at(-1)).toBeGreaterThan(first.tiers.at(-1)!);
    expect(last.hazards.jellyfish).toBeGreaterThan(first.hazards.jellyfish);
    expect(last.hazards.hookEverySec).toBeLessThan(first.hazards.hookEverySec);
    expect(last.spawns[1]!.size[1]).toBeGreaterThan(first.spawns[1]!.size[1]);
    expect(last.spawns[0]!.size).toEqual(first.spawns[0]!.size);
  });

  it('produces valid levels with the authored ids and names, and overrides', () => {
    const ch = generateChapter(info, { ...recipe, overrides: { 1: { maxFish: 99 } } });
    expect(() => parseChapters(JSON.parse(JSON.stringify([ch])))).not.toThrow();
    expect(new Set(ch.levels.map((l) => l.id)).size).toBe(LEVELS_PER_CHAPTER);
    expect(ch.levels[1]!.maxFish).toBe(99);
    expect([ch.levels[5]!.id, ch.levels[5]!.name, ch.levels[5]!.index]).toEqual(['test-5', 'Test 5', 5]);
  });

  it('refuses a recipe that is missing a level', () => {
    expect(() => generateChapter(info, { ...recipe, levels: recipe.levels.slice(1) })).toThrow(/no level 10/);
  });

  it('disables hooks when the recipe says so', () => {
    expect(generateLevel(info, { ...recipe, hookEverySec: [0, 0] }, 5).hazards.hookEverySec).toBe(0);
  });
});

describe('map layout', () => {
  const layout = computeMapLayout(chapters);

  it('places one node per level, left to right', () => {
    expect(layout.nodes).toHaveLength(100);
    layout.nodes.forEach((n, i) => {
      expect(n.index).toBe(i);
      if (i > 0) expect(n.x).toBeGreaterThan(layout.nodes[i - 1]!.x);
    });
  });

  it('keeps nodes in the water, above the seabed and below the surface', () => {
    for (const n of layout.nodes) {
      expect(n.y).toBeLessThan(layout.floorAt(n.x));
      expect(n.y).toBeGreaterThan(MAP.surfaceY);
    }
  });

  it('slopes down from the shore into deeper plateaus', () => {
    expect(layout.floorAt(0)).toBeLessThan(layout.zones[0]!.floorY);
    layout.zones.forEach((z, i) => {
      expect(layout.floorAt((z.x0 + z.x1) / 2)).toBeCloseTo(z.floorY);
      if (i > 0) expect(z.floorY).toBeGreaterThan(layout.zones[i - 1]!.floorY);
    });
    expect(layout.height).toBeGreaterThan(layout.zones.at(-1)!.floorY);
  });

  it('finds the zone under the camera', () => {
    expect(zoneIndexAt(layout, 0)).toBe(0);
    expect(zoneIndexAt(layout, layout.zones[3]!.x0 + 1)).toBe(3);
    expect(zoneIndexAt(layout, layout.width * 2)).toBe(layout.zones.length - 1);
  });

  it('rejects an empty map', () => {
    expect(() => computeMapLayout([])).toThrow();
  });
});

describe('map fauna', () => {
  it('shows only fish that really live in each chapter', () => {
    for (const ch of [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS]) {
      const residents = new Set(ch.levels.flatMap((l) => l.spawns.map((s) => s.species)));
      for (const species of ZONE_FAUNA[ch.zone]) expect(residents.has(species), `${ch.zone}: ${species}`).toBe(true);
    }
  });
});
