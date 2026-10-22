import { describe, expect, it } from 'vitest';
import { angleAt, buildPath, crossings, pointAt } from '../src/logic/path';

const straight = buildPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }]);

describe('path', () => {
  it('measures a straight line', () => {
    expect(straight.length).toBeCloseTo(200, 0);
    expect(pointAt(straight, 50).x).toBeCloseTo(50, 0);
    expect(pointAt(straight, 50).y).toBeCloseTo(0, 5);
  });

  it('clamps to its ends', () => {
    expect(pointAt(straight, -30)).toEqual(straight.pts[0]);
    expect(pointAt(straight, 9999)).toEqual(straight.pts.at(-1));
  });

  it('samples evenly so arc length is distance along the curve', () => {
    const curve = buildPath([{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 0 }, { x: 300, y: 100 }]);
    const gaps = curve.pts.slice(1).map((p, i) => Math.hypot(p.x - curve.pts[i]!.x, p.y - curve.pts[i]!.y));
    expect(Math.max(...gaps)).toBeLessThan(4.5);
    expect(curve.cum.at(-1)).toBeCloseTo(curve.length, 5);
  });

  it('passes through its control points', () => {
    const curve = buildPath([{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 0 }]);
    const near = Math.min(...curve.pts.map((p) => Math.hypot(p.x - 100, p.y - 100)));
    expect(near).toBeLessThan(2.5);
  });

  it('gives the direction of travel', () => {
    expect(angleAt(straight, 100)).toBeCloseTo(0, 3);
    const down = buildPath([{ x: 0, y: 0 }, { x: 0, y: 100 }]);
    expect(angleAt(down, 50)).toBeCloseTo(Math.PI / 2, 3);
  });

  it('finds where a segment crosses it', () => {
    const hits = crossings(straight, { x: 75, y: -20 }, { x: 75, y: 20 });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toBeCloseTo(75, 0);
    expect(crossings(straight, { x: 75, y: 5 }, { x: 75, y: 20 })).toHaveLength(0);
  });
});
