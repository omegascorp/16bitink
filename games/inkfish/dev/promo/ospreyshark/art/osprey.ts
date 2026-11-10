import { type Pt } from '../../../../src/art/pen';
import { fillShape, inkLine, seeded, unitPx, within } from '../../pelican/art/ink';
import { dab, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { type FeatherInk, paintFeather } from './feather';
import { type OspreyFoot, paintLegAndFoot, paintTrousers } from './foot';
import { paintWing } from './wing';

/**
 * The osprey, painted to the bar of ../../foodchain/art/greatWhite.ts and
 * ../../pelican/art/pelican.ts, seen from below and to the side as it flies
 * to the right with its wings raised in a shallow V: white underparts with a
 * streaky brown breast band and cool shadow, a white head with fine brown
 * streaks on the crown, the dark brown stripe through the yellow eye (with a
 * catchlight) running back down the neck, a black hooked beak over a grey
 * cere, a barred tail. The near wing shows its underside (white coverts, the
 * dark wrist patch and the dark bar along the coverts, grey barred flight
 * feathers with dark tips, the long fingered primaries), the far wing its
 * dark brown top. The legs and gripping feet are in foot.ts.
 *
 * Own units: facing right (+x), y down, the body's middle at 0,0, about 390
 * from the beak to the tail tip and 1,000 across the raised wings.
 */

export interface OspreyPose {
  readonly x: number;
  readonly y: number;
  readonly k: number;
  /** Wing beat phase, radians: the wings lift and fall a little round their glide. */
  readonly beat: number;
  /** How much they beat, 0 (gliding) .. 1. */
  readonly flap: number;
  /** The beak open (a cry), 0 .. 1. */
  readonly cry: number;
}

// ---------------------------------------------------------------- shapes (own units)

const BODY = smoothLoop([
  { x: 112, y: -30 }, { x: 72, y: -40 }, { x: 18, y: -42 }, { x: -40, y: -35 }, { x: -92, y: -20 }, { x: -122, y: -8 },
  { x: -114, y: 8 }, { x: -72, y: 24 }, { x: -12, y: 38 }, { x: 46, y: 40 }, { x: 92, y: 28 }, { x: 120, y: 4 }, { x: 126, y: -16 },
], 6);

const HEAD_C: Pt = { x: 140, y: -30 };
const HEAD = smoothLoop([
  { x: 108, y: -42 }, { x: 124, y: -60 }, { x: 150, y: -62 }, { x: 170, y: -50 }, { x: 177, y: -32 }, { x: 170, y: -12 },
  { x: 148, y: -2 }, { x: 122, y: -4 }, { x: 104, y: -18 },
], 6);
const EYE: Pt = { x: 157, y: -37 };
const EYE_R = 6.6;

const UPPER_BEAK = smoothLoop([
  { x: 168, y: -42 }, { x: 182, y: -42 }, { x: 194, y: -35 }, { x: 200, y: -22 }, { x: 197, y: -10 }, { x: 193, y: -14 },
  { x: 189, y: -22 }, { x: 178, y: -24 }, { x: 168, y: -24 },
], 4);
const CERE = smoothLoop([{ x: 167, y: -42 }, { x: 178, y: -43 }, { x: 180, y: -33 }, { x: 177, y: -24 }, { x: 167, y: -24 }], 3);
const LOWER_BEAK = smoothLoop([{ x: 170, y: -24 }, { x: 186, y: -22 }, { x: 190, y: -18 }, { x: 180, y: -15 }, { x: 170, y: -16 }], 3);

/** Where the legs leave the body (front, rear). */
export const HIPS: readonly [Pt, Pt] = [{ x: 42, y: 30 }, { x: -16, y: 32 }];
/** The wing roots: the far wing (behind the body) and the near wing. */
const FAR_SHOULDER: Pt = { x: 30, y: -36 };
const NEAR_SHOULDER: Pt = { x: -8, y: -26 };
export const WING_LEN = 540;

// ---------------------------------------------------------------- ink

const DARK_BROWN = '#2a1c13';
const TAIL_INK: FeatherInk = { base: '#efeae3', tip: '#cfc6bb', bar: '#5a4636', bars: 0.6, shaft: '#fbf8f2', tipBand: 0.5 };

// ---------------------------------------------------------------- tail

function paintTail(ctx: CanvasRenderingContext2D, boil: number): void {
  const n = 8;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const a = Math.PI - 0.05 + 0.55 * u;
    paintFeather(ctx, { at: { x: -92, y: -14 + 18 * u }, dir: { x: Math.cos(a), y: Math.sin(a) }, len: 112 - 8 * Math.abs(u - 0.5), width: 32 }, TAIL_INK, boil, 0.45);
  }
}

// ---------------------------------------------------------------- body and head

function paintBody(ctx: CanvasRenderingContext2D, boil: number): void {
  const px = unitPx(ctx);
  const g = ctx.createLinearGradient(0, -42, 0, 40);
  g.addColorStop(0, '#6a4a33');
  g.addColorStop(0.16, '#8a6a50');
  g.addColorStop(0.3, '#f5f2ec');
  g.addColorStop(0.7, '#e9e6e2');
  g.addColorStop(1, '#b9bccb');
  fillShape(ctx, BODY, g);
  within(ctx, BODY, () => {
    dab(ctx, 20, 4, 90, '255,255,255', 0.6);
    dab(ctx, -30, 34, 80, '120,126,160', 0.35);
    dab(ctx, 100, 20, 30, '150,150,175', 0.25);
    // The brown back along the top, the streaky breast band.
    softLine(ctx, [{ x: 110, y: -36 }, { x: 0, y: -42 }, { x: -110, y: -16 }], 18, DARK_BROWN, 0.6, 5);
    const rng = seeded(97);
    for (let i = 0; i < 46; i++) {
      const x = 52 + rng() * 64;
      const y = -24 + rng() * 40;
      taper(ctx, [{ x, y }, { x: x - 7, y: y + 4 }], 3.4, 0.6, i % 3 ? '#7d5a40' : '#a27c5c', 0.55);
    }
    // Soft belly feathers in rows of small arcs.
    ctx.lineCap = 'round';
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 12; i++) {
        const x = 40 - i * 13 - row * 5;
        const y = -6 + row * 10 + i * 0.8;
        ctx.strokeStyle = (row + i) % 3 ? 'rgba(140,140,165,0.25)' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.1 * px;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0.2 * Math.PI, 0.95 * Math.PI);
        ctx.stroke();
      }
    }
  });
  inkLine(ctx, BODY, 1.7, 0.8, boil, true);
}

function paintHead(ctx: CanvasRenderingContext2D, cry: number, boil: number): void {
  const g = ctx.createLinearGradient(0, -62, 0, -2);
  g.addColorStop(0, '#fffefb');
  g.addColorStop(0.7, '#f1eeea');
  g.addColorStop(1, '#cfcfd8');
  fillShape(ctx, HEAD, g);
  within(ctx, HEAD, () => {
    dab(ctx, 140, -54, 26, '255,255,255', 0.8);
    // Fine brown streaks on the crown.
    const rng = seeded(53);
    for (let i = 0; i < 22; i++) {
      const x = 118 + rng() * 44;
      const y = -60 + rng() * 14;
      taper(ctx, [{ x, y }, { x: x - 8, y: y + 2.5 }], 2.6, 0.5, '#6a4a33', 0.6);
    }
    // The dark stripe through the eye, from the beak back down the neck.
    const stripe = smoothLoop([
      { x: 170, y: -40 }, { x: 160, y: -44 }, { x: 146, y: -43 }, { x: 128, y: -40 }, { x: 108, y: -36 }, { x: 96, y: -30 },
      { x: 104, y: -24 }, { x: 122, y: -27 }, { x: 144, y: -30 }, { x: 160, y: -31 }, { x: 170, y: -34 },
    ], 4);
    fillShape(ctx, stripe, '#3a2618', 0.92);
    softLine(ctx, [{ x: 150, y: -40 }, { x: 110, y: -33 }], 4, '#6a4a33', 0.5, 3);
    dab(ctx, 136, -14, 22, '140,140,170', 0.3);
  });
  inkLine(ctx, HEAD, 1.6, 0.8, boil, true);
  // The eye: yellow iris, black pupil, a catchlight, a dark rim.
  const { x, y } = EYE;
  const r = EYE_R;
  ctx.fillStyle = '#20140c';
  ctx.beginPath();
  ctx.arc(x, y, r + 1.6, 0, Math.PI * 2);
  ctx.fill();
  const iris = ctx.createRadialGradient(x - 1, y - 1.5, 0.5, x, y, r);
  iris.addColorStop(0, '#ffe680');
  iris.addColorStop(0.6, '#f2c230');
  iris.addColorStop(1, '#b98414');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#080605';
  ctx.beginPath();
  ctx.arc(x + 0.6, y + 0.2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + r * 0.28, y - r * 0.36, Math.max(1, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y + r * 0.35, Math.max(0.6, r * 0.1), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The brow over the eye: a fierce ridge.
  taper(ctx, [{ x: x - 11, y: y - 7 }, { x: x, y: y - 10 }, { x: x + 10, y: y - 8 }], 3.2, 1.2, '#20140c', 0.9);
  // The beak: black, hooked, over a grey-blue cere; the lower mandible drops for a cry.
  const c = ctx.createLinearGradient(167, -43, 180, -24);
  c.addColorStop(0, '#9aa3ad');
  c.addColorStop(1, '#6b7480');
  fillShape(ctx, CERE, c);
  ctx.save();
  ctx.translate(170, -20);
  ctx.rotate(0.35 * cry);
  ctx.translate(-170, 20);
  const lg = ctx.createLinearGradient(170, -24, 190, -15);
  lg.addColorStop(0, '#3a3a40');
  lg.addColorStop(1, '#101014');
  fillShape(ctx, LOWER_BEAK, lg);
  inkLine(ctx, LOWER_BEAK, 1.1, 0.8, boil, true);
  ctx.restore();
  const ug = ctx.createLinearGradient(170, -42, 198, -12);
  ug.addColorStop(0, '#45464e');
  ug.addColorStop(0.55, '#1c1c22');
  ug.addColorStop(1, '#08080a');
  fillShape(ctx, UPPER_BEAK, ug);
  softLine(ctx, [{ x: 178, y: -40 }, { x: 190, y: -36 }, { x: 196, y: -26 }], 2.4, '#b8bcc8', 0.55, 2);
  inkLine(ctx, UPPER_BEAK, 1.3, 0.9, boil, true);
  inkLine(ctx, CERE, 1, 0.6, boil, true);
  dab(ctx, 174, -37, 2.2, '20,20,24', 0.9);
}

// ---------------------------------------------------------------- the whole bird

export interface OspreyGrip {
  /** The feet (own units), front foot first. */
  readonly feet: readonly OspreyFoot[];
}

/** Wing angles (screen radians, own frame) for a beat: the arm and the hand of each wing. */
function wingAngles(p: OspreyPose): { readonly far: readonly [number, number]; readonly near: readonly [number, number] } {
  const s = Math.sin(p.beat) * p.flap;
  return {
    far: [-0.78 - 0.12 * s, -0.3 - 0.2 * s],
    near: [-2.4 + 0.12 * s, -2.86 + 0.2 * s],
  };
}

function placed(ctx: CanvasRenderingContext2D, p: OspreyPose, paint: () => void): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.k, p.k);
  paint();
  ctx.restore();
}

/** The far wing, behind everything (it lies behind whatever the bird carries too). */
export function drawOspreyBack(ctx: CanvasRenderingContext2D, p: OspreyPose, boil: number): void {
  const w = wingAngles(p);
  placed(ctx, p, () => paintWing(ctx, { root: FAR_SHOULDER, armA: w.far[0], handA: w.far[1], len: WING_LEN * 0.94, lead: -1, under: false }, boil));
}

/** The legs and clamped feet (drawn over what it carries). */
export function drawOspreyFeet(ctx: CanvasRenderingContext2D, p: OspreyPose, grip: OspreyGrip, boil: number): void {
  placed(ctx, p, () => {
    // The rear leg first: it is the far one, a little in the body's shadow.
    for (let i = grip.feet.length - 1; i >= 0; i--) paintLegAndFoot(ctx, HIPS[i]!, grip.feet[i]!, i === 1, boil);
  });
}

/** The tail, the trousers, the body, the head and the near wing (over the legs). */
export function drawOspreyFront(ctx: CanvasRenderingContext2D, p: OspreyPose, grip: OspreyGrip, boil: number): void {
  const w = wingAngles(p);
  placed(ctx, p, () => {
    paintTail(ctx, boil);
    grip.feet.forEach((f, i) => paintTrousers(ctx, HIPS[i]!, f.ankle, i === 1, boil));
    paintBody(ctx, boil);
    paintHead(ctx, p.cry, boil);
    paintWing(ctx, { root: NEAR_SHOULDER, armA: w.near[0], handA: w.near[1], len: WING_LEN, lead: 1, under: true }, boil);
  });
}

/** Own units to the parent frame. */
export const ospreyToWorld = (p: OspreyPose, q: Pt): Pt => ({ x: p.x + q.x * p.k, y: p.y + q.y * p.k });
export const worldToOsprey = (p: OspreyPose, q: Pt): Pt => ({ x: (q.x - p.x) / p.k, y: (q.y - p.y) / p.k });
export { HEAD_C as OSPREY_HEAD };
export type { OspreyFoot, OspreyToe } from './foot';
