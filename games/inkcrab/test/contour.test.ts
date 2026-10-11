import { describe, expect, it } from 'vitest';
import { cellCase, cellGeometry, type Pt } from '../src/logic/contour';

const area = (poly: readonly Pt[]): number => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
};
const filled = (code: number): number => cellGeometry(code).fill.reduce((s, p) => s + area(p), 0);

describe('marching squares', () => {
  it('packs the corners into a case code', () => {
    expect(cellCase(false, false, false, false)).toBe(0);
    expect(cellCase(true, true, true, true)).toBe(15);
    expect(cellCase(true, false, false, false)).toBe(8);
    expect(cellCase(false, false, false, true)).toBe(1);
  });

  it('fills nothing for open air and everything for solid sand, with no ink inside', () => {
    expect(cellGeometry(0)).toEqual({ fill: [], edges: [] });
    expect(filled(15)).toBeCloseTo(1);
    expect(cellGeometry(15).edges).toEqual([]);
  });

  it('cuts 45° corners and straight halves', () => {
    expect(filled(1)).toBeCloseTo(0.125);
    expect(filled(3)).toBeCloseTo(0.5);
    expect(filled(7)).toBeCloseTo(0.875);
    expect(filled(12)).toBeCloseTo(0.5);
  });

  it('keeps diagonal sand connected at saddles', () => {
    expect(filled(5)).toBeCloseTo(0.75);
    expect(filled(10)).toBeCloseTo(0.75);
    expect(cellGeometry(5).edges).toHaveLength(2);
    expect(cellGeometry(10).edges).toHaveLength(2);
  });

  it('draws one edge for every other mixed case, on the cell border midpoints', () => {
    for (let code = 1; code < 15; code++) {
      if (code === 5 || code === 10) continue;
      const { edges } = cellGeometry(code);
      expect(edges).toHaveLength(1);
      for (const p of edges[0]!) expect([p.x, p.y].some((v) => v === 0.5)).toBe(true);
    }
  });

  it('is symmetric: a case and its complement cover the whole cell', () => {
    for (let code = 1; code < 15; code++) {
      if (code === 5 || code === 10) continue;
      expect(filled(code) + filled(15 - code)).toBeCloseTo(1);
    }
  });
});
