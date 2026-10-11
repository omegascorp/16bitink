import type { Box } from './body';

/**
 * Mangrove roots (Mangrove Margins, beach 4): a tangle of wood over the mud,
 * kept apart from the sand grid. Roots never change, never hold sand and
 * aren't solid: a crab passes through the tangle, climbs about in it (see
 * sim.ts), and stands on the top of a root as on a ledge. Things that can't
 * climb walk straight through under them.
 */
export interface Roots {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  /** Leafy crowns over the trees: centre column, row and radius, in tiles. Drawn only. */
  readonly leaves: readonly (readonly [number, number, number])[];
  /** The curves the roots were traced along, for drawing them smooth (the tiles are only for play). */
  readonly strokes: readonly RootStroke[];
}

/** One root, trunk or branch as drawn: a cubic curve in tiles, and its thickness (tiles) at each end. */
export interface RootStroke {
  readonly curve: readonly [Pt, Pt, Pt, Pt];
  readonly from: number;
  readonly to: number;
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export function createRoots(width: number, height: number, leaves: Roots['leaves'] = [], strokes: Roots['strokes'] = []): Roots {
  return { width, height, cells: new Uint8Array(width * height), leaves, strokes };
}

/** A point along a cubic curve, `t` from 0 to 1. */
export function curveAt([a, b, c, d]: RootStroke['curve'], t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

export function isRoot(r: Roots, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < r.width && y < r.height && r.cells[y * r.width + x] === 1;
}

/** Marks a tile as root; outside the grid it does nothing. */
export function setRoot(r: Roots, x: number, y: number): void {
  if (x >= 0 && y >= 0 && x < r.width && y < r.height) r.cells[y * r.width + x] = 1;
}

/** The top of a root: a ledge to stand on (root, with no root over it). */
export function isLedge(r: Roots, x: number, y: number): boolean {
  return isRoot(r, x, y) && !isRoot(r, x, y - 1);
}

/** How far (share of a tile) past its box a crab reaches to take hold of a root. */
const GRIP = 0.25;

/** Whether a box touches (or nearly touches) any root tile: what a crab can grip. */
export function inRoots(r: Roots | null, b: Box, tile: number): boolean {
  if (!r) return false;
  const pad = tile * GRIP;
  const x0 = Math.floor((b.x - pad) / tile);
  const x1 = Math.floor((b.x + b.w + pad - 1e-6) / tile);
  const y0 = Math.floor((b.y - pad) / tile);
  const y1 = Math.floor((b.y + b.h - 1e-6) / tile);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isRoot(r, x, y)) return true;
  return false;
}

/** The highest root ledge in a column (its row), or null where no root grows. */
export function perchRow(r: Roots | null, x: number): number | null {
  if (!r) return null;
  for (let y = 0; y < r.height; y++) if (isRoot(r, x, y)) return y;
  return null;
}
