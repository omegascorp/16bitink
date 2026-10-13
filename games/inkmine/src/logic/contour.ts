/**
 * Marching squares over tile centres, used to ink the sand: each cell
 * between four tile centres gets a fill polygon (where the hatching goes)
 * and the edge segments where the pen outlines a dug surface. Corners are
 * cut at 45°, so tunnels read as scooped rather than pixel stairs.
 *
 * Coordinates are in the unit cell: tl (0,0), tr (1,0), br (1,1), bl (0,1).
 */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface CellGeometry {
  readonly fill: readonly (readonly Pt[])[];
  readonly edges: readonly (readonly [Pt, Pt])[];
}

export function cellCase(tl: boolean, tr: boolean, br: boolean, bl: boolean): number {
  return (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
}

const TL: Pt = { x: 0, y: 0 };
const TR: Pt = { x: 1, y: 0 };
const BR: Pt = { x: 1, y: 1 };
const BL: Pt = { x: 0, y: 1 };
const T: Pt = { x: 0.5, y: 0 };
const R: Pt = { x: 1, y: 0.5 };
const B: Pt = { x: 0.5, y: 1 };
const L: Pt = { x: 0, y: 0.5 };

// Saddles (5, 10) keep the two solid corners joined so diagonal sand stays one mass.
const TABLE: readonly CellGeometry[] = [
  { fill: [], edges: [] },
  { fill: [[L, B, BL]], edges: [[L, B]] },
  { fill: [[B, R, BR]], edges: [[B, R]] },
  { fill: [[L, R, BR, BL]], edges: [[L, R]] },
  { fill: [[T, TR, R]], edges: [[T, R]] },
  { fill: [[T, TR, R, B, BL, L]], edges: [[L, T], [B, R]] },
  { fill: [[T, TR, BR, B]], edges: [[T, B]] },
  { fill: [[T, TR, BR, BL, L]], edges: [[L, T]] },
  { fill: [[TL, T, L]], edges: [[T, L]] },
  { fill: [[TL, T, B, BL]], edges: [[T, B]] },
  { fill: [[TL, T, R, BR, B, L]], edges: [[T, R], [B, L]] },
  { fill: [[TL, T, R, BR, BL]], edges: [[T, R]] },
  { fill: [[TL, TR, R, L]], edges: [[L, R]] },
  { fill: [[TL, TR, R, B, BL]], edges: [[R, B]] },
  { fill: [[TL, TR, BR, B, L]], edges: [[B, L]] },
  { fill: [[TL, TR, BR, BL]], edges: [] },
];

export function cellGeometry(code: number): CellGeometry {
  return TABLE[code & 15]!;
}
