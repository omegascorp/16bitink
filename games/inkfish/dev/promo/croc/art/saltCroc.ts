import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline as baseSpline } from '../../kraken/whale';
import { type Placed } from '../../seal/story';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, contour, curve as baseCurve, edgeAt, frames, lazily, mix, path, px, screenScale, shade, smoothLoop as baseLoop,
  softLine, step01, type Stops, taper,
} from '../../seal/art/paint';

/**
 * The saltwater crocodile (Crocodylus porosus), side view, painted in the manner
 * of the great white (../../foodchain/art/greatWhite.ts): a broad heavy head with
 * a pale yellowish jaw, a gold eye with a vertical pupil under a heavy brow, big
 * raised nostrils, keeled scutes in rows along the back and a serrated crest down
 * the tail, dark bands on the tail, olive-grey above breaking to a cream belly.
 * Washes are laid column by column, with soft light and shade and thin interior ink.
 *
 * Parts are sprites baked once per line-boil frame at a few sizes: the body (the
 * tail drawn in thin columns so it can bend and sway) and the lower jaw (turned
 * on its hinge to open the mouth). The eye (lid), the nostril and the mouth's
 * inside are live. Own units, as the short places animals: 310 long, the middle
 * at 0,0, nose to the right (+x), belly down (+y).
 */

export interface CrocLook {
  /** The jaw's opening, 0 shut .. 1 wide. */
  readonly gape?: number;
  /** How far the rear body bends: positive down, negative up, about -0.25 .. 0.25. */
  readonly bend?: number;
  /** The eyelid: 0 wide open, 0.5 a sly half-lid, 1 shut. */
  readonly lid?: number;
  /** The eye widens a little (surprise, menace), 0 .. 1. */
  readonly glare?: number;
  /** Draws just the lower jaw and the inside of the mouth ('jaw') or everything else ('rest'), so a catch can sit between them. */
  readonly part?: 'jaw' | 'rest';
}

// ---------------------------------------------------------------- shape

/** The drawing is laid out long and slim, then deepened: a crocodile is heavy through the body and head. */
const DEEP = 1.5;
const T = (p: Pt): Pt => ({ x: p.x, y: p.y * DEEP });
const spline = (pts: readonly Pt[], n?: number): Pt[] => baseSpline(pts.map(T), n);
const shortLimb = (p: Pt): Pt => ({ x: p.x, y: p.y > 28 ? 28 + (p.y - 28) * 0.5 : p.y });
const smoothLoop = (pts: readonly Pt[], n?: number): Pt[] => baseLoop(pts.map(shortLimb), n);
const curve = (a: Pt, c: Pt, b: Pt, n?: number): Pt[] => baseCurve(T(a), T(c), T(b), n);

const BACK: readonly Pt[] = spline([
  { x: 159, y: -1 }, { x: 158, y: -6.5 }, { x: 152, y: -10.5 }, { x: 146, y: -12.6 }, { x: 140, y: -11.4 }, { x: 128, y: -12.6 }, { x: 113, y: -15.5 },
  { x: 101, y: -18.5 }, { x: 92, y: -21 }, { x: 85, y: -22 }, { x: 77, y: -19.5 }, { x: 68, y: -16.5 }, { x: 56, y: -15.4 }, { x: 42, y: -17.4 },
  { x: 26, y: -19.4 }, { x: 8, y: -20 }, { x: -12, y: -19.2 }, { x: -32, y: -17.6 }, { x: -52, y: -15.2 }, { x: -72, y: -12.6 }, { x: -92, y: -10 },
  { x: -112, y: -7.6 }, { x: -132, y: -5 }, { x: -148, y: -3 }, { x: -160, y: -1.2 }, { x: -168, y: 0 },
], 5);
const MOUTHLINE: readonly Pt[] = spline([
  { x: 159, y: 0.8 }, { x: 148, y: 2 }, { x: 134, y: 3 }, { x: 118, y: 3.9 }, { x: 104, y: 4.8 }, { x: 93, y: 5.8 }, { x: 84, y: 6.8 },
], 5);
const BELLY: readonly Pt[] = [
  ...MOUTHLINE,
  ...spline([
    { x: 84, y: 6.8 }, { x: 78, y: 9.4 }, { x: 66, y: 12.4 }, { x: 52, y: 15 }, { x: 36, y: 16.6 }, { x: 18, y: 17.2 }, { x: 0, y: 17 }, { x: -20, y: 15.4 },
    { x: -40, y: 13 }, { x: -60, y: 10.6 }, { x: -80, y: 8.2 }, { x: -100, y: 6 }, { x: -120, y: 4 }, { x: -140, y: 2.2 }, { x: -158, y: 0.8 }, { x: -168, y: 0 },
  ], 5).slice(1),
];
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);
const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, bottomAt, v, x0, x1, step);
const BODY: readonly Pt[] = [...BACK, ...[...BELLY].reverse().slice(1)];

/** The lower jaw, closed: its top edge is the mouth line, hinged at the corner of the mouth. */
export const HINGE: Pt = T({ x: 83, y: 7 });
const JAW_TOP: readonly Pt[] = MOUTHLINE.map((p) => ({ x: p.x, y: p.y + 0.7 }));
const JAW: readonly Pt[] = [
  ...JAW_TOP,
  ...spline([{ x: 84, y: 7.3 }, { x: 84, y: 11.5 }, { x: 96, y: 12.6 }, { x: 110, y: 12.4 }, { x: 126, y: 10.8 }, { x: 142, y: 8.4 }, { x: 153, y: 5.4 }, { x: 159, y: 2 }, { x: 159, y: 0.8 }], 4),
].filter((p, i, a) => i === 0 || p.x !== a[i - 1]!.x || p.y !== a[i - 1]!.y);

/** Near legs: the shoulder and the hip, sprawled with the feet spread. */
const FORELEG: readonly Pt[] = smoothLoop([
  { x: 26, y: 14 }, { x: 54, y: 14 }, { x: 58, y: 27 }, { x: 63, y: 36 }, { x: 68, y: 43 }, { x: 80, y: 47 }, { x: 88, y: 52 }, { x: 87, y: 56 }, { x: 80, y: 55 },
  { x: 82, y: 60 }, { x: 78, y: 63 }, { x: 72, y: 59 }, { x: 69, y: 63 }, { x: 63, y: 61 }, { x: 61, y: 54 }, { x: 52, y: 46 }, { x: 44, y: 38 }, { x: 38, y: 28 }, { x: 28, y: 24 },
], 4);
const HINDLEG: readonly Pt[] = smoothLoop([
  { x: -68, y: 10 }, { x: -26, y: 12 }, { x: -22, y: 26 }, { x: -14, y: 37 }, { x: -6, y: 45 }, { x: 6, y: 50 }, { x: 14, y: 55 }, { x: 12, y: 59 }, { x: 5, y: 57 },
  { x: 7, y: 63 }, { x: 2, y: 66 }, { x: -4, y: 61 }, { x: -9, y: 65 }, { x: -15, y: 62 }, { x: -18, y: 54 }, { x: -30, y: 46 }, { x: -42, y: 40 }, { x: -54, y: 31 }, { x: -66, y: 25 },
], 4);
/** Claw tips of each foot. */
const FORE_CLAWS: readonly Pt[] = ([{ x: 88, y: 58 }, { x: 82, y: 64 }, { x: 74, y: 66 }, { x: 65, y: 64 }] as Pt[]).map(shortLimb);
const HIND_CLAWS: readonly Pt[] = ([{ x: 14, y: 61 }, { x: 8, y: 68 }, { x: 0, y: 69 }, { x: -11, y: 67 }] as Pt[]).map(shortLimb);

export const EYE: Pt = T({ x: 86, y: -15.4 });
const EYE_R = 4.2;
const NOSTRIL: Pt = T({ x: 148.5, y: -10.2 });
/** Where the jaws close on a prey held across them: the middle of the snout, on the mouth line. */
export const CROC_MOUTH: Pt = { x: 124, y: 11 };

// ---------------------------------------------------------------- ink

const DARK = '#14160c';
const OLIVE_DARK = '#272a18';
const SHEEN = '#c9cf9a';

/** Colours down the body at x: dark olive back, olive flank, a pale yellow lip, cream belly; the head and jaw paler. */
function skinStops(x: number): Stops {
  const head = step01(x, 62, 104);
  return [
    [0, '#0e100a'], [0.14, mix('#1a1d11', '#262a17', head)], [0.34, mix('#2f331d', '#40441f', head)], [0.52, mix('#50552c', '#6a6a35', head)],
    [0.7, mix('#7a7740', '#9a8f4a', head)], [0.8, mix('#b3a763', '#cbbd7c', head)], [0.9, '#e0d6a6'], [1, mix('#c9bd8a', '#d6cb9a', head)],
  ];
}

// ---------------------------------------------------------------- painting

function plate(cx: number, cy: number, w: number, h: number): Pt[] {
  return smoothLoop([{ x: cx - w, y: cy + h * 0.2 }, { x: cx - w * 0.6, y: cy - h }, { x: cx + w * 0.6, y: cy - h }, { x: cx + w, y: cy + h * 0.2 }, { x: cx + w * 0.5, y: cy + h }, { x: cx - w * 0.5, y: cy + h }], 2);
}

/** Raised, keeled scutes in rows along the back: each a domed plate with a ridge down it, lit from above, shaded below. */
function paintScutes(k: Brush): void {
  const { pen, ctx } = k;
  for (const [v, off, size] of [[0.1, 0, 1], [0.27, 4.2, 0.92], [0.43, 0, 0.7]] as const) {
    for (let x = 72 - off; x > -150; x -= 8.4) {
      const tk = (0.5 + 0.5 * Math.min(1, (x + 160) / 200)) * size;
      const y = topAt(x) + (bottomAt(x) - topAt(x)) * v;
      const w = 4.4 * tk;
      const h = 4.6 * tk;
      const shape = plate(x, y + 1.6, w, h);
      pen.fill(shape, '#22251a', 1);
      pen.clipped(shape, () => {
        const g = ctx.createLinearGradient(0, y - h, 0, y + h * 1.6);
        g.addColorStop(0, 'rgba(176,180,120,0.62)');
        g.addColorStop(0.45, 'rgba(70,76,44,0.3)');
        g.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = g;
        ctx.fillRect(x - w - 1, y - h - 2, 2 * w + 2, 3 * h + 4);
        ctx.fillStyle = 'rgba(20,22,12,0.5)';
        ctx.fillRect(x + w * 0.1, y - h, w, 3 * h);
        ctx.fillStyle = 'rgba(200,204,140,0.4)';
        ctx.fillRect(x - w * 0.35, y - h, w * 0.3, 2.4 * h);
      });
      pen.hair([{ x, y: y - h * 0.9 }, { x, y: y + h * 1.4 }], px(k, 0.8), '#0c0e08', 0.7);
      pen.stroke(shape, px(k, 0.6), INK, 0.55, true);
    }
  }
  // Flank scales: rows of small plates fading down the side.
  pen.clipped(BODY, () => {
    for (const v of [0.56, 0.66, 0.76]) {
      for (let x = 60; x > -140; x -= 6 + pen.rng() * 2) {
        const y = topAt(x) + (bottomAt(x) - topAt(x)) * v;
        const s2 = 0.5 + 0.5 * Math.min(1, (x + 160) / 200);
        pen.hair([{ x: x - 2 * s2, y: y + 0.4 }, { x, y: y + 1.2 }, { x: x + 2 * s2, y: y + 0.4 }], px(k, 0.7), '#14160b', 0.22);
      }
    }
  });
}

/** The serrated crest along the top of the tail, tall near the hips, low at the tip. */
function paintCrest(k: Brush): void {
  const { pen } = k;
  for (const [row, dx, scale, colour] of [[0, 3.4, 0.8, '#1b1d12'], [1, 0, 1, '#2a2d1a']] as const) {
    for (let x = 62 + dx; x > -156; x -= 6.4) {
      if (row === 0 && x > -4) continue;
      const taperK = 0.5 + 0.5 * Math.min(1, (x + 160) / 190);
      const t = topAt(x);
      const h = (4.8 * taperK + (x < 0 ? 1.4 : 0)) * scale;
      const tri = [{ x: x + 3.2, y: t + 1.2 }, { x: x - 0.8, y: t - h }, { x: x - 3.2, y: t + 1.2 }];
      pen.fill(tri, colour, 1);
      pen.stroke(tri, px(k, 0.7), INK, 0.7, false);
      pen.hair([{ x: x - 0.4, y: t - h + 0.8 }, { x: x + 1.4, y: t + 0.2 }], px(k, 0.6), SHEEN, 0.35);
    }
  }
}

function paintLeg(k: Brush, shape: readonly Pt[], top: number, claws: readonly Pt[]): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    shade(ctx, shape, top, top + 52, [[0, '#4a4f2c'], [0.55, '#33371d'], [1, '#1a1c0f']]);
    for (let i = 0; i < 9; i++) pen.hair([{ x: shape[0]!.x + 2 + i * 4, y: top + 4 + pen.rng() * 5 }, { x: shape[0]!.x + 5 + i * 4, y: top + 26 }], px(k, 0.7), DARK, 0.2);
    softLine(ctx, shape.slice(0, Math.floor(shape.length / 3)), 3, '#c3c88c', 0.25);
  });
  pen.stroke(shape.slice(6, shape.length - 6), px(k, 1.1), INK, 1, false);
  for (const c of claws) {
    pen.stroke([{ x: c.x - 1.4, y: c.y - 3.4 }, { x: c.x + 0.4, y: c.y + 1.8 }, { x: c.x + 1.2, y: c.y - 3 }], px(k, 0.8), INK, 0.8, false);
    pen.fill([{ x: c.x - 1.4, y: c.y - 3.4 }, { x: c.x + 0.4, y: c.y + 1.8 }, { x: c.x + 1.2, y: c.y - 3 }], '#d9d2b4', 0.95);
  }
}

function paintSkin(k: Brush): void {
  const { pen, ctx } = k;
  ctx.save();
  ctx.translate(px(k, 1.1), px(k, 1.3));
  columnWash(ctx, -168, 160, 1, topAt, bottomAt, skinStops, 40);
  ctx.restore();
  // Light from above along the back and the brow, broken; the flank glowing just under the dark.
  softLine(ctx, along(0.12, 70, -150), 6, '#b4bb7c', 0.22);
  softLine(ctx, along(0.16, 152, 92, 3), 5, '#d3d79a', 0.22);
  softLine(ctx, along(0.58, 70, -150), 9, '#1c200f', 0.12);
  // The tail's dark bands.
  for (let x = -40; x > -166; x -= 21) {
    const band = [{ x, y: -30 }, { x: x - 10, y: -30 }, { x: x - 13, y: 30 }, { x: x - 3, y: 30 }];
    pen.fill(band, '#0c0d06', 0.15);
  }
  // Blotches and a fine grain on the skin; lighter flecks on the pale jaw.
  pen.stipple(BODY, 1500, (x, y) => 0.55 * Math.max(0, 1 - (y - topAt(x)) / 22), px(k, 0.8), 'rgba(18,20,10,0.55)');
  pen.stipple(BODY, 900, (x, y) => 0.4 * (x > 80 ? 1 : 0.4) * Math.max(0, 1 - Math.abs(y - (topAt(x) + 6)) / 12), px(k, 0.7), 'rgba(224,226,170,0.55)');
  for (let r = 1; r <= 3; r++) pen.hair(along(1 - r * 0.045, 80, -120, 5), px(k, 0.7), '#8c8258', 0.18 - r * 0.03);
  // Lines across the throat plates.
  for (let x = 78; x > 30; x -= 6) pen.hair([{ x, y: bottomAt(x) - 3 }, { x: x - 2, y: bottomAt(x) + 0.4 }], px(k, 0.7), '#8c8258', 0.4);
}

/** The brow ridge over the eye and the bumps of the snout: shade and light. */
function paintHead(k: Brush): void {
  const { pen, ctx } = k;
  // The heavy brow over the eye.
  const brow = curve({ x: EYE.x - 8, y: EYE.y - 1.5 }, { x: EYE.x + 0.5, y: EYE.y - 6.4 }, { x: EYE.x + 8, y: EYE.y - 1.2 }, 8);
  softLine(ctx, brow, 4, '#14170a', 0.45);
  taper(ctx, brow.map((p) => ({ x: p.x, y: p.y - 1.1 })), 2.4, 0.6, '#c7cd94', 0.4);
  taper(ctx, brow, 1.4, 0.5, INK, 0.55);
  // The ridge running up the snout from the eye to the nostril bump, and the lip's scallop.
  pen.hair(spline([{ x: 80, y: -9 }, { x: 108, y: -5 }, { x: 134, y: -4 }, { x: 150, y: -5 }], 5), px(k, 0.9), DARK, 0.3);
  for (let x = 150; x > 92; x -= 7.5) {
    const y = edgeAt(MOUTHLINE, x) - 4.5;
    pen.hair([{ x: x + 1.5, y: y - 1 }, { x, y }, { x: x - 1.5, y: y - 1 }], px(k, 0.7), DARK, 0.28);
  }
  // The bumpy ridges in front of the eyes, running down the snout: a row of raised knobs, lit on top.
  for (const side of [0, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = 80 - 0 + i * 6.6;
      const y = topAt(x) + 5.5 + side * 6 + 0.35 * i;
      const r = (2.2 - 0.14 * i) * (side ? 0.8 : 1);
      pen.fill(smoothLoop([{ x: x - r, y: y + r * 0.5 }, { x: x - r * 0.6, y: y - r }, { x: x + r * 0.6, y: y - r }, { x: x + r, y: y + r * 0.5 }], 2), '#2c3019', 0.9);
      pen.hair([{ x: x - r * 0.6, y: y - r * 0.9 }, { x: x + r * 0.5, y: y - r * 0.9 }], px(k, 0.8), '#b8be82', 0.5);
      pen.hair([{ x: x - r, y: y + r * 0.6 }, { x: x + r, y: y + r * 0.6 }], px(k, 0.7), '#080904', 0.4);
    }
  }
  // Pores dotted on the snout.
  for (let i = 0; i < 26; i++) {
    const x = 96 + pen.rng() * 58;
    pen.dot(x, topAt(x) + 3 + pen.rng() * 7, px(k, 0.8), DARK, 0.45);
  }
  // The nostril bump, lit on top.
  pen.stroke(spline([{ x: 141, y: -8.4 }, { x: 146, y: -11.4 }, { x: 152, y: -9.2 }], 4), px(k, 1), '#d4d89e', 0.4, false);
}

/** Upper teeth: pale pegs along the mouth line, big ones at the front and in the middle. */
function paintUpperTeeth(k: Brush): void {
  const { pen, ctx } = k;
  for (let x = 156; x > 86; x -= 5.2) {
    const y = edgeAt(MOUTHLINE, x);
    const n = Math.round(x / 5.2);
    const big = x > 142 || n % 3 === 0;
    const len = (big ? 8.5 : n % 2 ? 3.4 : 5.2) + pen.rng() * 1.2;
    const tooth = [{ x: x + 1.9, y: y - 0.4 }, { x: x - 0.2, y: y + len }, { x: x - 2, y: y - 0.4 }];
    ctx.save();
    path(ctx, tooth);
    ctx.fillStyle = '#f2ecd2';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(80,60,30,0.35)';
    ctx.fillRect(x - 0.2, y + len * 0.3, 3.2, len);
    ctx.restore();
    pen.stroke(tooth, px(k, 0.7), INK, 0.55, false);
  }
}

function paintBody(k: Brush): void {
  const { pen } = k;
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintSkin(k);
    paintScutes(k);
    paintHead(k);
  });
  paintCrest(k);
  paintLeg(k, HINDLEG, 12, HIND_CLAWS);
  paintLeg(k, FORELEG, 16, FORE_CLAWS);
  paintUpperTeeth(k);
  pen.stroke(BACK.filter((p) => p.x > -158), px(k, 1.2), INK, 0.95, true);
  pen.stroke(BELLY.filter((p) => p.x < 82 && p.x > -150), px(k, 1.3), INK, 0.95, true);
  pen.stroke(BELLY.filter((p) => p.x >= 82), px(k, 1.3), INK, 0.95, true);
  pen.stroke(spline([{ x: -150, y: -2.5 }, { x: -158, y: -0.4 }, { x: -168, y: 0 }], 3), px(k, 1.6), INK, 1, false);
  // The mouth line: firm, turned up at the corner.
  pen.stroke(MOUTHLINE, px(k, 1.5), INK, 1, true);
  taper(k.ctx, curve({ x: 84, y: 6.8 }, { x: 80, y: 6.4 }, { x: 77.4, y: 3.4 }, 5), 2.4, 0.6, INK, 0.85);
}

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(JAW, PAPER_FILL, 1);
  pen.clipped(JAW, () => {
    shade(ctx, JAW, 0, 18, [[0, '#d9cd92'], [0.5, '#e5dcaf'], [1, '#bfb384']]);
    softLine(ctx, contour((x) => edgeAt(JAW_TOP, x), (x) => 17 + (x - 100) * 0.04, 0.12, 156, 88, 4), 3, '#8f7f48', 0.25);
    for (let x = 150; x > 90; x -= 6) pen.hair([{ x, y: 8.6 + (x - 150) * 0.09 }, { x: x - 1.2, y: 14 + (x - 150) * 0.03 }], px(k, 0.7), '#7e6e3e', 0.35);
    pen.stipple(JAW, 360, () => 0.5, px(k, 0.7), 'rgba(90,76,40,0.5)');
  });
  // Lower teeth, pointing up between the upper ones.
  for (let x = 153; x > 90; x -= 5.2) {
    const y = edgeAt(JAW_TOP, x) + 0.2;
    const len = (Math.round(x / 5.2) % 3 === 1 ? 6.4 : 3.2) + pen.rng() * 0.9;
    const tooth = [{ x: x + 1.3, y: y + 0.3 }, { x: x - 0.2, y: y - len }, { x: x - 1.4, y: y + 0.3 }];
    path(ctx, tooth);
    ctx.fillStyle = '#efe8cc';
    ctx.fill();
    pen.stroke(tooth, px(k, 0.6), INK, 0.5, false);
  }
  pen.stroke(JAW.slice(JAW_TOP.length - 1), px(k, 1.3), INK, 0.95, true);
  pen.stroke(JAW_TOP, px(k, 1.6), INK, 0.9, true);
}

// ---------------------------------------------------------------- sprites

const BODY_BOX: Box = { x0: -176, x1: 164, y0: -42, y1: 64 };
const JAW_BOX: Box = { x0: 76, x1: 164, y0: -4, y1: 26 };

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
}

const SEED = 5309;
const spritesFor = lazily((b: Bucket): Sprites => ({ res: b.res, body: frames(BODY_BOX, b, SEED, paintBody), jaw: frames(JAW_BOX, b, SEED + 11, paintJaw) }));

// ---------------------------------------------------------------- on screen

const BEND_FROM = 66;
const WAG_FROM = 30;
const WAG_TO = -168;
const WAG = 9;

function bentAt(x: number, bend: number, beat: number): number {
  const b = Math.max(0, Math.min(1, (x - WAG_FROM) / (WAG_TO - WAG_FROM)));
  return (bend * Math.max(0, BEND_FROM - x) ** 2) / 200 + WAG * b * b * Math.sin(beat - 2.6 * b);
}

/** The body: the head as it is, the rest in thin columns, each moved onto the bent midline and turned with it. */
function drawBent(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, scale: number, bend: number, beat: number): void {
  const box = BODY_BOX;
  const k = 1 / res;
  const split = Math.round((BEND_FROM - box.x0) * res);
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = Math.max(2, Math.round((2.5 * res) / scale));
  const overlap = 0.7 / scale;
  for (let sx = 0; sx < split; sx += step) {
    const w = Math.min(step, split - sx);
    const x = box.x0 + (sx + w / 2) * k;
    const dy = bentAt(x, bend, beat);
    const slope = bentAt(x + 0.5, bend, beat) - bentAt(x - 0.5, bend, beat);
    ctx.save();
    ctx.translate(x, dy);
    ctx.rotate(Math.atan(slope));
    ctx.drawImage(c, sx, 0, w, c.height, -(w * k) / 2 - overlap, box.y0, w * k + 2 * overlap, c.height * k);
    ctx.restore();
  }
}

/** The jaw turned `angle` on the hinge: the inside of the mouth is a dark rose wedge behind it. */
function drawJawAndInside(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, angle: number): void {
  if (angle > 0.02) {
    const [cs, sn] = [Math.cos(angle), Math.sin(angle)];
    const turned = JAW_TOP.map((p) => ({ x: HINGE.x + (p.x - HINGE.x) * cs - (p.y - HINGE.y) * sn, y: HINGE.y + (p.x - HINGE.x) * sn + (p.y - HINGE.y) * cs }));
    const inside = [...MOUTHLINE, ...[...turned].reverse()];
    ctx.save();
    path(ctx, inside);
    const g = ctx.createLinearGradient(HINGE.x, 0, 160, 0);
    g.addColorStop(0, 'rgba(66,22,28,1)');
    g.addColorStop(0.5, 'rgba(118,42,48,0.96)');
    g.addColorStop(0.82, 'rgba(142,58,62,0.5)');
    g.addColorStop(1, 'rgba(142,58,62,0)');
    ctx.fillStyle = g;
    ctx.fill();
    // The throat, dark at the back, and the tongue's pale gleam.
    ctx.clip();
    const back = ctx.createRadialGradient(HINGE.x - 2, HINGE.y + 2, 1, HINGE.x - 2, HINGE.y + 2, 40);
    back.addColorStop(0, 'rgba(10,2,4,0.85)');
    back.addColorStop(1, 'rgba(10,2,4,0)');
    ctx.fillStyle = back;
    ctx.fillRect(HINGE.x - 50, HINGE.y - 40, 100, 90);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(angle);
  ctx.translate(-HINGE.x, -HINGE.y);
  blit(ctx, c, JAW_BOX, res);
  ctx.restore();
}

/** The eye, live: gold with a vertical slit and a catchlight, under a heavy lid that closes from the top. */
function drawEye(ctx: CanvasRenderingContext2D, lid: number, glare: number, lw: number): void {
  const { x, y } = EYE;
  const r = EYE_R * (1 + 0.16 * glare);
  const socket = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.2);
  socket.addColorStop(0, 'rgba(10,12,4,0.6)');
  socket.addColorStop(1, 'rgba(10,12,4,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.12, r, 0, 0, Math.PI * 2);
  ctx.clip();
  const iris = ctx.createRadialGradient(x - r * 0.1, y + r * 0.2, r * 0.1, x, y, r * 1.1);
  iris.addColorStop(0, '#f1c63c');
  iris.addColorStop(0.55, '#c8921a');
  iris.addColorStop(1, '#5a3a0a');
  ctx.fillStyle = iris;
  ctx.fillRect(x - r * 1.4, y - r * 1.2, r * 2.8, r * 2.4);
  // The vertical pupil.
  ctx.fillStyle = '#05060a';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y, r * (0.2 + 0.05 * glare), r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fine streaks in the iris.
  ctx.strokeStyle = 'rgba(60,34,4,0.35)';
  ctx.lineWidth = 0.5 * lw;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.5);
    ctx.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.0);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.42, y - r * 0.4, r * 0.24, r * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(x - r * 0.45, y + r * 0.42, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // The lid: skin drawn down over the top of the eye.
  const cover = Math.max(0, Math.min(1, lid)) * 2 * r;
  if (cover > 0.05) {
    ctx.fillStyle = '#3d4226';
    ctx.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 1.4 + cover - r);
    ctx.fillStyle = 'rgba(8,8,4,0.55)';
    ctx.fillRect(x - r * 1.4, y - r + cover - 0.5 * lw, r * 2.8, 1.2 * lw);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.12, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The lower teeth, live, over whatever is held in the jaws: pale pegs on the turned jaw's edge, uneven, some long. */
function drawGripTeeth(ctx: CanvasRenderingContext2D, angle: number, lw: number): void {
  const [cs, sn] = [Math.cos(angle), Math.sin(angle)];
  ctx.save();
  ctx.fillStyle = '#efe8cc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7 * lw;
  for (let x = 152; x > 92; x -= 5.2) {
    const n = Math.round(x / 5.2);
    const len = n % 3 === 1 ? 7 : 3.6;
    const p = edgeAt(JAW_TOP, x);
    const [dx, dy] = [x - HINGE.x, p - HINGE.y];
    const base = { x: HINGE.x + dx * cs - dy * sn, y: HINGE.y + dx * sn + dy * cs };
    ctx.beginPath();
    ctx.moveTo(base.x + 1.8 * cs, base.y + 1.8 * sn);
    ctx.lineTo(base.x + len * sn, base.y - len * cs);
    ctx.lineTo(base.x - 1.8 * cs, base.y - 1.8 * sn);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** The raised nostril: a dark slit in a bump, wet along its rim. */
function drawNostril(ctx: CanvasRenderingContext2D, lw: number): void {
  const { x, y } = NOSTRIL;
  ctx.save();
  ctx.fillStyle = '#0a0a06';
  ctx.beginPath();
  ctx.ellipse(x, y, 2.5, 1.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9 * lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - 1, y - 1.2, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The crocodile, nose right in its own units, placed, turned and mirrored by `p` (its tail swaying with `p.beat`). */
export function drawSaltCroc(ctx: CanvasRenderingContext2D, p: Placed, look: CrocLook, boil: number): void {
  const k = p.len / 310;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const b = bucketFor(scale);
  const s = spritesFor(b);
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const lw = 1 / scale;
  if (look.part !== 'rest') drawJawAndInside(ctx, s.jaw[f]!, s.res, 0.62 * Math.max(0, Math.min(1, look.gape ?? 0)));
  if (look.part !== 'jaw') {
    drawBent(ctx, s.body[f]!, s.res, scale, look.bend ?? 0, p.beat);
    drawGripTeeth(ctx, 0.62 * Math.max(0, Math.min(1, look.gape ?? 0)), lw);
    drawNostril(ctx, lw);
    drawEye(ctx, look.lid ?? 0, look.glare ?? 0, lw);
  }
  ctx.restore();
}

/** Bakes the size the short opens on. */
export function prepareCroc(): void {
  spritesFor(bucketFor(3.2));
}
