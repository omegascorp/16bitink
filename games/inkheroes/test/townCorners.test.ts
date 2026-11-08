import { describe, expect, it } from 'vitest';
import { TOWN_ART } from '../src/art/pixel/town';
import { FLAGS } from '../src/scenes/town/townFlags';
import { CITY, toStage } from '../src/scenes/town/townStage';
import { CORNER_POINT, wallPieces, type WallPiece } from '../src/scenes/town/townWalls';

const all = (): readonly WallPiece[] => {
  const { back, front } = wallPieces();
  return [...back, ...front];
};

describe('the city wall corners', () => {
  const corners = { 'corner-left': toStage(0, CITY), 'corner-right': toStage(CITY, 0), 'corner-front': toStage(CITY, CITY), 'corner-back': toStage(0, 0) };

  it('stands one painted corner, tower and walls together, on each of the four points, and no loose tower', () => {
    const arts = all().map((p) => p.art as string);
    for (const name of Object.keys(corners)) expect(arts.filter((a) => a === name)).toHaveLength(1);
    expect(arts.filter((a) => a.includes('tower'))).toHaveLength(0);
  });

  it('centres each tower on the point where its walls meet', () => {
    for (const [name, c] of Object.entries(corners)) {
      const p = all().find((q) => q.art === name)!;
      const s = TOWN_ART[p.art];
      expect(Math.abs(p.x + CORNER_POINT[p.art as keyof typeof CORNER_POINT].x - c.x)).toBeLessThanOrEqual(1);
      expect(p.y + s.h).toBeGreaterThanOrEqual(c.y);
    }
  });

  it('puts a side corner\'s rear wall behind the city and its tower before it', () => {
    const { back, front } = wallPieces();
    for (const side of ['left', 'right']) {
      expect(back.some((p) => p.art === `corner-${side}-rear`)).toBe(true);
      expect(front.some((p) => p.art === `corner-${side}`)).toBe(true);
    }
  });

  it('fills every edge with a corner\'s wall and four sections, and the front left with the gatehouse in the middle', () => {
    const { back, front } = wallPieces();
    const count = (list: readonly WallPiece[], art: string): number => list.filter((p) => p.art === art).length;
    expect(count(back, 'wall') + count(back, 'wall-up')).toBe(8);
    expect(count(front, 'wall') + count(front, 'wall-up')).toBe(6);
    expect(count(front, 'wall-gate')).toBe(1);
  });

  it('turns each section the way its edge runs', () => {
    const { back, front } = wallPieces();
    // Down to the right: back right and front left. Up to the right: back left and front right.
    expect(back.filter((p) => p.art === 'wall')).toHaveLength(4);
    expect(back.filter((p) => p.art === 'wall-up')).toHaveLength(4);
    expect(front.filter((p) => p.art === 'wall')).toHaveLength(2);
    expect(front.filter((p) => p.art === 'wall-up')).toHaveLength(4);
  });

  it('never lays two sections almost on top of each other', () => {
    for (const list of Object.values(wallPieces())) {
      const sections = list.filter((p) => p.art === 'wall' || p.art === 'wall-up');
      for (const p of sections) {
        for (const q of sections) if (p !== q && p.art === q.art && Math.abs(p.y - q.y) < 40) expect(Math.abs(p.x - q.x), `${p.x} and ${q.x}`).toBeGreaterThan(40);
      }
    }
  });

  it('draws each list far to near, so a wall leaving a tower or turret stands over it', () => {
    const { back, front } = wallPieces();
    const at = (list: readonly WallPiece[], art: string): number => list.findIndex((p) => p.art === art);
    const firstSection = (list: readonly WallPiece[]): number => list.findIndex((p) => p.art === 'wall' || p.art === 'wall-up');
    expect(at(back, 'corner-back')).toBeLessThan(firstSection(back));
    expect(at(back, 'corner-left-rear')).toBeGreaterThan(firstSection(back));
    expect(at(back, 'corner-right-rear')).toBeGreaterThan(firstSection(back));
    expect(at(front, 'corner-left')).toBeLessThan(firstSection(front));
    expect(at(front, 'corner-right')).toBeLessThan(firstSection(front));
    expect(at(front, 'corner-front')).toBe(front.length - 1);
  });

  it('runs each edge\'s sections from the far end to the near one', () => {
    const { back, front } = wallPieces();
    for (const list of [back, front]) {
      // Down to the right the left one is further back; up to the right, the right one. Both come nearer as y grows.
      for (const art of ['wall', 'wall-up']) {
        const run = list.filter((p) => p.art === art);
        for (let i = 1; i < run.length; i++) expect(run[i]!.y).toBeGreaterThan(run[i - 1]!.y);
      }
    }
  });

  it('flies a flag on each tower, not on a rear wall', () => {
    for (const name of Object.keys(corners)) expect(FLAGS[name as keyof typeof FLAGS]).toBeDefined();
    expect(FLAGS['corner-left-rear']).toBeUndefined();
  });
});
