import { describe, expect, it } from 'vitest';
import { findLoop } from '../src/logic/coil';
import { makePrey } from '../src/logic/prey';
import { createRng } from '../src/logic/rng';
import { NO_INPUT, Snake } from '../src/logic/snake';
import { SPACING, Trail } from '../src/logic/trail';
import { dist, pt } from '../src/logic/vec';

const BOUNDS = { w: 960, h: 540 };

describe('trail', () => {
  it('starts straight behind the head, as long as asked', () => {
    const t = new Trail(pt(500, 300), 0, 120);
    expect(t.head).toEqual(pt(500, 300));
    expect(t.tail.x).toBeCloseTo(380, 0);
    expect(t.count).toBe(Math.ceil(120 / SPACING) + 1);
  });

  it('keeps samples SPACING apart as the head moves, and the length fixed', () => {
    const t = new Trail(pt(500, 300), 0, 100);
    for (let i = 0; i < 50; i++) t.moveHead(pt(500 + i * 2.7, 300 + i * 1.1));
    const pts = t.pts.slice(1, t.count);
    for (let i = 1; i < pts.length; i++) expect(dist(pts[i]!, pts[i - 1]!)).toBeCloseTo(SPACING, 4);
    expect(t.pts.length).toBeLessThanOrEqual(Math.ceil(100 / SPACING) + 2);
  });

  it('finds points back along the body', () => {
    const t = new Trail(pt(500, 300), 0, 100);
    t.moveHead(pt(502, 300));
    expect(t.at(0)).toEqual(pt(502, 300));
    expect(t.at(42).x).toBeCloseTo(460, 0);
    expect(t.at(9999)).toEqual(t.tail);
  });
});

describe('snake', () => {
  it('turns towards the pointer no faster than its turn rate', () => {
    const s = new Snake('corn', pt(400, 360), 0, 150);
    s.steer({ ...NO_INPUT, toward: pt(400, 100) }, 0.1, BOUNDS, []);
    expect(s.heading).toBeCloseTo(-s.spec.turn * 0.1, 5);
  });

  it('lunges on a strike, then rests before the next', () => {
    const s = new Snake('corn', pt(400, 360), 0, 150);
    expect(s.steer({ ...NO_INPUT, strike: true }, 1 / 60, BOUNDS, [])).toBe(true);
    expect(s.striking).toBe(true);
    expect(s.steer({ ...NO_INPUT, strike: true }, 1 / 60, BOUNDS, [])).toBe(false);
  });

  it('slides along the board edge instead of leaving it', () => {
    const s = new Snake("corn", pt(940, 270), 0.3, 150);
    for (let i = 0; i < 60; i++) s.steer(NO_INPUT, 1 / 60, BOUNDS, []);
    expect(s.head.x).toBeLessThanOrEqual(960 - s.width / 2);
    expect(s.head.y).toBeGreaterThan(360);
  });

  it('slides round a rock', () => {
    const s = new Snake('corn', pt(400, 362), 0, 150);
    const rock = { kind: 'circle' as const, x: 470, y: 360, r: 30 };
    for (let i = 0; i < 90; i++) s.steer({ ...NO_INPUT, face: 0 }, 1 / 60, BOUNDS, [rock]);
    expect(dist(s.head, rock)).toBeGreaterThanOrEqual(30 + s.width / 2 - 0.01);
  });

  it('grows as lumps go down, and nips never take it below its start', () => {
    const s = new Snake('corn', pt(400, 360), 0, 150);
    s.swallowed(13, 30);
    for (let i = 0; i < 120; i++) s.digest(1 / 60);
    expect(s.length).toBeCloseTo(180, 5);
    expect(s.nip(100)).toBeCloseTo(30, 5);
    expect(s.length).toBeCloseTo(150, 5);
  });

  it('bites itself turning in a tight circle, but not its neck', () => {
    const s = new Snake('corn', pt(600, 360), 0, 400);
    let bit = false;
    for (let i = 0; i < 240 && !bit; i++) {
      s.steer({ ...NO_INPUT, face: s.heading + 1 }, 1 / 60, BOUNDS, []);
      if (s.bitten() >= 0) bit = true;
    }
    expect(bit).toBe(true);
    const straight = new Snake('corn', pt(300, 360), 0, 400);
    for (let i = 0; i < 60; i++) straight.steer(NO_INPUT, 1 / 60, BOUNDS, []);
    expect(straight.bitten()).toBe(-1);
  });
});

describe('coil', () => {
  it('closes a loop round a rat the head circles', () => {
    const rng = createRng(1);
    const rat = makePrey(1, 'rat', pt(640, 300), rng);
    rat.mode = 'idle';
    const s = new Snake('corn', pt(640, 380), 0, 500);
    let loop = null;
    for (let i = 0; i < 400 && !loop; i++) {
      const a = Math.atan2(s.head.y - rat.y, s.head.x - rat.x) - 1.1;
      s.steer({ ...NO_INPUT, toward: pt(rat.x + Math.cos(a) * 70, rat.y + Math.sin(a) * 70) }, 1 / 60, BOUNDS, []);
      loop = findLoop(s, [rat]);
    }
    expect(loop?.prey).toEqual([rat]);
  });

  it('finds no loop round prey outside the body', () => {
    const rng = createRng(1);
    const rat = makePrey(1, 'rat', pt(100, 100), rng);
    rat.mode = 'idle';
    const s = new Snake('corn', pt(640, 380), 0, 500);
    for (let i = 0; i < 200; i++) s.steer({ ...NO_INPUT, face: s.heading + 0.6 }, 1 / 60, BOUNDS, []);
    expect(findLoop(s, [rat])).toBeNull();
  });
});
