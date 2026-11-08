import type { VineDef } from '../logic/level';
import { createRng } from '../logic/rng';
import { ART_RES, INK, MOSS, WOOD, WOOD_DARK } from './palette';
import { makeCanvas, Pen, type Pt } from './pen';
import { mix } from './wash';

/** How far the knot at a vine's top sits above its ledge (board px). */
const KNOT_ABOVE = 30;
/** Room round the strands and leaves, sideways and below (board px). */
const VINE_HALF_W = 26;
export const VINE_FOOT = 6;

/** A vine's picture: its size in board px and where its foot is in it (the image's origin). */
export interface VineFrame {
  readonly w: number;
  readonly h: number;
}

export function vineFrame(v: VineDef): VineFrame {
  return { w: VINE_HALF_W * 2, h: v.bottom - v.top + KNOT_ABOVE + VINE_FOOT + 6 };
}

/**
 * A vine Nib climbs: two thick strands twisted round each other from a knot
 * at the ledge down to the floor, with broad leaves, so it reads as a rope
 * to grab, not as decoration. Painted on its own, its foot at the bottom
 * middle, so the scene can show it growing (cropped from the top).
 */
export function paintVine(v: VineDef, seed: number): HTMLCanvasElement {
  const frame = vineFrame(v);
  const { canvas, ctx } = makeCanvas(Math.round(frame.w * ART_RES), Math.round(frame.h * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(VINE_HALF_W - v.x, frame.h - VINE_FOOT - v.bottom);
  const pen = new Pen(ctx, 7 + seed, 0.7);
  const rng = createRng(70 + seed);
  const top = v.top - KNOT_ABOVE;
  const len = v.bottom - top;
  const strand = (phase: number): Pt[] => {
    const pts: Pt[] = [];
    for (let y = 0; y <= len; y += 6) pts.push({ x: v.x + Math.sin(y / 22 + phase) * 4.5, y: top + y });
    return pts;
  };
  const dark = mix(MOSS, INK, 0.45);
  for (const phase of [0, Math.PI]) {
    const pts = strand(phase);
    pen.stroke(pts, 4.6, INK, 0.9, false);
    pen.stroke(pts, 3.2, phase ? dark : mix(MOSS, INK, 0.2), 1, false);
  }
  // Leaves in pairs down its length, bigger towards the bottom.
  for (let y = 14; y < len - 6; y += 20 + rng() * 10) {
    const side = rng() < 0.5 ? -1 : 1;
    const s = 6 + (y / len) * 4;
    const p = { x: v.x + Math.sin(y / 22) * 4.5, y: top + y };
    const leaf = [p, { x: p.x + side * s, y: p.y - s * 0.6 }, { x: p.x + side * s * 1.8, y: p.y + s * 0.2 }, { x: p.x + side * s * 0.8, y: p.y + s * 0.5 }];
    pen.fill(leaf, rng() < 0.5 ? MOSS : mix(MOSS, '#ffffff', 0.22), 1);
    pen.stroke([...leaf, leaf[0]!], 0.8, INK, 0.75, false);
    pen.hair([p, { x: p.x + side * s * 1.4, y: p.y }], 0.6, dark, 0.7);
  }
  // The knot where it's tied off at the top.
  ctx.fillStyle = mix(MOSS, INK, 0.3);
  ctx.beginPath();
  ctx.arc(v.x, top, 5.5, 0, Math.PI * 2);
  ctx.fill();
  pen.circle(v.x, top, 5.5, 1.2, INK);
  return canvas;
}

/** A seed's picture: a fat seed in a crack in the floor, a curl of sprout on top and roots below. Its foot at the middle bottom. */
export const SEED_FRAME = { w: 40, h: 36 } as const;

export function paintSeed(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(SEED_FRAME.w * ART_RES, SEED_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(SEED_FRAME.w / 2, SEED_FRAME.h - 4);
  const pen = new Pen(ctx, 91, 0.4);
  // Roots spreading over the floor.
  for (const dir of [-1, 1]) pen.stroke([{ x: 0, y: 0 }, { x: dir * 7, y: 2 }, { x: dir * 14, y: 1 }, { x: dir * 17, y: 3 }], 1.4, mix(WOOD_DARK, INK, 0.3), 0.9, false);
  // The seed: a fat teardrop, lit on one side, with a seam.
  const seed: Pt[] = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r = 9 * (1 - 0.25 * Math.sin(a));
    seed.push({ x: Math.cos(a) * r * 0.8, y: -10 + Math.sin(a) * r });
  }
  const g = ctx.createLinearGradient(-8, -20, 8, 0);
  g.addColorStop(0, mix(WOOD, '#ffffff', 0.3));
  g.addColorStop(1, WOOD_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  seed.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.hair([{ x: 0, y: -18 }, { x: 1.5, y: -10 }, { x: 0, y: -2 }], 0.8, WOOD_DARK, 0.8);
  pen.stroke([...seed, seed[0]!], 1.2, INK, 0.9, false);
  // The sprout: a green curl and one small leaf.
  pen.stroke([{ x: 0, y: -18 }, { x: 1, y: -24 }, { x: 5, y: -27 }, { x: 7, y: -24 }], 2, mix(MOSS, INK, 0.25), 1, false);
  const leaf: Pt[] = [{ x: 1, y: -23 }, { x: -5, y: -28 }, { x: -9, y: -25 }, { x: -4, y: -22 }];
  pen.fill(leaf, MOSS, 1);
  pen.stroke([...leaf, leaf[0]!], 0.7, INK, 0.8, false);
  return canvas;
}
