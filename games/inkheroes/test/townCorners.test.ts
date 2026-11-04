import { describe, expect, it } from 'vitest';
import { TOWN_ART } from '../src/art/pixel/town';
import { FLAGS } from '../src/scenes/town/townFlags';
import { CITY, toStage } from '../src/scenes/town/townStage';
import { wallPieces, type WallPiece } from '../src/scenes/town/townWalls';

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
      // The tower is the piece's tallest column, the walls' point under the middle of its foot.
      const centre = name === 'corner-left' ? p.x + 28 : p.x + 68;
      expect(Math.abs(centre - c.x)).toBeLessThanOrEqual(1);
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

  it('never ends a turreted section at a corner, whose own wall runs on from it', () => {
    const w = TOWN_ART.wall.w;
    for (const c of Object.values(corners)) {
      for (const p of all().filter((q) => q.art === 'wall')) expect(p.x === c.x || p.x + w === c.x).toBe(false);
    }
  });

  it('never lays two turreted sections almost on top of each other', () => {
    const { back, front } = wallPieces();
    for (const list of [back, front]) {
      const sections = list.filter((p) => p.art === 'wall');
      for (const p of sections) {
        for (const q of sections) if (p !== q && p.flip === q.flip && Math.abs(p.y - q.y) < 40) expect(Math.abs(p.x - q.x), `${p.x} and ${q.x}`).toBeGreaterThan(40);
      }
    }
  });

  it('draws the corners first, so the sections\' turrets stand over the ends of their walls', () => {
    const { back, front } = wallPieces();
    for (const list of [back, front]) {
      const lastCorner = list.map((p) => p.art.startsWith('corner')).lastIndexOf(true);
      const firstWall = list.findIndex((p) => !p.art.startsWith('corner'));
      expect(lastCorner).toBeLessThan(firstWall);
    }
  });

  it('flies a flag on each tower, not on a rear wall', () => {
    for (const name of Object.keys(corners)) expect(FLAGS[name as keyof typeof FLAGS]).toBeDefined();
    expect(FLAGS['corner-left-rear']).toBeUndefined();
  });
});
