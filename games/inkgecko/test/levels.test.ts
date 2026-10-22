import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { CHAPTER_2 } from '../src/level/chapter2';
import { CHAPTER_3 } from '../src/level/chapter3';
import { CHAPTER_4 } from '../src/level/chapter4';
import { CHAPTER_5 } from '../src/level/chapter5';
import { CHAPTER_6 } from '../src/level/chapter6';
import { CHAPTER_7 } from '../src/level/chapter7';
import { CHAPTER_8 } from '../src/level/chapter8';
import { CHAPTER_9 } from '../src/level/chapter9';
import { CHAPTER_10 } from '../src/level/chapter10';
import { findCrossings } from '../src/level/cross';
import { BOARD, type LevelDef } from '../src/level/types';
import { CHARMS } from '../src/logic/charms';
import { COLOURS } from '../src/logic/colours';
import { D } from '../src/logic/line';
import { TUNNEL_MAX, TUNNEL_MIN } from '../src/art/placesArt';
import { buildPath, pointAt } from '../src/logic/path';

/** Room between the gecko's centre and any track, and (more, for the stones round it) a well. */
const GECKO_CLEAR = 120;
const WELL_CLEAR = 150;
/** Lanes of a track (or of two tracks) must not run closer than this. */
const LANE_GAP = D * 1.2;
/** Room between a pillar's edge and any track's centre line, board px. */
const PILLAR_CLEAR = 34;
/** Lily pads (radius ~58) mustn't overlap. */
const PAD_GAP = 150;

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

});

describe('chapter 2', () => {
  it('has ten levels with unique ids, and brings in hopping, tunnels and the Dragonfly', () => {
    expect(CHAPTER_2).toHaveLength(10);
    const ids = [...CHAPTER_1, ...CHAPTER_2].map((l) => l.id);
    expect(new Set(ids).size).toBe(20);
    expect(CHAPTER_2.filter((l) => l.shooter.kind === 'hop').length).toBeGreaterThanOrEqual(3);
    expect(CHAPTER_2.filter((l) => l.tracks.some((t) => t.tunnels?.length)).length).toBeGreaterThanOrEqual(5);
    expect(CHAPTER_2.some((l) => l.charms.includes('dragonfly'))).toBe(true);
  });
});

/** Where the gecko can stand: its spot, its pads, or along its branch. */
const stands = (l: LevelDef): { x: number; y: number }[] | null => {
  const s = l.shooter;
  return s.kind === 'pivot' ? [s] : s.kind === 'hop' ? [...s.pads] : null;
};

describe('crossings', () => {
  it('cross at a readable angle', () => {
    for (const level of [...CHAPTER_3, ...CHAPTER_4, ...CHAPTER_5, ...CHAPTER_6, ...CHAPTER_7, ...CHAPTER_8, ...CHAPTER_9, ...CHAPTER_10]) {
      for (const c of findCrossings(paths(level))) expect(c.angle, `${level.id} at (${Math.round(c.at.x)}, ${Math.round(c.at.y)})`).toBeGreaterThan(0.6);
    }
  });

  it('chapter 3 is built round them', () => {
    expect(CHAPTER_3.filter((l) => findCrossings(paths(l)).length > 0).length).toBeGreaterThanOrEqual(7);
  });
});

describe('every level', () => {
  for (const level of [...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3, ...CHAPTER_4, ...CHAPTER_5, ...CHAPTER_6, ...CHAPTER_7, ...CHAPTER_8, ...CHAPTER_9, ...CHAPTER_10]) {
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
        const spots = stands(level);
        for (const p of paths(level)) {
          for (const q of p.pts) {
            if (spots) for (const g of spots) expect(Math.hypot(q.x - g.x, q.y - g.y)).toBeGreaterThan(GECKO_CLEAR);
            else if (s.kind === 'rail') expect(s.y - q.y).toBeGreaterThan(120);
          }
          const end = pointAt(p, p.length);
          if (spots) for (const g of spots) expect(Math.hypot(end.x - g.x, end.y - g.y)).toBeGreaterThan(WELL_CLEAR);
        }
      });

      it('stands its pillars on the board, clear of the tracks, the gecko and each other', () => {
        const pillars = level.pillars ?? [];
        const spots = stands(level);
        const s = level.shooter;
        pillars.forEach((c, i) => {
          expect(c.x - c.r).toBeGreaterThan(30);
          expect(c.x + c.r).toBeLessThan(BOARD.w - 30);
          expect(c.y - c.r).toBeGreaterThan(30);
          for (const p of paths(level)) for (const q of p.pts) expect(Math.hypot(q.x - c.x, q.y - c.y), `${level.id} pillar ${i}`).toBeGreaterThan(c.r + PILLAR_CLEAR);
          if (spots) for (const g of spots) expect(Math.hypot(g.x - c.x, g.y - c.y), `${level.id} pillar ${i} by the gecko`).toBeGreaterThan(c.r + GECKO_CLEAR * 0.7);
          else if (s.kind === 'rail') expect(s.y - c.y, `${level.id} pillar ${i} by the branch`).toBeGreaterThan(c.r + 50);
          pillars.forEach((o, j) => j > i && expect(Math.hypot(o.x - c.x, o.y - c.y)).toBeGreaterThan(c.r + o.r + D * 1.5));
        });
      });

      it('never runs its lanes into each other (except over and under a crossing)', () => {
        const all = paths(level);
        const within = (list: readonly { from: number; to: number }[] | undefined, s: number, L: number): boolean => (list ?? []).some((c) => s >= c.from * L && s <= c.to * L);
        const under = (t: number, s: number): boolean => within(level.tracks[t]!.tunnels, s, all[t]!.length);
        const over = (t: number, s: number): boolean => within(level.tracks[t]!.raised, s, all[t]!.length);
        all.forEach((p, i) => {
          all.forEach((o, j) => {
            if (j < i) return;
            for (let a = 0; a < p.pts.length; a += 3) {
              for (let b = 0; b < o.pts.length; b += 3) {
                if (i === j && Math.abs(p.cum[a]! - o.cum[b]!) < D * 4) continue;
                const sa = p.cum[a]!;
                const sb = o.cum[b]!;
                if ((under(i, sa) && over(j, sb)) || (over(i, sa) && under(j, sb))) continue;
                const d = Math.hypot(p.pts[a]!.x - o.pts[b]!.x, p.pts[a]!.y - o.pts[b]!.y);
                if (d < LANE_GAP) throw new Error(`${level.id}: track ${i} at ${Math.round(p.cum[a]!)} runs ${Math.round(d)}px from track ${j} at ${Math.round(o.cum[b]!)}`);
              }
            }
          });
        });
      });

      it('keeps lily pads apart and tunnels in the open middle of a track', () => {
        const s = level.shooter;
        if (s.kind === 'hop') {
          expect(s.pads.length).toBeGreaterThanOrEqual(2);
          s.pads.forEach((a, i) => s.pads.forEach((b, j) => j > i && expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(PAD_GAP)));
        }
        for (const t of level.tracks) {
          const length = buildPath(t.points).length;
          for (const c of t.tunnels ?? []) {
            // As long as the tunnel art is made for.
            expect((c.to - c.from) * length).toBeGreaterThan(TUNNEL_MIN);
            expect((c.to - c.from) * length).toBeLessThan(TUNNEL_MAX);
            expect(c.to).toBeLessThanOrEqual(0.85);
            expect(c.to - c.from).toBeGreaterThan(0.04);
          }
        }
      });

      it('is long enough to play', () => {
        for (const p of paths(level)) expect(p.length).toBeGreaterThan(D * 30);
      });
    });
  }
});
