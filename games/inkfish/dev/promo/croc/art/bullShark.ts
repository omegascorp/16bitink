import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline as baseSpline } from '../../kraken/whale';
import { type Placed, UNITS } from '../../seal/story';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, contour, curve, edgeAt, frames, lazily, path, px, screenScale, shade, smoothLoop as baseLoop,
  softLine, type Stops, taper,
} from '../../seal/art/paint';

/** The bull shark's build: the blue shark's drawing, reshaped (a blunt, short snout, a deep stocky body) and recoloured grey over white. */
const DEEP = 1.42;
const SNOUT_FROM = 108;
const SNOUT_K = 0.7;
const T = (p: Pt): Pt => ({ x: p.x > SNOUT_FROM ? SNOUT_FROM + (p.x - SNOUT_FROM) * SNOUT_K : p.x, y: p.y * DEEP });
const spline = (pts: readonly Pt[], n?: number): Pt[] => baseSpline(pts.map(T), n);
const smoothLoop = (pts: readonly Pt[], n?: number): Pt[] => baseLoop(pts.map(T), n);

/**
 * The bull shark (Carcharhinus leucas), after the blue shark, painted in the manner of the great white
 * (../../foodchain/art/greatWhite.ts): very slender and long, a long pointed
 * snout, a big round eye, five short gill slits, very long narrow sickle
 * pectorals, the first dorsal set well back, a small second dorsal over the
 * anal fin and a crescent tail with a long upper lobe. Deep indigo along the
 * back, bright cobalt down the flanks, broken off along a sharp but soft line
 * to a white belly; the light from above along the back.
 *
 * Parts are sprites baked once per line-boil frame at a few sizes: the body
 * with its tail and the fins on its midline (drawn in thin columns, each moved
 * and turned, so it can bend and beat its tail), and the two pectorals,
 * turned at their roots. The eye and mouth are live: fear widens the eye,
 * lifts the lid and flares the fins. A dark set paints the shark as a deep
 * shadow sinking away.
 *
 * Own units, as the short places animals: 310 long, the middle at 0,0, nose
 * to the right (+x), belly down (+y).
 */

export interface SharkLook {
  /** 0: bright blue and white; 1: a dark shape. */
  readonly dark?: number;
  /** How far the rear body bends (a struggle): positive down, negative up, about -0.25 .. 0.25. */
  readonly bend?: number;
  /** Scared: a wide eye, the lid up, the fins flared, 0 .. 1. */
  readonly fear?: number;
}

// ---------------------------------------------------------------- shape

const BACK: readonly Pt[] = spline([
  { x: 160, y: 2 }, { x: 157, y: -2 }, { x: 150, y: -6 }, { x: 138, y: -10 }, { x: 122, y: -13.5 }, { x: 102, y: -17 }, { x: 80, y: -20 },
  { x: 56, y: -22 }, { x: 32, y: -22.5 }, { x: 8, y: -22 }, { x: -16, y: -20.5 }, { x: -40, y: -17.5 }, { x: -62, y: -13 }, { x: -80, y: -9 },
  { x: -92, y: -6.5 }, { x: -104, y: -4.5 }, { x: -116, y: -2 }, { x: -122, y: 0 },
], 5);
const BELLY: readonly Pt[] = spline([
  { x: 160, y: 2 }, { x: 158, y: 5 }, { x: 152, y: 7.5 }, { x: 142, y: 9.5 }, { x: 128, y: 11.5 }, { x: 110, y: 13.5 }, { x: 88, y: 16.5 },
  { x: 64, y: 19 }, { x: 40, y: 20.5 }, { x: 16, y: 21 }, { x: -8, y: 20 }, { x: -32, y: 17.5 }, { x: -54, y: 13.5 }, { x: -72, y: 9.5 },
  { x: -86, y: 6.5 }, { x: -100, y: 4.5 }, { x: -112, y: 2 }, { x: -122, y: 0 },
], 5);
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);
const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, bottomAt, v, x0, x1, step);

/** The first dorsal, set well back: a convex leading edge, a rounded tip, a concave trailing edge to a free rear tip. */
const DORSAL: readonly Pt[] = spline([
  { x: -4, y: -21.8 }, { x: -10, y: -27 }, { x: -17, y: -34.5 }, { x: -24, y: -41 }, { x: -30, y: -44.5 }, { x: -34, y: -44 },
  { x: -35.5, y: -39 }, { x: -36.5, y: -31 }, { x: -39.5, y: -24 }, { x: -45, y: -19.6 },
], 5);
const SECOND_DORSAL: readonly Pt[] = spline([
  { x: -72, y: -11.2 }, { x: -75.5, y: -15.5 }, { x: -80, y: -18 }, { x: -83, y: -17.5 }, { x: -84, y: -14 }, { x: -86.5, y: -10 }, { x: -90, y: -7.6 },
], 4);
const TOPLINE: readonly Pt[] = [
  ...BACK.filter((p) => p.x > -4), ...DORSAL, ...BACK.filter((p) => p.x < -46 && p.x > -72), ...SECOND_DORSAL, ...BACK.filter((p) => p.x < -90),
];
const BODY: readonly Pt[] = [...TOPLINE, ...[...BELLY].reverse().slice(1, -1)];

/** The crescent tail: a long upper lobe with a small notched tip, a shorter lower lobe. */
const CAUDAL: readonly Pt[] = spline([
  { x: -92, y: -6 }, { x: -108, y: -10.5 }, { x: -124, y: -17.5 }, { x: -140, y: -26 }, { x: -154, y: -35 }, { x: -165, y: -42.5 },
  { x: -172, y: -47.5 }, { x: -170, y: -43.5 }, { x: -164.5, y: -39.5 }, { x: -161, y: -36 }, { x: -158, y: -30 }, { x: -152, y: -22 },
  { x: -146, y: -14 }, { x: -142, y: -7 }, { x: -140.5, y: -1.5 }, { x: -140, y: 4 }, { x: -140.5, y: 10.5 }, { x: -142, y: 17 },
  { x: -143, y: 21.5 }, { x: -134, y: 17 }, { x: -124, y: 11.5 }, { x: -112, y: 7 }, { x: -100, y: 5 }, { x: -92, y: 5.5 },
], 4);
const ANAL: readonly Pt[] = smoothLoop([
  { x: -72, y: 9.5 }, { x: -76, y: 14.5 }, { x: -80.5, y: 17.5 }, { x: -83, y: 16.6 }, { x: -83.5, y: 13 }, { x: -86, y: 9 }, { x: -89, y: 7 },
  { x: -86, y: 4.5 }, { x: -72, y: 6.5 },
], 3);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -34, y: 17.8 }, { x: -40, y: 23.5 }, { x: -47, y: 27 }, { x: -51, y: 26.4 }, { x: -50, y: 22.5 }, { x: -52, y: 17.5 }, { x: -55, y: 14.5 },
  { x: -52, y: 11 }, { x: -34, y: 13.5 },
], 3);

/** The countershading line, snout to tail: cobalt above breaks off sharply to white below. */
const LINE: readonly Pt[] = spline([
  { x: 166, y: 4.5 }, { x: 146, y: 5.5 }, { x: 132, y: 4.6 }, { x: 120, y: 3.6 }, { x: 106, y: 5 }, { x: 90, y: 6.6 }, { x: 72, y: 7.6 },
  { x: 50, y: 8.4 }, { x: 28, y: 9 }, { x: 6, y: 8.5 }, { x: -18, y: 7.4 }, { x: -40, y: 6 }, { x: -62, y: 4 }, { x: -82, y: 2.6 },
  { x: -100, y: 1.6 }, { x: -126, y: 0.6 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.5 * Math.sin(p.x * 0.21) + 0.3 * Math.sin(p.x * 0.57 + 1) }));
const lineAt = (x: number): number => edgeAt(LINE, x);

export const SHARK_EYE: Pt = T({ x: 121, y: -4.5 });
const EYE_R = 3.4;
/** The mouth under the snout, front to corner. */
const MOUTH: readonly Pt[] = spline([{ x: 143, y: 9.4 }, { x: 132, y: 11.4 }, { x: 120, y: 12.6 }, { x: 111, y: 13.2 }], 5);
const GILLS = [84, 79, 74, 69, 64] as const;

/** The pectoral fin, its root at 0,0 pointing +x: long, narrow, sickle-shaped. */
const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -6.5 }, { x: 10, y: -8 }, { x: 24, y: -8.4 }, { x: 38, y: -7 }, { x: 52, y: -4 }, { x: 63, y: 0 }, { x: 71, y: 3.8 },
  { x: 77, y: 7.2 }, { x: 73.5, y: 7.6 }, { x: 64, y: 5.6 }, { x: 52, y: 4 }, { x: 40, y: 4.2 }, { x: 28, y: 5.6 }, { x: 16, y: 7.2 },
  { x: 4, y: 8 }, { x: -3, y: 7 },
], 4);
const PEC_NEAR: Pt = T({ x: 56, y: 14.5 });
const PEC_FAR: Pt = T({ x: 48, y: 13 });

// ---------------------------------------------------------------- ink

const INDIGO = '#2c3036';
const COBALT = '#7d8794';
const SHEEN = '#e4ebee';
const DARK = '#14181c';
const COOL = '#7d8a85';
const SHADOW = '#1c2420';

function blueStops(x: number): Stops {
  const t = topAt(x);
  const l = Math.max(0.3, Math.min(0.9, (lineAt(x) - t) / Math.max(1, bottomAt(x) - t)));
  return [
    [0, INDIGO], [l * 0.3, '#3a4048'], [l * 0.62, '#586069'], [l * 0.86, COBALT], [l - 0.03, '#8e99a3'],
    [l + 0.012, '#f2efe3'], [Math.min(1, l + 0.25), '#ece7d7'], [1, '#cbc6b5'],
  ];
}

// ---------------------------------------------------------------- painting

/** A fin washed indigo, lit along its leading edge, darker to its trailing edge, ruled with fine lines from its root. */
function paintFin(k: Brush, shape: readonly Pt[], root: Pt, tip: Pt, outline = true): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.save();
    ctx.translate(px(k, 0.8), px(k, 0.8));
    pen.fill(shape, '#434950', 1);
    ctx.restore();
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(150,160,170,0.35)');
    g.addColorStop(0.6, 'rgba(80,88,98,0)');
    g.addColorStop(1, 'rgba(8,10,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, -100, 400, 200);
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const to = { x: tip.x + (root.x - tip.x) * 0.1 + (u - 0.5) * 18, y: tip.y + (u - 0.5) * 14 };
      pen.hair([root, to], px(k, 0.7), DARK, 0.15 + 0.15 * u);
    }
  });
  if (outline) pen.stroke(shape, px(k, 1.4), INK, 1, true);
}

/** The tall fins on the back: rays from the foot, the light up the leading edge, the trailing edge in shadow. */
function paintDorsals(k: Brush): void {
  const { pen, ctx } = k;
  for (const [fin, foot0, foot1] of [[DORSAL, -4, -45], [SECOND_DORSAL, -72, -90]] as const) {
    const apex = fin.reduce((a, p) => (p.y < a.y ? p : a));
    const shape = [...fin, { x: foot1, y: 0 }, { x: foot0, y: 0 }];
    pen.clipped(shape, () => {
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        const foot = { x: foot0 + (foot1 - foot0) * u, y: topAt(foot0 + (foot1 - foot0) * u) };
        pen.hair([foot, { x: apex.x + u * 2, y: apex.y + 3 + u * 6 }], px(k, 0.7), u < 0.3 ? SHEEN : DARK, u < 0.3 ? 0.3 : 0.15 + 0.25 * u);
      }
      softLine(ctx, fin.filter((p) => p.x < apex.x), 5, '#07090b', 0.35);
      softLine(ctx, fin.filter((p) => p.x >= apex.x), 3, '#a9b3ba', 0.3);
    });
  }
}

function paintBlue(k: Brush): void {
  const { pen, ctx } = k;
  ctx.save();
  ctx.translate(px(k, 1.1), px(k, 1.3));
  columnWash(ctx, -124, 166, 1, topAt, bottomAt, blueStops, 50);
  ctx.restore();
  // Light from above along the back, broken; the cobalt glowing just over the line; the belly cooling to its underside.
  softLine(ctx, along(0.1, 150, -110), 7, '#d8dedf', 0.26);
  for (let r = 0; r < 10; r++) {
    const v = 0.03 + (0.28 * (r + pen.rng() * 0.7)) / 10;
    let x = 148 - pen.rng() * 30;
    while (x > -110) {
      const end = Math.max(-112, x - 10 - pen.rng() * 40);
      pen.hair(along(v, x, end, 3), px(k, 0.9 + pen.rng() * 0.6), SHEEN, 0.3 * (1 - v / 0.34));
      x = end - 4 - pen.rng() * 18;
    }
  }
  softLine(ctx, LINE.map((p) => ({ x: p.x, y: p.y - 2.2 })), 4, '#aab5bd', 0.3);
  softLine(ctx, along(0.42, 100, -100), 9, '#0c1014', 0.12);
  pen.stipple(BODY, 1300, (x, y) => 0.5 * Math.max(0, 1 - (y - topAt(x)) / 14), px(k, 0.7), 'rgba(225,230,230,0.5)');
  // The lateral line, faint.
  pen.hair(along(0.36, 96, -110, 5), px(k, 0.8), '#b5bfc2', 0.18);
  // The white belly: cool shade toward its underside, fine lines along it.
  for (let r = 1; r <= 3; r++) pen.hair(along(1 - r * 0.05, 120, -90, 5), px(k, 0.7), COOL, 0.16 - r * 0.03);
  softLine(ctx, along(0.985, 130, -100), 4, '#aaa595', 0.35);
  // The line itself: drawn with the pen, sharp but soft.
  pen.hair(LINE.filter((p) => p.x < 150), px(k, 1), DARK, 0.35);
}

function paintGills(k: Brush): void {
  const { pen } = k;
  for (const x of GILLS) {
    const [top, bottom] = [topAt(x) * 0.42, bottomAt(x) * 0.48];
    const slit = baseSpline([{ x: x + 2.2, y: top }, { x: x - 0.4, y: top * 0.4 }, { x: x - 0.6, y: bottom * 0.4 }, { x: x + 1.4, y: bottom }], 6);
    pen.fill([...slit, ...[...slit].reverse().map((p, i, all) => ({ x: p.x - 1.4 * Math.sin((Math.PI * i) / (all.length - 1)), y: p.y }))], DARK, 0.4);
    pen.stroke(slit, px(k, 1.2), INK, 0.9, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x - 1.7, y: p.y })), px(k, 0.9), SHEEN, 0.35);
  }
}

/** The snout: rows of pores (the shark's electric sense) and the nostril underneath. */
function paintSnout(k: Brush): void {
  const { pen } = k;
  pen.clipped(BODY, () => {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 8; i++) {
        const x = 150 - row * 2 - i * 3.4 - pen.rng() * 1.5;
        const y = topAt(x) + (bottomAt(x) - topAt(x)) * (0.3 + row * 0.16);
        pen.dot(x, y, px(k, 0.7), DARK, 0.45);
      }
    }
  });
  pen.stroke(spline([{ x: 148.5, y: 6.2 }, { x: 146, y: 7.2 }, { x: 143, y: 7.4 }], 3), px(k, 1.2), INK, 0.9, false);
}

/** The tail's point runs on inside the caudal fin: wash over its edge there, ramping in, so no paper shows. */
function hideTailEdge(k: Brush): void {
  const { ctx } = k;
  ctx.save();
  path(ctx, BODY);
  ctx.clip();
  ctx.fillStyle = '#434950';
  for (let x = -96; x > -126; x -= 0.6) {
    ctx.globalAlpha = Math.min(1, (-96 - x) / 12);
    ctx.fillRect(x - 0.6, -20, 0.7, 40);
  }
  ctx.restore();
}

function paintBody(k: Brush): void {
  const { pen } = k;
  paintFin(k, CAUDAL, { x: -100, y: 0 }, { x: -165, y: -42 });
  pen.clipped(CAUDAL, () => pen.stroke(CAUDAL.slice(26, 70).map((p) => ({ x: p.x + 1.4, y: p.y })), px(k, 4), DARK, 0.3, false));
  paintFin(k, ANAL, { x: -78, y: 7 }, { x: -82, y: 17 });
  paintFin(k, PELVIC, { x: -44, y: 15 }, { x: -50, y: 26 });
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintBlue(k);
    paintDorsals(k);
  });
  hideTailEdge(k);
  paintGills(k);
  paintSnout(k);
  pen.stroke(TOPLINE.filter((p) => p.x > -96), px(k, 1.5), INK, 1, true);
  pen.stroke(BELLY.filter((p) => p.x > -96), px(k, 2.2), INK, 1, true);
  // The keel along the tail stock.
  pen.hair(spline([{ x: -92, y: 0.5 }, { x: -104, y: 0.2 }, { x: -116, y: 0 }], 3), px(k, 1), DARK, 0.5);
}

function paintPectoral(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  pen.fill(PECTORAL, PAPER_FILL, 1);
  pen.clipped(PECTORAL, () => {
    ctx.save();
    ctx.translate(px(k, 0.7), px(k, 0.7));
    shade(ctx, PECTORAL, -11, 11, [[0, '#6b747d'], [0.45, '#4c545d'], [1, '#2c3238']]);
    ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 78, 0);
    g.addColorStop(0, 'rgba(8,10,12,0)');
    g.addColorStop(0.6, 'rgba(8,10,12,0.1)');
    g.addColorStop(1, 'rgba(8,10,12,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -12, 95, 24);
    for (let i = 0; i < 8; i++) {
      const u = i / 7;
      pen.hair(spline([{ x: 0, y: -5 + u * 11 }, { x: 36, y: -5 + u * 9 }, { x: 72, y: 2 + u * 4.5 }], 5), px(k, 0.7), DARK, 0.18);
    }
    softLine(ctx, [{ x: 4, y: -6 }, { x: 30, y: -7.2 }, { x: 56, y: -3.4 }, { x: 72, y: 3.6 }], 3, '#bcc6cc', 0.4);
    pen.hair([{ x: 10, y: -7.4 }, { x: 36, y: -7.4 }, { x: 60, y: -2.6 }], px(k, 1.2), SHEEN, 0.5);
    if (far) {
      ctx.fillStyle = 'rgba(6,8,10,0.4)';
      ctx.fillRect(-10, -12, 95, 24);
    }
  });
  pen.stroke(PECTORAL.slice(3, PECTORAL.length - 3), px(k, far ? 1.2 : 1.6), INK, 1, true);
}

/** The dark set: the same shapes as one deep shadow, faintly lit along the back. */
function paintShadowBody(k: Brush): void {
  const { pen, ctx } = k;
  for (const shape of [CAUDAL, ANAL, PELVIC, BODY]) {
    pen.fill(shape, SHADOW, 0.97);
    shade(ctx, shape, -68, 40, [[0, 'rgba(90,100,95,0.35)'], [0.5, 'rgba(90,100,95,0)'], [1, 'rgba(4,8,16,0.4)']]);
  }
  pen.stroke(TOPLINE.filter((p) => p.x > -96), px(k, 1.2), '#0a1220', 0.5, false);
}
function paintShadowPectoral(k: Brush): void {
  k.pen.fill(PECTORAL, SHADOW, 0.97);
  shade(k.ctx, PECTORAL, -11, 11, [[0, 'rgba(90,100,95,0.25)'], [1, 'rgba(4,8,16,0.35)']]);
}

// ---------------------------------------------------------------- sprites

const BODY_BOX: Box = { x0: -176, x1: 160, y0: -72, y1: 44 };
const PEC_BOX: Box = { x0: -5, x1: 80, y0: -16, y1: 16 };

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly near: readonly HTMLCanvasElement[];
  readonly far: readonly HTMLCanvasElement[];
}

const SEED = 9131;
const spritesFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, paintBody),
  near: frames(PEC_BOX, b, SEED + 13, (k) => paintPectoral(k, false)),
  far: frames(PEC_BOX, b, SEED + 17, (k) => paintPectoral(k, true)),
}));
const shadowsFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED + 3, paintShadowBody),
  near: frames(PEC_BOX, b, SEED + 5, paintShadowPectoral),
  far: frames(PEC_BOX, b, SEED + 7, paintShadowPectoral),
}));

// ---------------------------------------------------------------- on screen

/** The rear body's bend for a struggle (as the short's poses give it) and the tail's beat. */
const BEND_FROM = 60;
const BEND_K = 1;
const WAG_FROM = -10;
const WAG_TO = -172;
const WAG = 7;

/** The tail fin turns as one piece from here back, carried on the bent stock. */
const RIGID_FROM = -102;

function curveAt(x: number, bend: number, beat: number): number {
  const b = Math.max(0, Math.min(1, (x - WAG_FROM) / (WAG_TO - WAG_FROM)));
  return (BEND_K * bend * Math.max(0, BEND_FROM - x) ** 2) / 200 + WAG * b * b * Math.sin(beat - 2.6 * b);
}

function bentAt(x: number, bend: number, beat: number): number {
  if (x >= RIGID_FROM) return curveAt(x, bend, beat);
  const at = curveAt(RIGID_FROM, bend, beat);
  const slope = at - curveAt(RIGID_FROM + 1, bend, beat);
  return at + slope * (RIGID_FROM - x);
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
    if (Math.abs(dy) < 1e-3 && Math.abs(slope) < 1e-4) {
      ctx.drawImage(c, sx, 0, w, c.height, box.x0 + sx * k - overlap, box.y0, w * k + 2 * overlap, c.height * k);
      continue;
    }
    ctx.save();
    ctx.translate(x, dy);
    ctx.rotate(Math.atan(slope));
    ctx.drawImage(c, sx, 0, w, c.height, -(w * k) / 2 - overlap, box.y0, w * k + 2 * overlap, c.height * k);
    ctx.restore();
  }
}

function fin(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, root: Pt, angle: number, stretch = 1): void {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(angle);
  ctx.scale(stretch, 1);
  blit(ctx, c, PEC_BOX, res);
  ctx.restore();
}

/** The eye, live: big, round and dark, a catchlight; fear widens it and lifts the lid and the ridge over it. */
function drawEye(ctx: CanvasRenderingContext2D, fear: number, lw: number): void {
  const { x, y } = SHARK_EYE;
  const r = EYE_R * (1 + 0.3 * fear);
  const socket = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.3);
  socket.addColorStop(0, 'rgba(6,12,30,0.6)');
  socket.addColorStop(1, 'rgba(6,12,30,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.1, y + r * 0.45, 0.2, x, y, r);
  g.addColorStop(0, '#4a4f52');
  g.addColorStop(0.55, '#111a28');
  g.addColorStop(1, '#04060a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y, r * (0.42 - 0.12 * fear), r * (0.62 - 0.1 * fear), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,170,195,0.3)';
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.32, y - r * 0.36, r * (0.24 + 0.06 * fear), r * (0.2 + 0.05 * fear), -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.36, y + r * 0.38, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // The lid: a little over the top when calm, gone when scared.
  const lid = (1 - fear) * 0.3;
  if (lid > 0.01) {
    ctx.fillStyle = '#3a4048';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.1, y - r * (1.75 - lid * 1.4), r * 1.6, r, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(170,200,240,0.4)';
  ctx.beginPath();
  ctx.arc(x, y, r + 0.9 * lw, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
  // The ridge over the eye: low when calm, raised and arched when scared.
  const lift = fear * r * 0.35;
  const ridge = curve({ x: x - r * 1.8, y: y - r * 1.05 }, { x: x - r * 0.1, y: y - r * 1.6 - lift }, { x: x + r * 1.5, y: y - r * 1.25 - lift * 0.6 }, 10);
  taper(ctx, ridge.map((p) => ({ x: p.x, y: p.y - 1 })), 2 * lw, 0.5 * lw, '#d5dcdf', 0.3);
  taper(ctx, ridge, 1.1 * lw, 0.4 * lw, INK, 0.3 + 0.15 * fear);
}

/** The mouth under the snout: a firm line, parted to a dark sliver with a glint of teeth when scared. */
function drawMouth(ctx: CanvasRenderingContext2D, fear: number, lw: number): void {
  const gape = 2.4 * Math.max(0, fear - 0.3);
  if (gape > 0.05) {
    const lower = MOUTH.map((p, i) => ({ x: p.x, y: p.y + gape * Math.sin((Math.PI * i) / (MOUTH.length - 1)) ** 0.7 }));
    ctx.save();
    path(ctx, [...MOUTH, ...[...lower].reverse()]);
    ctx.fillStyle = '#1a0c10';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#f1ece0';
    for (let i = 1; i < 6; i++) {
      const p = MOUTH[Math.round((i / 6) * (MOUTH.length - 1))]!;
      ctx.beginPath();
      ctx.moveTo(p.x - 0.9, p.y - 0.2);
      ctx.lineTo(p.x, p.y + 1.6);
      ctx.lineTo(p.x + 0.9, p.y - 0.2);
      ctx.fill();
    }
    ctx.restore();
  }
  taper(ctx, MOUTH, 1.2 * lw, 2 * lw, INK, 0.9);
  taper(ctx, curve(T({ x: 111, y: 13.2 }), T({ x: 108.5, y: 12.4 }), T({ x: 107.4, y: 10.6 }), 4), 1.6 * lw, 0.5 * lw, INK, 0.7);
}

/** The blue shark, nose right in its own units, placed, turned and mirrored by `p` (its tail beating with `p.beat`). */
export function drawBullShark(ctx: CanvasRenderingContext2D, p: Placed, look: SharkLook, boil: number): void {
  const k = p.len / UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const dark = (look.dark ?? 0) > 0.5;
  const b = bucketFor(scale);
  const s = dark ? shadowsFor(b) : spritesFor(b);
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const fear = Math.max(0, Math.min(1, look.fear ?? 0));
  const paddle = 0.05 * Math.sin(p.beat * 0.5);
  fin(ctx, s.far[f]!, s.res, PEC_FAR, 2.62 - 0.2 * fear + paddle, 0.6);
  drawBent(ctx, s.body[f]!, s.res, scale, look.bend ?? 0, p.beat);
  if (!dark) {
    drawEye(ctx, fear, 1 / scale);
    drawMouth(ctx, fear, 1 / scale);
  }
  fin(ctx, s.near[f]!, s.res, PEC_NEAR, 2.3 - 0.32 * fear + paddle, 0.74);
  ctx.restore();
}

/** Bakes the size the short opens on. */
export function prepareBull(): void {
  spritesFor(bucketFor(3.2));
}

