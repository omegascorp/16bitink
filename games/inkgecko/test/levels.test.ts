import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { BOARD, type LevelDef } from '../src/level/types';
import { CHARMS } from '../src/logic/charms';
import { COLOURS } from '../src/logic/colours';
import { D } from '../src/logic/line';
import { buildPath, pointAt } from '../src/logic/path';

/** Room between the gecko's centre and any track, and (more, for the stones round it) a well. */
const GECKO_CLEAR = 120;
const WELL_CLEAR = 150;
/** Lanes of a track (or of two tracks) must not run closer than this. */
const LANE_GAP = D * 1.2;

const paths = (l: LevelDef) => l.tracks.map((t) => buildPath(t.points));

describe('chapter 1', () => {
  it('has ten levels with unique ids', () => {
    expect(CHAPTER_1).toHaveLength(10);
    expect(new Set(CHAPTER_1.map((l) => l.id)).size).toBe(10);
  });

  it('mixes pivot and rail levels, starting on a pivot', () => {
    expect(CHAPTER_1[0]!.shooter.kind).toBe('pivot');
    expect(CHAPTER_1.filter((l) => l.shooter.kind === 'rail').length).toBeGreaterThanOrEqual(3);
  });

  for (const level of CHAPTER_1) {
    describe(level.id, () => {
      it('uses known colours and charms', () => {
        expect(level.colours).toBeGreaterThanOrEqual(3);
        expect(level.colours).toBeLessThanOrEqual(COLOURS.length);
        for (const c of level.charms) expect(CHARMS).toContain(c);
        expect(level.goal).toBeGreaterThan(0);
        expect(level.par).toBeGreaterThan(30);
      });

      it('keeps its tracks on the board (the burrow may sit just off an edge)', () => {
        for (const p of paths(level)) {
          for (const q of p.pts) {
            expect(q.x).toBeGreaterThan(-40);
            expect(q.x).toBeLessThan(BOARD.w + 40);
            expect(q.y).toBeGreaterThan(70);
            expect(q.y).toBeLessThan(BOARD.h - 10);
          }
          const end = pointAt(p, p.length);
          expect(end.x).toBeGreaterThan(60);
          expect(end.x).toBeLessThan(BOARD.w - 60);
        }
      });

      it('leaves room round the gecko', () => {
        const s = level.shooter;
        for (const p of paths(level)) {
          for (const q of p.pts) {
            if (s.kind === 'pivot') expect(Math.hypot(q.x - s.x, q.y - s.y)).toBeGreaterThan(GECKO_CLEAR);
            else expect(s.y - q.y).toBeGreaterThan(120);
          }
          const end = pointAt(p, p.length);
          if (s.kind === 'pivot') expect(Math.hypot(end.x - s.x, end.y - s.y)).toBeGreaterThan(WELL_CLEAR);
        }
      });

      it('never runs its lanes into each other', () => {
        const all = paths(level);
        all.forEach((p, i) => {
          all.forEach((o, j) => {
            if (j < i) return;
            for (let a = 0; a < p.pts.length; a += 3) {
              for (let b = 0; b < o.pts.length; b += 3) {
                if (i === j && Math.abs(p.cum[a]! - o.cum[b]!) < D * 4) continue;
                const d = Math.hypot(p.pts[a]!.x - o.pts[b]!.x, p.pts[a]!.y - o.pts[b]!.y);
                if (d < LANE_GAP) throw new Error(`${level.id}: track ${i} at ${Math.round(p.cum[a]!)} runs ${Math.round(d)}px from track ${j} at ${Math.round(o.cum[b]!)}`);
              }
            }
          });
        });
      });

      it('is long enough to play', () => {
        for (const p of paths(level)) expect(p.length).toBeGreaterThan(D * 30);
      });
    });
  }
});
