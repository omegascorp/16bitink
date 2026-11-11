import { describe, expect, it } from 'vitest';
import { levelById, loadedLevels } from '../src/level/levels';
import { BOARD, type LevelDef } from '../src/level/types';
import { frameBox, FULL_BOARD, levelBox } from '../src/logic/framing';

const level = (id: string): LevelDef => {
  const l = levelById(id);
  if (!l) throw new Error(`no level ${id}`);
  return l;
};

describe('levelBox', () => {
  it('stays on the board and holds every line, the gecko and its pads', () => {
    for (const l of loadedLevels()) {
      const b = levelBox(l);
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.y0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(BOARD.w);
      expect(b.y1).toBeLessThanOrEqual(BOARD.h);
      const s = l.shooter;
      const spots = s.kind === 'pivot' ? [s] : s.kind === 'rail' ? [{ x: s.x0, y: s.y }, { x: s.x1, y: s.y }] : s.pads;
      for (const p of [...spots, ...l.tracks.flatMap((t) => t.points)]) {
        const inside = { x: Math.min(BOARD.w, Math.max(0, p.x)), y: Math.min(BOARD.h, Math.max(0, p.y)) };
        expect(inside.x).toBeGreaterThanOrEqual(b.x0);
        expect(inside.x).toBeLessThanOrEqual(b.x1);
        expect(inside.y).toBeGreaterThanOrEqual(b.y0);
        expect(inside.y).toBeLessThanOrEqual(b.y1);
      }
    }
  });

  it('cuts the bare ground above and below a level that leaves some', () => {
    const b = levelBox(level('garden-1'));
    expect(b.y0).toBeGreaterThan(40);
    expect(b.y1).toBeLessThan(BOARD.h - 40);
  });

  it('keeps a branch gecko and the marble on its tail in view', () => {
    const l = level('garden-9');
    const s = l.shooter;
    if (s.kind !== 'rail') throw new Error('garden-9 is a rail level');
    expect(levelBox(l).y1).toBeGreaterThanOrEqual(s.y + 60);
  });
});

describe('frameBox', () => {
  it('fills the screen with the box, the tighter way', () => {
    const box = { x0: 100, y0: 100, x1: 1100, y1: 600 };
    expect(frameBox({ width: 1000, height: 1000 }, box, false).zoom).toBeCloseTo(1);
    expect(frameBox({ width: 2000, height: 250 }, box, false).zoom).toBeCloseTo(0.5);
  });

  it('turns with an upright phone: the board runs down the screen', () => {
    const f = frameBox({ width: 360, height: 1280 }, FULL_BOARD, true);
    expect(f.zoom).toBeCloseTo(0.5);
  });

  it('never draws past maxZoom', () => {
    expect(frameBox({ width: 4000, height: 4000 }, FULL_BOARD, false, 1.6).zoom).toBe(1.6);
  });

  it('keeps the view on the board where the screen shows more than the box', () => {
    // A box hugging the top, on a screen that shows 500 rows: the view's top stays at the board's.
    const f = frameBox({ width: 1280, height: 500 }, { x0: 0, y0: 0, x1: 1280, y1: 200 }, false, 1);
    expect(f.y - 250).toBeCloseTo(0);
    // A screen showing more than the whole board centres it.
    expect(frameBox({ width: 1280, height: 2000 }, FULL_BOARD, false).y).toBe(BOARD.h / 2);
  });
});
