import { bezier, cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { Blade } from '../propsKit';
import { blackFeather, feather, MAG, mapBlade, plumage, primary, whitePatch } from './magpieParts';

/**
 * The Magpie's wings, seen from above. Built for the right wing (+y side)
 * and mirrored for the left. Folded, they lie along the back with the
 * long primaries crossing over the tail; spread, the black arm with its
 * glossy coverts and secondaries ends in a hand of white-webbed, black-tipped
 * primaries. `beat` sweeps a spread wing down and back (foreshortened).
 */

interface Wing {
  readonly primaries: readonly Blade[];
  readonly secondaries: readonly Blade[];
  readonly coverts: Pt[];
  readonly scapular: Blade;
  /** Widths of the primaries and secondaries. */
  readonly pw: number;
  readonly sw: number;
  /** Primaries white-webbed (spread) or tucked black (folded). */
  readonly open: boolean;
}

const SHOULDER = pt(16, 9);

/** The folded wing: primaries tucked under, tertials over them, coverts at the shoulder, the white scapulars. */
function folded(): Wing {
  const primaries = Array.from({ length: 5 }, (_, i) => feather(pt(6 - i * 2, 9 - i * 0.5), Math.PI + 0.12 - i * 0.02, 37 - i * 3, 6.5));
  const secondaries = Array.from({ length: 4 }, (_, i) => feather(pt(16 - i * 3.2, 9.6 - i * 0.6), Math.PI + 0.1 + i * 0.03, 26 - i * 2.4, 7));
  const coverts = [...cub(pt(23, 5), pt(22, 10), pt(17, 12.4), pt(9, 12.2), 10), ...cub(pt(9, 12.2), pt(1, 12), pt(-3, 9.5), pt(-1, 6.5), 8).slice(1), ...bezier(pt(-1, 7), pt(10, 5), pt(23, 5.5), 8).slice(1, -1)];
  return { primaries, secondaries, coverts, scapular: feather(pt(24, 4.6), Math.PI - 0.1, 27, 8), pw: 6.5, sw: 7, open: false };
}

/** The spread wing: coverts over the arm, secondaries along the trailing edge, primaries fanned at the hand. */
function spread(): Wing {
  const primaries = Array.from({ length: 7 }, (_, i) => {
    const u = i / 6;
    const root = pt(9 + 5 * u, 33 + 8 * u);
    return feather(root, 2.6 - i * 0.175, 20 + i * 0.7, 7);
  });
  const secondaries = Array.from({ length: 8 }, (_, i) => {
    const u = i / 7;
    return feather(pt(7 - u, 12 + 23 * u), Math.PI - 0.08 - u * 0.3, 19 - u * 2, 7.8);
  });
  const coverts = [...cub(SHOULDER, pt(21, 17), pt(22, 28), pt(17.5, 38.5), 14), ...cub(pt(17.5, 38.5), pt(13.5, 41), pt(9, 39.5), pt(6.5, 35), 6).slice(1), ...cub(pt(6.5, 35), pt(3.5, 28), pt(2.5, 18), pt(3.5, 9.5), 10).slice(1), ...bezier(pt(3, 9.5), pt(10, 7.5), SHOULDER, 4).slice(1, -1)];
  return { primaries, secondaries, coverts, scapular: feather(pt(20, 6), Math.PI - 0.32, 22, 9), pw: 6.6, sw: 7.8, open: true };
}

/** Moves every part of a wing through `f`. */
function mapWing(w: Wing, f: (p: Pt) => Pt): Wing {
  return {
    ...w,
    primaries: w.primaries.map((b) => mapBlade(b, f)),
    secondaries: w.secondaries.map((b) => mapBlade(b, f)),
    coverts: w.coverts.map(f),
    scapular: mapBlade(w.scapular, f),
  };
}

/** The downbeat: the wing foreshortened as it dips and swept back about the shoulder. */
function beat(p: Pt): Pt {
  const dx = p.x - SHOULDER.x;
  const dy = (p.y - SHOULDER.y) * 0.66;
  const a = 0.62;
  return pt(SHOULDER.x + dx * Math.cos(a) - dy * Math.sin(a), SHOULDER.y + dx * Math.sin(a) + dy * Math.cos(a));
}

/** Scallops of small feathers in rows across a shape (the coverts, the back). */
export function scallops(d: Draw, c: readonly Pt[], open: boolean): void {
  const { pen } = d;
  const xs = c.map((p) => p.x);
  const ys = c.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(c, () => {
    const step = open ? 3.6 : 3.2;
    for (let y = y0 + 1.5, row = 0; y < y1; y += step, row++) {
      for (let x = x1 - 2 - (row % 2) * 2.2; x > x0; x -= 4.4) {
        pen.hair(bezier(pt(x + 1.6, y - 1.4), pt(x - 1.8, y), pt(x + 1.6, y + 1.4), 4), 0.35, MAG.line, 0.45);
      }
    }
  });
}

/** One wing, back to front: primaries, secondaries, coverts, white scapulars. */
function paintWing(d: Draw, w: Wing, part: WingPart): void {
  if (part === 'scapulars') {
    whitePatch(d, w.scapular, 3, 15, 6.5);
    return;
  }
  // The outer web lies forward of the shaft: −w on both sides (a mirror in y keeps x).
  if (w.open) for (const f of w.primaries) primary(d, f, w.pw, -1);
  else for (const f of w.primaries) blackFeather(d, f, w.pw, [MAG.blue, MAG.purple, MAG.green]);
  for (const f of [...w.secondaries].reverse()) blackFeather(d, f, w.sw, [MAG.blue, MAG.green, MAG.purple]);
  const cx = w.coverts.reduce((s, p) => s + p.x, 0) / w.coverts.length;
  const cy = w.coverts.reduce((s, p) => s + p.y, 0) / w.coverts.length;
  plumage(d, w.coverts, [[cx + 2, cy - 3, 8, MAG.blue], [cx - 3, cy + 4, 7, MAG.purple], [cx + 4, cy + 6, 5, MAG.green]], 0.9);
  scallops(d, w.coverts, w.open);
  if (part === 'all') whitePatch(d, w.scapular, 3, 15, 6.5);
}

export type WingPose = 'folded' | 'spread' | 'beat';
/** Which parts to paint: everything, all but the scapulars (under the body in flight), or only them. */
export type WingPart = 'all' | 'feathers' | 'scapulars';

/** A wing's every outline, for the cast shadow. */
export function wingSilhouette(pose: WingPose, mirror: boolean): Pt[][] {
  const w = wingFor(pose, mirror);
  return [...w.primaries.map((b) => b.shape), ...w.secondaries.map((b) => b.shape), w.coverts];
}

function wingFor(pose: WingPose, mirror: boolean): Wing {
  const base = pose === 'folded' ? folded() : pose === 'beat' ? mapWing(spread(), beat) : spread();
  return mirror ? mapWing(base, (p) => pt(p.x, -p.y)) : base;
}

/** Both wings in a pose. */
export function paintWings(d: Draw, pose: WingPose, part: WingPart = 'all'): void {
  for (const mirror of [false, true]) paintWing(d, wingFor(pose, mirror), part);
}
