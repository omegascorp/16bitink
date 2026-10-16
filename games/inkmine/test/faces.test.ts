import { describe, expect, it } from 'vitest';
import { facesOf, type Facing } from '../src/art/groundPaint';
import { cellCase, cellGeometry } from '../src/logic/contour';

const T = 32;

/** The faces of one marching-squares cell whose corner tiles are solid as given (top-left, top-right, bottom-right, bottom-left). */
function facesFor(tl: boolean, tr: boolean, br: boolean, bl: boolean): Facing[] {
  const solid = (x: number, y: number): boolean => [[tl, tr], [bl, br]][y]?.[x] ?? false;
  const code = cellCase(tl, tr, br, bl);
  const segs = cellGeometry(code).edges.map(([a, b]) => [(0.5 + a.x) * T, (0.5 + a.y) * T, (0.5 + b.x) * T, (0.5 + b.y) * T] as [number, number, number, number]);
  return facesOf(segs, (wx, wy) => solid(Math.floor(wx / T), Math.floor(wy / T)), T).map((f) => f.facing);
}

describe('which way a dug face looks', () => {
  it('flat ground faces up, a flat ceiling down', () => {
    expect(facesFor(false, false, true, true)).toEqual(['up']);
    expect(facesFor(true, true, false, false)).toEqual(['down']);
  });

  it('a lone solid corner below the open faces up; above, down', () => {
    expect(facesFor(false, false, true, false)).toEqual(['up']);
    expect(facesFor(false, false, false, true)).toEqual(['up']);
    expect(facesFor(true, false, false, false)).toEqual(['down']);
    expect(facesFor(false, true, false, false)).toEqual(['down']);
  });

  it('a lone open corner: open below, it is a ceiling; open above, a floor', () => {
    expect(facesFor(true, true, false, true)).toEqual(['down']);
    expect(facesFor(true, true, true, false)).toEqual(['down']);
    expect(facesFor(false, true, true, true)).toEqual(['up']);
    expect(facesFor(true, false, true, true)).toEqual(['up']);
  });

  it('walls face sideways', () => {
    expect(facesFor(true, false, false, true)).toEqual(['side']);
    expect(facesFor(false, true, true, false)).toEqual(['side']);
  });
});
