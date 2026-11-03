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
const DEEP = 1.5;
const SNOUT_FROM = 100;
const SNOUT_K = 0.5;
const T = (p: Pt): Pt => ({ x: p.x > SNOUT_FROM ? SNOUT_FROM + (p.x - SNOUT_FROM) * SNOUT_K : p.x, y: p.y * DEEP });
const spline = (pts: readonly Pt[], n?: number): Pt[] => baseSpline(pts.map(T), n);
const smoothLoop = (pts: readonly Pt[], n?: number): Pt[] => baseLoop(pts.map(T), n);

/**
 * The Greenland shark (Somniosus microcephalus), after the blue shark and painted in the manner of the great
 * white (../../foodchain/art/greatWhite.ts): a heavy cigar of a body, a short blunt rounded snout, a tiny dark
 * eye, five low gill slits, two small low dorsals set far back, no anal fin, short paddle pectorals and a
 * tail with a long upper lobe. Grey-brown all over, a little paler below with no sharp line, mottled, with
 * pale scars; the light from above along the back.
 *
 * Parts are sprites baked once per line-boil frame at a few sizes (the body, drawn in thin columns so it
 * bends and beats its tail; the two pectorals). The eye and the mouth are live. Own units: 310 long, the
 * middle at 0,0, nose to the right (+x), belly down (+y).
 */

export interface SharkLook {
  /** 0: grey-brown; 1: a dark shape. */
  readonly dark?: number;
  /** How far the rear body bends: positive down, negative up, about -0.25 .. 0.25. */
  readonly bend?: number;
  /** The mouth, slightly open: 0 shut .. 1. */
  readonly open?: number;
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

/** The two small, low, rounded dorsals, set far back. */
const DORSAL: readonly Pt[] = spline([
  { x: -42, y: -17.6 }, { x: -46, y: -22 }, { x: -50, y: -26.5 }, { x: -54, y: -29 }, { x: -57, y: -28 }, { x: -58.5, y: -24 }, { x: -60, y: -19 }, { x: -62, y: -13.4 },
], 5);
const SECOND_DORSAL: readonly Pt[] = spline([
  { x: -74, y: -8.6 }, { x: -77, y: -12.5 }, { x: -80.5, y: -15 }, { x: -83.5, y: -14.2 }, { x: -85, y: -11 }, { x: -88, y: -7.6 }, { x: -90, y: -6.7 },
], 4);
const TOPLINE: readonly Pt[] = [
  ...BACK.filter((p) => p.x > -42), ...DORSAL, ...BACK.filter((p) => p.x < -62 && p.x > -74), ...SECOND_DORSAL, ...BACK.filter((p) => p.x < -90),
];
const BODY: readonly Pt[] = [...TOPLINE, ...[...BELLY].reverse().slice(1, -1)];

/** The crescent tail: a long upper lobe with a small notched tip, a shorter lower lobe. */
const CAUDAL: readonly Pt[] = spline([
  { x: -92, y: -6 }, { x: -108, y: -10.5 }, { x: -124, y: -17.5 }, { x: -140, y: -26 }, { x: -154, y: -35 }, { x: -165, y: -42.5 },
  { x: -172, y: -47.5 }, { x: -170, y: -43.5 }, { x: -164.5, y: -39.5 }, { x: -161, y: -36 }, { x: -158, y: -30 }, { x: -152, y: -22 },
  { x: -146, y: -14 }, { x: -142, y: -7 }, { x: -140.5, y: -1.5 }, { x: -140, y: 4 }, { x: -140.5, y: 10.5 }, { x: -142, y: 17 },
  { x: -143, y: 21.5 }, { x: -134, y: 17 }, { x: -124, y: 11.5 }, { x: -112, y: 7 }, { x: -100, y: 5 }, { x: -92, y: 5.5 },
], 4);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -34, y: 17.8 }, { x: -40, y: 23.5 }, { x: -47, y: 27 }, { x: -51, y: 26.4 }, { x: -50, y: 22.5 }, { x: -52, y: 17.5 }, { x: -55, y: 14.5 },
  { x: -52, y: 11 }, { x: -34, y: 13.5 },
], 3);

export const SHARK_EYE: Pt = T({ x: 110, y: -4 });
const EYE_R = 2.3;
/** The mouth under the snout, front to corner. */
const MOUTH: readonly Pt[] = spline([{ x: 136, y: 9.4 }, { x: 128, y: 11.4 }, { x: 118, y: 12.8 }, { x: 105, y: 13.6 }, { x: 96, y: 13.2 }], 5);
const GILLS = [78, 73, 68, 63, 58] as const;

/** The pectoral fin, its root at 0,0 pointing +x: short and rounded, a paddle. */
const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -6 }, { x: 8, y: -8 }, { x: 20, y: -8 }, { x: 30, y: -6 }, { x: 38, y: -2 }, { x: 41, y: 3 }, { x: 38, y: 7 }, { x: 28, y: 8 },
  { x: 16, y: 7.5 }, { x: 4, y: 7.5 }, { x: -3, y: 6.5 },
], 4);
const PEC_NEAR: Pt = T({ x: 50, y: 14 });
const PEC_FAR: Pt = T({ x: 44, y: 12.5 });

// ---------------------------------------------------------------- ink

const DARK = '#15130f';
const SHEEN = '#c9c8bd';
const SHADOW = '#1c2420';
const COOL = '#8d8c84';

/** Slate-brown over the back, softening to a dusty grey-tan belly; no hard line. */
function skinStops(): Stops {
  return [[0, '#2e2e2c'], [0.22, '#4a4741'], [0.55, '#6a665d'], [0.8, '#8e897e'], [1, '#aeaa9c']];
}

// ---------------------------------------------------------------- painting

/** A fin washed indigo, lit along its leading edge, darker to its trailing edge, ruled with fine lines from its root. */
function paintFin(k: Brush, shape: readonly Pt[], root: Pt, tip: Pt, outline = true): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.save();
    ctx.translate(px(k, 0.8), px(k, 0.8));
    pen.fill(shape, '#4a4741', 1);
    ctx.restore();
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(170,166,150,0.3)');
    g.addColorStop(0.6, 'rgba(80,76,66,0)');
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
  for (const [fin, foot0, foot1] of [[DORSAL, -42, -62], [SECOND_DORSAL, -74, -90]] as const) {
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

function paintSkin(k: Brush): void {
  const { pen, ctx } = k;
  ctx.save();
  ctx.translate(px(k, 1.1), px(k, 1.3));
  columnWash(ctx, -124, 140, 1, topAt, bottomAt, skinStops, 50);
  ctx.restore();
  // Big soft mottling: darker and paler patches, then fine pale flecks over the back.
  for (let i = 0; i < 30; i++) {
    const x = -112 + pen.rng() * 240;
    const v = 0.1 + pen.rng() * 0.75;
    const y = topAt(x) + (bottomAt(x) - topAt(x)) * v;
    const dark = pen.rng() < 0.55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 8 + pen.rng() * 12);
    g.addColorStop(0, dark ? 'rgba(24,22,18,0.16)' : 'rgba(190,184,168,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 24, y - 24, 48, 48);
  }
  // Light from above along the back, broken; shade toward the underside.
  softLine(ctx, along(0.1, 128, -110), 8, '#c8c4b4', 0.22);
  for (let r = 0; r < 8; r++) {
    const v = 0.03 + (0.3 * (r + pen.rng() * 0.7)) / 8;
    let x = 130 - pen.rng() * 30;
    while (x > -110) {
      const end = Math.max(-112, x - 10 - pen.rng() * 40);
      pen.hair(along(v, x, end, 3), px(k, 0.9 + pen.rng() * 0.6), SHEEN, 0.26 * (1 - v / 0.36));
      x = end - 4 - pen.rng() * 18;
    }
  }
  softLine(ctx, along(0.62, 100, -100), 12, '#0c0b09', 0.06);
  softLine(ctx, along(0.97, 118, -100), 6, '#d6d0bc', 0.12);
  pen.stipple(BODY, 1500, (x, y) => 0.45 * Math.max(0, 1 - (y - topAt(x)) / 24), px(k, 0.7), 'rgba(205,200,184,0.5)');
  pen.stipple(BODY, 900, () => 0.5, px(k, 0.6), 'rgba(18,16,12,0.35)');
  // The lateral line and a few pale scars.
  pen.hair(along(0.42, 90, -110, 5), px(k, 0.8), '#b9b4a2', 0.16);
  for (const [x, v, len] of [[40, 0.3, 16], [-10, 0.5, 22], [66, 0.65, 12]] as const) pen.hair(along(v, x, x - len, 3), px(k, 1), '#d9d3c0', 0.35);
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
  ctx.fillStyle = '#4a4741';
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
  paintFin(k, PELVIC, { x: -44, y: 15 }, { x: -50, y: 26 });
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintSkin(k);
    paintDorsals(k);
  });
  hideTailEdge(k);
  paintGills(k);
  paintSnout(k);
  pen.stroke(TOPLINE.filter((p) => p.x > -96), px(k, 1.2), INK, 0.8, true);
  pen.stroke(BELLY.filter((p) => p.x > -96), px(k, 1.6), INK, 0.8, true);
  // The keel along the tail stock.
  pen.hair(spline([{ x: -92, y: 0.5 }, { x: -104, y: 0.2 }, { x: -116, y: 0 }], 3), px(k, 1), DARK, 0.5);
}

function paintPectoral(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  pen.fill(PECTORAL, PAPER_FILL, 1);
  pen.clipped(PECTORAL, () => {
    ctx.save();
    ctx.translate(px(k, 0.7), px(k, 0.7));
    shade(ctx, PECTORAL, -11, 11, [[0, '#7a766a'], [0.45, '#5a564d'], [1, '#34322c']]);
    ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 40, 0);
    g.addColorStop(0, 'rgba(8,10,12,0)');
    g.addColorStop(0.6, 'rgba(8,10,12,0.1)');
    g.addColorStop(1, 'rgba(8,10,12,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -12, 55, 24);
    for (let i = 0; i < 8; i++) {
      const u = i / 7;
      pen.hair(spline([{ x: 0, y: -5 + u * 11 }, { x: 20, y: -5 + u * 10 }, { x: 38, y: -1 + u * 5 }], 5), px(k, 0.7), DARK, 0.18);
    }
    softLine(ctx, [{ x: 4, y: -6 }, { x: 18, y: -7.2 }, { x: 32, y: -4.4 }, { x: 39, y: 1 }], 3, '#c6c2b0', 0.4);
    pen.hair([{ x: 8, y: -7.4 }, { x: 22, y: -7 }, { x: 34, y: -3.6 }], px(k, 1.2), SHEEN, 0.5);
    if (far) {
      ctx.fillStyle = 'rgba(6,8,10,0.4)';
      ctx.fillRect(-10, -12, 55, 24);
    }
  });
  pen.stroke(PECTORAL.slice(3, PECTORAL.length - 3), px(k, far ? 1.2 : 1.6), INK, 1, true);
}

/** The dark set: the same shapes as one deep shadow, faintly lit along the back. */
function paintShadowBody(k: Brush): void {
  const { pen, ctx } = k;
  for (const shape of [CAUDAL, PELVIC, BODY]) {
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
const PEC_BOX: Box = { x0: -5, x1: 46, y0: -12, y1: 12 };

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly near: readonly HTMLCanvasElement[];
  readonly far: readonly HTMLCanvasElement[];
}

const SEED = 7717;
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
const WAG = 5;

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

/** The eye, live: tiny, dark and a little clouded, with a catchlight. */
function drawEye(ctx: CanvasRenderingContext2D, lw: number): void {
  const { x, y } = SHARK_EYE;
  const r = EYE_R;
  const socket = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
  socket.addColorStop(0, 'rgba(14,12,9,0.55)');
  socket.addColorStop(1, 'rgba(14,12,9,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.1, y + r * 0.4, 0.2, x, y, r);
  g.addColorStop(0, '#6f8a58');
  g.addColorStop(0.5, '#233020');
  g.addColorStop(1, '#050504');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(140,210,120,0.55)';
  ctx.lineWidth = 0.7 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y - r * 0.34, r * 0.26, r * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(170,255,150,0.6)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y + r * 0.4, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const brow = curve({ x: x - r * 2, y: y - r * 1.2 }, { x: x, y: y - r * 1.9 }, { x: x + r * 2, y: y - r * 1.3 }, 8);
  taper(ctx, brow.map((p) => ({ x: p.x, y: p.y - 0.8 })), 1.8 * lw, 0.5 * lw, '#cfcbb8', 0.25);
  taper(ctx, brow, 1.1 * lw, 0.4 * lw, INK, 0.35);
}

/** The mouth under the snout: a long low line, parted a little to a dark gap with small teeth. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number, lw: number): void {
  const gape = 4 * open;
  if (gape > 0.1) {
    const lower = MOUTH.map((p, i) => ({ x: p.x, y: p.y + gape * Math.sin((Math.PI * i) / (MOUTH.length - 1)) ** 0.7 }));
    ctx.save();
    path(ctx, [...MOUTH, ...[...lower].reverse()]);
    ctx.fillStyle = '#1a0c10';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#ece6d4';
    for (let i = 1; i < 9; i++) {
      const p = MOUTH[Math.round((i / 9) * (MOUTH.length - 1))]!;
      ctx.beginPath();
      ctx.moveTo(p.x - 0.8, p.y - 0.2);
      ctx.lineTo(p.x, p.y + 1.7);
      ctx.lineTo(p.x + 0.8, p.y - 0.2);
      ctx.fill();
    }
    ctx.restore();
  }
  taper(ctx, MOUTH, 1.2 * lw, 2 * lw, INK, 0.9);
  taper(ctx, curve({ x: 96, y: 13.2 }, { x: 93.5, y: 12.4 }, { x: 92.4, y: 10.6 }, 4), 1.5 * lw, 0.5 * lw, INK, 0.7);
}

/** The Greenland shark, nose right in its own units, placed, turned and mirrored by `p` (its tail beating with `p.beat`). */
export function drawGreenlandShark(ctx: CanvasRenderingContext2D, p: Placed, look: SharkLook, boil: number): void {
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
  const open = Math.max(0, Math.min(1, look.open ?? 0));
  const paddle = 0.05 * Math.sin(p.beat * 0.5);
  fin(ctx, s.far[f]!, s.res, PEC_FAR, 2.4 + paddle, 0.55);
  drawBent(ctx, s.body[f]!, s.res, scale, look.bend ?? 0, p.beat);
  if (!dark) {
    drawEye(ctx, 1 / scale);
    drawMouth(ctx, open, 1 / scale);
  }
  fin(ctx, s.near[f]!, s.res, PEC_NEAR, 2.1 + paddle, 0.65);
  ctx.restore();
}

/** Bakes the size the short opens on. */
export function prepareGreenland(): void {
  spritesFor(bucketFor(3.2));
}

