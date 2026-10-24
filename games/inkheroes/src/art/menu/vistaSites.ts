import type { Rng } from '../../logic/rng';
import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { block, drum, frontOf, gable, HOLE, merlonRow, P, roundCrown, slit, THATCH, SHINGLE, type Box } from '../sites/build';
import { groundShadow, mix, paint, SHADOW, sprite } from '../sites/paintKit';
import { cone, finial } from '../sites/spire';

/**
 * The rival lord's castle, in the sites' 3/4 view (origin at the bottom
 * centre, up is −y): cold grey stone, a square keep under an oxblood
 * roof, two round towers with dark red caps, a crenellated curtain wall,
 * and over it all his great banner, red over black, streaming right.
 */
export const RIVAL = { stone: '#948f8b', roof: '#6a2b2d', red: '#a9302a', black: '#2a2430' } as const;

/** A long war banner on a pole from `foot`, `h` high: red over black, swallowtailed, rippling in the wind. */
export function warBanner(d: Draw, foot: Pt, h: number, len: number, wave: number): void {
  const top = pt(foot.x, foot.y - h);
  d.pen.stroke([foot, top], Math.max(0.7, len * 0.035), d.ink, 0.95, false);
  const deep = len * 0.42;
  const y0 = top.y + 1.5;
  const ripple = (u: number): number => Math.sin(u * Math.PI * 1.6 + wave) * len * 0.07 + u * len * 0.12;
  const edge = (v: number, n = 12): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return pt(top.x + u * len, y0 + v * deep * (1 - u * 0.25) + ripple(u));
  });
  const upper = edge(0);
  const mid = edge(0.5);
  const lower = edge(1);
  const tip = upper[upper.length - 1]!;
  const notch = pt(top.x + len * 0.8, (tip.y + lower[lower.length - 1]!.y) / 2 + len * 0.02);
  const black = [...mid.slice(0, -1), mid[mid.length - 1]!, notch, lower[lower.length - 1]!, ...[...lower].reverse().slice(1)];
  const redFull = [...upper, notch, ...[...mid].reverse()];
  paint(d, redFull, RIVAL.red, { shadow: 0.55, hatch: 0.18, line: 0.5 });
  paint(d, black, RIVAL.black, { shadow: 0.4, hatch: 0, line: 0.5 });
  // Folds: soft dark troughs across the cloth.
  for (const u of [0.3, 0.62]) {
    const a = pt(top.x + u * len, y0 + ripple(u));
    d.pen.hair(bezier(a, pt(a.x + len * 0.04, a.y + deep * 0.5), pt(a.x - len * 0.02, a.y + deep * 0.95), 6), Math.max(0.4, len * 0.02), mix(RIVAL.black, SHADOW, 0.3), 0.35);
  }
  d.pen.dot(top.x, top.y - 1, Math.max(1, len * 0.04), '#8f8676', 1);
}

function tower(d: Draw, rng: Rng, x: number, z: number, r: number, h: number): Pt {
  const t = drum(d, rng, x, z, r, 0, h, RIVAL.stone);
  slit(d, (u, v) => pt(t.base.x + u, t.base.y - v), -r * 0.4, h * 0.55, 1.8, 4.5);
  return cone(d, rng, t.top, r + 2, r * 2.2, RIVAL.roof, null);
}

function draw(d: Draw, rng: Rng, wave: number, banner: number): void {
  // The curtain wall behind, the keep, then the towers and the front wall.
  block(d, rng, { x0: -44, x1: 44, z0: 46, z1: 50, h0: 0, h1: 18 }, RIVAL.stone, 'stone');
  const keep: Box = { x0: -16, x1: 14, z0: 22, z1: 44, h0: 0, h1: 58 };
  block(d, rng, keep, RIVAL.stone, 'stone');
  const at = frontOf(keep);
  for (const u of [6, 19]) slit(d, at, u, 36, 2.6, 7);
  merlonRow(d, at, 0.5, 29.5, 58, RIVAL.stone, 3.4, 2.4);
  const turret = drum(d, rng, 12, 24, 5, 50, 70, RIVAL.stone);
  roundCrown(d, turret.top, 5, RIVAL.stone, 5);
  warBanner(d, P(-2, 33, 58), 48 * banner, 46 * banner, wave);
  for (const s of [-1, 1]) block(d, rng, { x0: s < 0 ? -46 : 42, x1: s < 0 ? -42 : 46, z0: 6, z1: 48, h0: 0, h1: 18 }, RIVAL.stone, 'stone');
  for (const [x0, x1] of [[-44, -9], [9, 44]] as const) {
    const b: Box = { x0, x1, z0: 2, z1: 6, h0: 0, h1: 20 };
    block(d, rng, b, RIVAL.stone, 'stone');
    merlonRow(d, frontOf(b), 1, x1 - x0 - 1, 20, RIVAL.stone);
  }
  const g: Box = { x0: -9, x1: 9, z0: 0, z1: 7, h0: 0, h1: 24 };
  block(d, rng, g, RIVAL.stone, 'stone');
  const ga = frontOf(g);
  const hole = [ga(4, 0), ga(4, 10), ga(9, 15), ga(14, 10), ga(14, 0)];
  d.pen.fill(hole, mix(RIVAL.black, SHADOW, 0.3), 0.95);
  d.pen.stroke(hole, 0.6, d.ink, 0.9, false);
  merlonRow(d, ga, 0.5, 17.5, 24, RIVAL.stone, 3, 2.2);
  finial(d, tower(d, rng, -46, 4, 8, 30), 2.5);
  finial(d, tower(d, rng, 46, 4, 8, 30), 2.5);
}

/** The rival's castle in local units (origin at the bottom centre; it spans about x −60..76, y −120..10, more with a bigger `banner`). */
export function drawRivalCastle(ctx: CanvasRenderingContext2D, seed: number, wave = 0, banner = 1): void {
  sprite(ctx, seed, 0, { bounds: { x0: -64, y0: -60 - 68 * banner, x1: 20 + 64 * banner, y1: 14 }, line: 0.9, ground: (d) => groundShadow(d, 6, 4, 62, 7, 0.24) }, (d, rng) => draw(d, rng, wave, banner));
}

/** The rival's keep set into a landscape at `at`, scaled by `s`. */
export function rivalKeep(ctx: CanvasRenderingContext2D, seed: number, at: Pt, s: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(s, s);
  drawRivalCastle(ctx, seed, 0.6);
  ctx.restore();
}

/** A cottage: limewashed walls, a door and a window, under thatch or shingles. */
function cottage(d: Draw, rng: Rng, b: Box, along: 'x' | 'z', thatched: boolean): void {
  const wallC = '#a89878';
  block(d, rng, b, wallC, 'plaster', false);
  const at = frontOf(b);
  const w = b.x1 - b.x0;
  const door = [at(w * 0.3, 0), at(w * 0.3 + 3, 0), at(w * 0.3 + 3, 6), at(w * 0.3, 6)];
  d.pen.fill(door, '#5a3d26', 0.95);
  const win = [at(w * 0.62, 4), at(w * 0.62 + 3, 4), at(w * 0.62 + 3, 7), at(w * 0.62, 7)];
  d.pen.fill(win, HOLE, 0.85);
  gable(d, rng, b, along === 'x' ? 9 : 10, along, thatched ? THATCH : SHINGLE, thatched ? 'thatch' : 'shingle', wallC, 2);
}

/** A hamlet of three cottages by the road (origin at the bottom centre; spans about x −50..56, y −46..8). */
export function drawHamlet(ctx: CanvasRenderingContext2D, seed: number): void {
  sprite(ctx, seed, 0, { bounds: { x0: -56, y0: -56, x1: 64, y1: 12 }, line: 0.8, ground: (d) => groundShadow(d, 4, 2, 52, 6, 0.2) }, (d, rng) => {
    cottage(d, rng, { x0: -30, x1: -8, z0: 26, z1: 38, h0: 0, h1: 11 }, 'x', true);
    cottage(d, rng, { x0: 14, x1: 34, z0: 20, z1: 34, h0: 0, h1: 10 }, 'z', false);
    cottage(d, rng, { x0: -44, x1: -26, z0: 4, z1: 16, h0: 0, h1: 10 }, 'z', true);
    cottage(d, rng, { x0: 4, x1: 30, z0: 0, z1: 10, h0: 0, h1: 11 }, 'x', true);
  });
}
