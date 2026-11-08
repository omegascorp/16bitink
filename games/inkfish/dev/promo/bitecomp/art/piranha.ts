import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import type { KitEntry } from '../../foodchain/kit';
import { resample } from '../../kraken/whale';
import { type Box, type Brush, type Bucket, type Stops, blit, columnWash, contour, dab, frames, lazily, path, px, screenScale, softLine, step01, turn } from '../../seal/art/paint';
import type { DrawHead } from './contract';
import {
  BELLY_INK, BODY, BODY_BOX, CORNER, EYE, EYE_R, FADE_FROM, FADE_TO, FIN, FIN_BOX, FIN_ROOT, HINGE, JAW, JAW_BOX,
  JAW_MAX, JAW_MELT, JAW_UNDER, LEN, LOWER_TEETH, MOUTH_LO, MOUTH_UP, OPERCLE, PREOPERCLE, TEETH_BOX, TOP, UPPER_TEETH, bellyAt, mouthLoAt,
  mouthUpAt, topAt,
} from './piranhaShape';

/**
 * The black piranha (Serrasalmus rhombeus), front half, painted like the
 * sharks in ../../foodchain/art: a near-black back washing down through a
 * silvery flank to a dark grey belly, a sheen along the side, the bony gill
 * cover lit silver, fine scales and a scatter of dark spots behind it, the
 * saw-edged keel; the blood-red eye; the heavy jutting lower jaw with one row
 * of sharp triangular teeth that interlock with the upper row.
 *
 * Baked parts per line-boil frame: the body, the lower jaw, the upper and
 * lower teeth, the pectoral fin (it sculls). The jaw turns about its hinge
 * over the inside of the mouth (live); the eye is live too.
 */

// ---------------------------------------------------------------- colour

const SILVER = '#cdd6dc';
const DARK = '#111417';
const IVORY = '#f2ecdf';

/** Back to belly at any x: near-black, slate, the silver band, darker below. */
const STOPS: Stops = [
  [0, '#0c0f11'], [0.13, '#192024'], [0.28, '#2c373e'], [0.43, '#4f5d66'], [0.54, '#74818a'], [0.64, '#606a71'],
  [0.78, '#4b5054'], [1, '#33373a'],
];
const ventralAt = (x: number): number => (x > -6 ? 65 - (x + 6) * 1.6 : bellyAt(x));
/** The back for the colour field: the snout's front curls back on itself, so hold the line level past it. */
const washTop = (x: number): number => topAt(Math.min(x, 0));

/** The shared colour field (the same in every part, so they meet cleanly), then the shared lights. */
function bodyWash(k: Brush, shape: readonly Pt[], x0: number, x1: number): void {
  const { ctx, pen } = k;
  pen.clipped(shape, () => {
    columnWash(ctx, x0, x1, 2, washTop, ventralAt, () => STOPS, 60);
    // The sheen along the flank, and the light on the brow from above.
    softLine(ctx, contour(washTop, ventralAt, 0.5, -30, -580, 6), 70, SILVER, 0.12, 7);
    for (const [x, v, r, a] of [[-360, 0.48, 70, 0.2], [-450, 0.56, 60, 0.16], [-250, 0.42, 50, 0.14], [-140, 0.5, 40, 0.14]] as const) {
      dab(ctx, x, topAt(x) + (ventralAt(x) - topAt(x)) * v, r, '214,224,230', a);
    }
    // A cold blue-green lustre high on the flank, a brassy one low on the gill cover.
    dab(ctx, -400, -150, 100, '86,120,132', 0.18);
    dab(ctx, -250, 40, 70, '186,170,128', 0.14);
    for (const [from, a] of [[-140, 0.1], [-260, 0.08], [-380, 0.06]] as const) {
      softLine(ctx, TOP.filter((p) => p.x > from).map((p) => ({ x: p.x - 3, y: p.y + 12 })), 18, '#8d989f', a, 5);
    }
    // The gill cover and cheek, bone under thin skin, lit silver.
    dab(ctx, -232, -14, 82, '196,206,214', 0.3);
    dab(ctx, -120, -20, 60, '170,182,190', 0.2);
    // A warm flush on the throat.
    dab(ctx, -150, 96, 50, '150,72,52', 0.1);
    // The dark shoulder blotch behind the gill cover.
    dab(ctx, -326, -70, 46, '8,10,12', 0.5);
  });
}

// ---------------------------------------------------------------- the body

/** Dry-brush strokes along the body's curve: the sheen on the scales broken into streaks, as on the great white's flank. */
function dryBrush(k: Brush, v0: number, v1: number, rows: number, x0: number, x1: number, colour: string, alpha: (v: number) => number, width: number): void {
  const { pen } = k;
  pen.clipped(BODY, () => {
    for (let r = 0; r < rows; r++) {
      const v = v0 + ((v1 - v0) * (r + pen.rng() * 0.8)) / rows;
      let x = x0 - pen.rng() * 50;
      while (x > x1) {
        const end = Math.max(x1, x - 30 - pen.rng() * 110);
        pen.hair(contour(washTop, ventralAt, v, x, end, 6), px(k, width), colour, alpha(v));
        x = end - 10 - pen.rng() * 50;
      }
    }
  });
}

/** Rows of fine scales behind the gill cover, their free edges catching the light. */
function paintScales(k: Brush): void {
  const { pen } = k;
  pen.clipped(BODY, () => {
    let row = 0;
    for (let v = 0.05; v < 0.97; v += 0.026, row++) {
      for (let x = -302 - (row % 2) * 5.5; x > -580; x -= 11) {
        const y = topAt(x) + (ventralAt(x) - topAt(x)) * v;
        const fade = step01(-x, 296, 330);
        const edge = [{ x: x + 1.5, y: y - 5 }, { x: x - 2.6, y: y - 2.2 }, { x: x - 3.4, y }, { x: x - 2.6, y: y + 2.2 }, { x: x + 1.5, y: y + 5 }];
        pen.hair(edge, px(k, 0.8), DARK, 0.3 * fade);
        pen.hair(edge.map((p) => ({ x: p.x - 1.3, y: p.y })), px(k, 0.8), SILVER, (0.1 + 0.14 * Math.sin(Math.PI * v)) * fade);
      }
    }
    // A scatter of small dark spots on the flank.
    for (let i = 0; i < 70; i++) {
      const x = -300 - pen.rng() * 270;
      const v = 0.18 + pen.rng() * 0.62;
      const y = topAt(x) + (ventralAt(x) - topAt(x)) * v;
      pen.dot(x, y, 1.8 + pen.rng() * 2.4, DARK, 0.35);
    }
    // The lateral line, a row of pale pores.
    for (const p of contour(washTop, ventralAt, 0.27, -305, -580, 11)) pen.hair([{ x: p.x + 1.5, y: p.y }, { x: p.x - 2, y: p.y + 0.3 }], px(k, 1), SILVER, 0.22);
  });
}

/** The gill cover: radiating striations on the bone, its free edge dark over the body with a lit rim. */
function paintGillCover(k: Brush): void {
  const { ctx, pen } = k;
  const plate = [...PREOPERCLE, ...[...OPERCLE].reverse()];
  pen.clipped(BODY, () => {
    pen.clipped(plate, () => {
      for (let i = 0; i < 14; i++) {
        const a = -1.1 + (2.2 * i) / 13;
        const from = { x: -200 + Math.cos(a) * 10, y: -4 + Math.sin(a) * 20 };
        const to = { x: from.x - 110 * Math.cos(a * 0.55), y: from.y + 150 * Math.sin(a * 0.8) };
        pen.hair([from, { x: (from.x + to.x) / 2 - 6, y: (from.y + to.y) / 2 }, to], px(k, 0.8), SILVER, 0.09);
      }
    });
    // The shadow the cover's edge throws back onto the body, and the light along its rim.
    softLine(ctx, OPERCLE.map((p) => ({ x: p.x - 9, y: p.y })), 18, '#050607', 0.24, 6);
    softLine(ctx, OPERCLE.map((p) => ({ x: p.x + 4, y: p.y })), 4, '#dfe6ea', 0.14, 3);
    softLine(ctx, PREOPERCLE.map((p) => ({ x: p.x + 4, y: p.y })), 8, '#dfe6ea', 0.08, 3);
  });
  pen.stroke(OPERCLE.filter((p) => p.y < bellyAt(p.x) - 4), px(k, 1.5), INK, 0.8, false);
  pen.hair(PREOPERCLE.slice(6, -6), px(k, 0.9), INK, 0.2);
}

/** The head's details: nostrils, pores round the eye, the upper lip's bone. */
function paintHead(k: Brush): void {
  const { ctx, pen } = k;
  pen.clipped(BODY, () => {
    for (const [x, y] of [[-34, -50], [-48, -59]] as const) {
      dab(ctx, x, y, 6, '0,0,0', 0.6);
      ctx.fillStyle = '#060708';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.6, 1.8, -0.6, 0, Math.PI * 2);
      ctx.fill();
      pen.hair([{ x: x - 3, y: y + 2.2 }, { x: x + 2, y: y + 2.4 }], px(k, 0.9), SILVER, 0.45);
    }
    // A ring of pores in the bones round and under the eye.
    for (let i = 0; i < 11; i++) {
      const a = 0.3 + (2.4 * i) / 10;
      pen.dot(-100 + Math.cos(a) * 46, -82 + Math.sin(a) * 44, 1.3, DARK, 0.55);
    }
    // The upper jaw's bone above the lip, catching the light.
    softLine(ctx, MOUTH_UP.map((p) => ({ x: p.x, y: p.y - 6 })), 6, '#aab4bb', 0.3, 4);
    pen.hair(spline3({ x: 6, y: -15 }, { x: -34, y: -12 }, { x: -82, y: 10 }), px(k, 1), INK, 0.35);
    // The cheek's soft dark under the eye.
    dab(ctx, -110, -26, 34, '8,10,12', 0.22);
  });
}

/** Three points as a short smooth line. */
function spline3(a: Pt, b: Pt, c: Pt): Pt[] {
  return Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    const v = 1 - u;
    return { x: v * v * a.x + 2 * u * v * b.x + u * u * c.x, y: v * v * a.y + 2 * u * v * b.y + u * u * c.y };
  });
}

/** The saw-edged keel: small hooked scutes along the belly. */
function paintSerrae(k: Brush): void {
  const { pen } = k;
  for (let x = -200; x > -560; x -= 7) {
    const y = bellyAt(x);
    const y2 = bellyAt(x - 5);
    pen.fill([{ x, y: y - 1 }, { x: x - 5, y: y2 - 1 }, { x: x - 5.4, y: y2 + 2.6 * step01(-x, 200, 260) }], DARK, 0.85);
  }
}

function paintBody(k: Brush): void {
  const { ctx, pen } = k;
  bodyWash(k, BODY, -582, 30);
  paintScales(k);
  dryBrush(k, 0.03, 0.4, 22, -150, -580, SILVER, (v) => 0.2 * (1 - v / 0.45), 0.9);
  dryBrush(k, 0.42, 0.66, 14, -200, -580, '#eef3f6', () => 0.16, 1);
  dryBrush(k, 0.7, 0.98, 12, -180, -580, DARK, () => 0.22, 1);
  dryBrush(k, 0.05, 0.6, 10, -10, -300, SILVER, () => 0.08, 0.8);
  paintGillCover(k);
  paintHead(k);
  paintSerrae(k);
  pen.stroke(TOP, px(k, 2.6), INK, 1, true);
  pen.stroke(BELLY_INK, px(k, 2.4), INK, 1, true);
  pen.stroke(MOUTH_UP, px(k, 1.8), INK, 1, false);
  // The front half fades out behind the fin.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(FADE_FROM, 0, FADE_TO, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(FADE_TO - 10, BODY_BOX.y0, FADE_FROM - FADE_TO + 10, BODY_BOX.y1 - BODY_BOX.y0);
  ctx.restore();
}

// ---------------------------------------------------------------- the lower jaw, teeth, fin

function paintJaw(k: Brush): void {
  const { ctx, pen } = k;
  bodyWash(k, JAW, -140, 40);
  pen.clipped(JAW, () => {
    // The heavy chin lit silver from above, darker under it.
    softLine(ctx, resample([{ x: -70, y: 52 }, { x: -30, y: 38 }, { x: 4, y: 26 }, { x: 24, y: 16 }], 16), 16, SILVER, 0.16, 5);
    dab(ctx, 16, 24, 13, '214,222,228', 0.18);
    softLine(ctx, JAW_UNDER.map((p) => ({ x: p.x, y: p.y - 5 })), 12, '#08090a', 0.35, 5);
    // The lip, pale along its edge; pores along the jaw.
    softLine(ctx, MOUTH_LO.map((p) => ({ x: p.x, y: p.y + 3 })), 4, '#a6b0b6', 0.4, 3);
    for (let i = 0; i < 8; i++) pen.dot(-4 - i * 12, 32 + i * 4.2, 1.2, DARK, 0.55);
  });
  // The back end melts into the throat, so it slides under the cheek as the jaw drops.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const melt = ctx.createLinearGradient(JAW_MELT[0], 0, JAW_MELT[1], 0);
  melt.addColorStop(0, 'rgba(0,0,0,0)');
  melt.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = melt;
  ctx.fillRect(JAW_BOX.x0, JAW_BOX.y0, JAW_MELT[0] - JAW_BOX.x0, JAW_BOX.y1 - JAW_BOX.y0);
  ctx.restore();
  pen.stroke(MOUTH_LO, px(k, 1.6), INK, 1, false);
  pen.stroke(JAW_UNDER.filter((p) => p.x > JAW_MELT[0] + 6), px(k, 2.4), INK, 1, true);
}

/** A tooth on the lip at `base`, pointing `dir` (1 down, -1 up): a sharp blade-like triangle. */
function tooth(k: Brush, base: Pt, dir: 1 | -1, h: number, w: number): void {
  const { pen } = k;
  const tip = { x: base.x + 1.2, y: base.y + dir * h };
  const left = { x: base.x - w / 2, y: base.y - dir * 3 };
  const right = { x: base.x + w / 2, y: base.y - dir * 3 };
  const side = (from: Pt, out: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => {
      const u = i / 6;
      return { x: from.x + (tip.x - from.x) * u + out * Math.sin(Math.PI * u) * w * 0.08, y: from.y + (tip.y - from.y) * u };
    });
  const a = side(left, -1);
  const b = side(right, 1);
  const shape = [...a, ...[...b].reverse().slice(1)];
  pen.fill(shape, IVORY, 1);
  // The back face in shade, a glint down the front edge.
  pen.fill([tip, ...b.slice(1, -1).reverse(), { x: base.x + w * 0.05, y: base.y - dir * 3 }], '#b9ad96', 0.7);
  pen.hair(a.slice(1, -1).map((p) => ({ x: p.x + 1, y: p.y })), px(k, 1), '#ffffff', 0.7);
  pen.stroke(shape, px(k, 0.9), INK, 1, false);
}

function paintUpper(k: Brush): void {
  for (const [x, h, w] of UPPER_TEETH) tooth(k, { x, y: mouthUpAt(x) + 0.6 }, 1, h, w);
}

function paintLower(k: Brush): void {
  for (const [x, h, w] of LOWER_TEETH) tooth(k, { x, y: mouthLoAt(x) - 0.6 }, -1, h, w);
}

/** The pectoral fin: dusky and thin, ruled with rays from its root. */
function paintFin(k: Brush): void {
  const { ctx, pen } = k;
  pen.fill(FIN, '#3e474e', 0.7);
  pen.clipped(FIN, () => {
    const g = ctx.createLinearGradient(FIN_ROOT.x, 0, -430, 0);
    g.addColorStop(0, 'rgba(20,24,27,0.35)');
    g.addColorStop(1, 'rgba(170,180,188,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(FIN_BOX.x0, FIN_BOX.y0, FIN_BOX.x1 - FIN_BOX.x0, FIN_BOX.y1 - FIN_BOX.y0);
    const rim = resample(FIN.slice(5, 36), 14);
    rim.forEach((p, i) => {
      pen.hair([FIN_ROOT, { x: (FIN_ROOT.x + p.x) / 2, y: (FIN_ROOT.y + p.y) / 2 + 2 }, p], px(k, 1.1), DARK, 0.55);
      pen.hair([{ x: FIN_ROOT.x - 2, y: FIN_ROOT.y - 1.5 }, { x: p.x + 2, y: p.y - 2.5 }], px(k, 0.8), SILVER, 0.3);
    });
  });
  pen.stroke(FIN, px(k, 1.5), INK, 0.95, false);
}

// ---------------------------------------------------------------- sprites

const BUCKETS: readonly Bucket[] = [{ res: 0.5, w: 1.5 }, { res: 1.05, w: 1.2 }, { res: 2, w: 1 }, { res: 3.4, w: 1 }];
const bucketFor = (s: number): Bucket => BUCKETS.find((b) => b.res >= s * 0.92) ?? BUCKETS[BUCKETS.length - 1]!;

interface Sprites {
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly upper: readonly HTMLCanvasElement[];
  readonly lower: readonly HTMLCanvasElement[];
  readonly fin: readonly HTMLCanvasElement[];
}

const sprites = lazily((b: Bucket): Sprites => ({
  body: frames(BODY_BOX, b, 51013, paintBody),
  jaw: frames(JAW_BOX, b, 52027, paintJaw),
  upper: frames(TEETH_BOX, b, 53041, paintUpper),
  lower: frames(TEETH_BOX, b, 54059, paintLower),
  fin: frames(FIN_BOX, b, 55069, paintFin),
}));

/** Bakes the middle size (the others bake the first time they're needed). */
export async function prepare(): Promise<void> {
  sprites(BUCKETS[2]!);
}

// ---------------------------------------------------------------- on screen

/** The inside of the mouth: dark, a pink gum along each jaw behind the teeth. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  const lower = [...MOUTH_LO].reverse().map((p) => turn(p, HINGE, open));
  const tip = lower[lower.length - 1]!;
  const top = MOUTH_UP[0]!;
  const far = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return { x: tip.x + (top.x - tip.x) * u - 7 * Math.sin(Math.PI * u), y: tip.y + (top.y - tip.y) * u };
  });
  const shape = [...MOUTH_UP, HINGE, ...lower, ...far.slice(1, -1)];
  ctx.save();
  path(ctx, shape);
  const g = ctx.createLinearGradient(CORNER.x, 0, 14, 0);
  g.addColorStop(0, '#12060a');
  g.addColorStop(1, '#4a1a22');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(150,70,80,0.75)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  MOUTH_UP.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 1) : ctx.moveTo(p.x, p.y + 1)));
  ctx.stroke();
  ctx.beginPath();
  lower.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y - 1) : ctx.moveTo(p.x, p.y - 1)));
  ctx.stroke();
  ctx.restore();
  if (open < 0.02) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 / screenScale(ctx);
  ctx.lineCap = 'round';
  ctx.beginPath();
  far.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

function blitTurned(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, about: Pt, a: number): void {
  ctx.save();
  ctx.translate(about.x, about.y);
  ctx.rotate(a);
  ctx.translate(-about.x, -about.y);
  blit(ctx, c, box, res);
  ctx.restore();
}

/** The blood-red eye: a dark bony rim, the red iris darker at its top, the black pupil, a bright catchlight. */
function drawEye(ctx: CanvasRenderingContext2D, t: number, lw: number): void {
  const { x, y } = EYE;
  const r = EYE_R;
  const look = { x: 1.2 * Math.sin(t * 0.7), y: 0.8 * Math.sin(t * 0.43 + 1) };
  ctx.save();
  const socket = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.45);
  socket.addColorStop(0, 'rgba(6,7,8,0.75)');
  socket.addColorStop(1, 'rgba(6,7,8,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  ctx.strokeStyle = 'rgba(176,188,196,0.45)';
  ctx.lineWidth = 2.2 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.12, -2.6, 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const iris = ctx.createRadialGradient(x + 2, y + 5, r * 0.15, x, y, r);
  iris.addColorStop(0, '#ff5a4c');
  iris.addColorStop(0.38, '#dc1c24');
  iris.addColorStop(0.78, '#990a16');
  iris.addColorStop(1, '#3e0308');
  ctx.fillStyle = iris;
  ctx.fill();
  ctx.clip();
  // Fine radial threads in the iris, then the shade of the brow over its top.
  ctx.strokeStyle = 'rgba(255,150,130,0.22)';
  ctx.lineWidth = 0.9 * lw;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48);
    ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  const brow = ctx.createLinearGradient(0, y - r, 0, y);
  brow.addColorStop(0, 'rgba(20,0,2,0.6)');
  brow.addColorStop(1, 'rgba(20,0,2,0)');
  ctx.fillStyle = brow;
  ctx.fillRect(x - r, y - r, 2 * r, r);
  ctx.fillStyle = '#040303';
  ctx.beginPath();
  ctx.arc(x + 2 + look.x, y + 1 + look.y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + 7, y - 8, 5.2, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(x - 7, y + 9, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The front half facing right, placed by its bite point (the front teeth); see contract.ts. */
export const drawPiranha: DrawHead = (ctx, p) => {
  const u = p.size / LEN;
  const screen = u * screenScale(ctx);
  const bucket = bucketFor(screen);
  const s = sprites(bucket);
  const f = ((Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const open = Math.max(0, Math.min(1, p.jaw)) * JAW_MAX;
  const scull = 0.08 * Math.sin(p.t * Math.PI * 2 * 0.9);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(u, u);
  drawMouth(ctx, open);
  blitTurned(ctx, s.lower[f]!, TEETH_BOX, bucket.res, HINGE, open);
  blit(ctx, s.upper[f]!, TEETH_BOX, bucket.res);
  blit(ctx, s.body[f]!, BODY_BOX, bucket.res);
  blitTurned(ctx, s.jaw[f]!, JAW_BOX, bucket.res, HINGE, open);
  blitTurned(ctx, s.fin[f]!, FIN_BOX, bucket.res, FIN_ROOT, scull);
  drawEye(ctx, p.t, 1 / screen);
  ctx.restore();
};

export const KIT: KitEntry = {
  name: 'piranha',
  draw: (ctx, w, h, t) => drawPiranha(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
