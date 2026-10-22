import { describe, expect, it } from 'vitest';
import { pondReach, type PondKeep } from '../src/art/pond';
import { CHAPTER_2 } from '../src/level/chapter2';
import { BOARD } from '../src/level/types';
import { buildPath } from '../src/logic/path';

describe('the pond keeps its water off the tracks', () => {
  for (const level of CHAPTER_2) {
    it(level.id, () => {
      const grooves = level.tracks.map((t) => buildPath(t.points).pts);
      const keep: PondKeep = { grooves, pads: level.shooter.kind === 'hop' ? level.shooter.pads : [] };
      for (const g of grooves) {
        for (const q of g) {
          if (q.x < 0 || q.x > BOARD.w || q.y < 0 || q.y > BOARD.h) continue;
          expect(pondReach(q.x, q.y, BOARD.w, BOARD.h, keep), `${level.id} at (${Math.round(q.x)}, ${Math.round(q.y)})`).toBeLessThan(0.95);
        }
      }
    });
  }
});
