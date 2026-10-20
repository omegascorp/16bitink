import { describe, expect, it } from 'vitest';
import { computeMapLayout, MAP, pathPoint, regionAt } from '../src/scenes/map/layout';
import { mapStates, standInIds, type ChapterSlot } from '../src/scenes/map/states';
import type { Progress } from '../src/logic/save';

const ids = (p: string): string[] => Array.from({ length: 10 }, (_, i) => `${p}-${i + 1}`);
const done = (...list: string[]): Progress => ({ levels: Object.fromEntries(list.map((id) => [id, { blots: 2, bestTime: 50 }])) });
const CHAPTERS: ChapterSlot[] = [
  { kind: 'playable', levelIds: ids('garden') },
  { kind: 'locked', levelIds: standInIds('locked', 1) },
  { kind: 'draft', levelIds: standInIds('draft', 2) },
];
const ORDER = ids('garden');

describe('map states', () => {
  it('puts a new player on the first level, the rest closed', () => {
    const { states, current } = mapStates(CHAPTERS, done(), ORDER);
    expect(current).toBe('garden-1');
    expect(states.get('garden-1')).toBe('current');
    expect(states.get('garden-2')).toBe('closed');
    expect(states.get('locked-2-1')).toBe('locked');
    expect(states.get('draft-3-10')).toBe('draft');
  });

  it('moves the gecko on as levels are cleared', () => {
    const { states, current } = mapStates(CHAPTERS, done('garden-1', 'garden-2'), ORDER);
    expect(current).toBe('garden-3');
    expect(states.get('garden-2')).toBe('done');
    expect(states.get('garden-3')).toBe('current');
    expect(states.get('garden-4')).toBe('closed');
  });

  it('leaves the gecko on the last level once all are cleared', () => {
    const { states, current } = mapStates(CHAPTERS, done(...ORDER), ORDER);
    expect(current).toBe('garden-10');
    expect(states.get('garden-10')).toBe('done');
  });

  it('opens everything when told to', () => {
    const { states } = mapStates(CHAPTERS, done(), ORDER, true);
    expect(states.get('garden-7')).toBe('open');
  });
});

describe('map layout', () => {
  const layout = computeMapLayout([
    { name: 'The Garden', place: 'garden', levelIds: ids('garden') },
    { name: 'The Pond', place: 'pond', levelIds: ids('pond') },
    { name: 'The Greenhouse', place: 'draft', levelIds: ids('glass') },
  ]);

  it('climbs: each level sits above the one before, chapter by chapter', () => {
    expect(layout.nodes).toHaveLength(30);
    for (let i = 1; i < layout.nodes.length; i++) expect(layout.nodes[i]!.y).toBeLessThan(layout.nodes[i - 1]!.y);
    expect(layout.regions[1]!.bottom).toBe(layout.regions[0]!.top);
  });

  it('keeps the path inside the plan and through every pocket', () => {
    for (const p of layout.path) {
      expect(p.x).toBeGreaterThan(MAP.mid - MAP.swing - 60);
      expect(p.x).toBeLessThan(MAP.mid + MAP.swing + 60);
    }
    layout.nodes.forEach((n, i) => {
      const p = pathPoint(layout, layout.nodeS[i]!);
      expect(Math.hypot(p.x - n.x, p.y - n.y)).toBeLessThan(4);
    });
    for (let i = 1; i < layout.nodeS.length; i++) expect(layout.nodeS[i]!).toBeGreaterThan(layout.nodeS[i - 1]!);
  });

  it('finds the chapter at a height', () => {
    expect(regionAt(layout, layout.nodes[3]!.y)).toBe(0);
    expect(regionAt(layout, layout.nodes[15]!.y)).toBe(1);
    expect(regionAt(layout, -100)).toBe(2);
  });
});
