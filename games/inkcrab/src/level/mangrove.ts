import { createRng, rangeOf, type Rng } from '../logic/rng';
import { createRoots, curveAt, setRoot, type Pt, type RootStroke, type Roots } from '../logic/roots';
import { surfaceRow, type Terrain } from '../logic/terrain';

/** A red mangrove: its trunk's column, how tall it stands over the mud and how far its prop roots spread either side (tiles). */
export type TreeSpec = readonly [col: number, height: number, spread: number];

/** What a tree grows into: the curves to draw (each also marked in the root tiles) and its crowns. */
interface Growth {
  readonly roots: Roots;
  readonly strokes: RootStroke[];
  readonly leaves: [number, number, number][];
}

/** Marks every tile a curve passes through, sampled finely enough to leave no gaps, and keeps it to draw. */
function trace(g: Growth, a: Pt, b: Pt, c: Pt, d: Pt, from: number, to: number): void {
  const curve = [a, b, c, d] as const;
  g.strokes.push({ curve, from, to });
  const steps = Math.ceil((Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y) + Math.hypot(d.x - c.x, d.y - c.y)) * 4);
  for (let i = 0; i <= steps; i++) {
    const p = curveAt(curve, i / steps);
    setRoot(g.roots, Math.floor(p.x), Math.floor(p.y));
  }
}

/**
 * A prop root: springs out of the trunk, arches up and out, then curves
 * down steeply into the mud `reach` tiles away (on the side `side`).
 */
function propRoot(g: Growth, t: Terrain, from: Pt, side: 1 | -1, reach: number, rng: Rng): void {
  const footX = Math.floor(from.x + side * reach);
  const foot = { x: footX + 0.5, y: surfaceRow(t, footX) + 0.6 };
  const rise = rangeOf(rng, 0.6, 1.6);
  trace(g, from, { x: from.x + side * reach * 0.45, y: from.y - rise }, { x: foot.x - side * reach * 0.08, y: from.y - rise * 0.4 }, foot, 0.5, 0.36);
}

/**
 * Grows one tree: a two-tile trunk standing on its stilt roots, prop roots
 * arching down to the mud on both sides (from the trunk's foot and from
 * higher up), near-level branches spreading from the top and halfway up to
 * walk along, and leafy crowns over them.
 */
function grow(g: Growth, t: Terrain, [col, height, spread]: TreeSpec, rng: Rng): void {
  const ground = surfaceRow(t, col);
  const top = ground - height;
  const foot = ground - Math.max(2, Math.round(height * 0.35));
  const lean = rangeOf(rng, -0.3, 0.3);
  // The trunk: tiles two wide, drawn as one stem tapering upwards with a slight lean. Its tiles run on
  // down between the stilts to the mud, so a crab under the tree can climb straight up into it.
  for (let y = top; y < ground; y++) {
    setRoot(g.roots, col, y);
    setRoot(g.roots, col + 1, y);
  }
  g.strokes.push({ curve: [{ x: col + 1, y: foot + 0.6 }, { x: col + 1 - lean, y: foot - (foot - top) * 0.35 }, { x: col + 1 + lean, y: top + (foot - top) * 0.3 }, { x: col + 1, y: top + 0.2 }], from: 1.5, to: 1 });
  // Stilts: the inner pair straight down under the trunk, then arches out to the full spread from its foot and halfway up.
  trace(g, { x: col + 0.5, y: foot }, { x: col, y: foot + 1 }, { x: col - 0.4, y: ground - 0.5 }, { x: col - 0.6, y: ground + 0.6 }, 0.6, 0.42);
  trace(g, { x: col + 1.5, y: foot }, { x: col + 2, y: foot + 1 }, { x: col + 2.4, y: ground - 0.5 }, { x: col + 2.6, y: ground + 0.6 }, 0.6, 0.42);
  const mid = Math.round((top + foot) / 2);
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? col + 0.6 : col + 1.4;
    propRoot(g, t, { x, y: foot + 0.5 }, side, spread * rangeOf(rng, 0.5, 0.65), rng);
    propRoot(g, t, { x, y: mid + 0.5 }, side, spread * rangeOf(rng, 0.85, 1), rng);
  }
  // Branches: near level, a little higher at the tips, one on each side at the top and one lower down.
  const branches: [1 | -1, number, number][] = [[-1, top + 1, spread * 0.8], [1, top + 2, spread * 0.85], [rng() < 0.5 ? -1 : 1, mid - 1, spread * 0.55]];
  for (const [side, row, len] of branches) {
    const x0 = side < 0 ? col + 0.6 : col + 1.4;
    const tip = { x: x0 + side * Math.max(2, Math.round(len)), y: row + 0.5 - rangeOf(rng, 0, 0.8) };
    trace(g, { x: x0, y: row + 0.5 }, { x: x0 + side * len * 0.35, y: row + 0.5 }, { x: tip.x - side * len * 0.3, y: tip.y + 0.2 }, tip, 0.55, 0.25);
    g.leaves.push([tip.x, tip.y - 1.2, rangeOf(rng, 2, 2.8)]);
  }
  g.leaves.push([col + 1, top - 1.2, rangeOf(rng, 2.8, 3.4)]);
}

/** The mangrove roots of a level, grown from its trees. Pure for a given terrain, trees and seed. */
export function growRoots(t: Terrain, trees: readonly TreeSpec[], seed: number): Roots {
  const rng = createRng(seed ^ 0x5bd1e995);
  const leaves: [number, number, number][] = [];
  const strokes: RootStroke[] = [];
  const g: Growth = { roots: createRoots(t.width, t.height, leaves, strokes), strokes, leaves };
  for (const tree of trees) grow(g, t, tree, rng);
  return g.roots;
}
