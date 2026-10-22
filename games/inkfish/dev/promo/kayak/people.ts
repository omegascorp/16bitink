import { INK, Pen, type Pt } from '../../../src/art/pen';
import type { Arms, Face, Paddler } from './story';

/**
 * Adrián and his dad in their kayaks, in pen, side on: a painted hull with
 * a highlight along its deck and hatching under it, the paddler sitting in
 * the cockpit (jacket, life vest, hat) with a face drawn big enough to read
 * (calm, nervous, shocked, sheepish, coughing, grinning, smirking), the
 * paddle, and Dad's phone. Drawn in the kayak's own px (bow +x, the
 * waterline y = 0, up is -y), placed by story.ts's `Paddler`.
 */

export interface Outfit {
  readonly hull: string;
  readonly hullShade: string;
  readonly hullLight: string;
  readonly jacket: string;
  readonly vest: string;
  readonly hat: string;
  readonly beard: boolean;
}

export const ADRIAN: Outfit = { hull: '#f2c230', hullShade: '#bf8f17', hullLight: '#fde6a0', jacket: '#2e4c6e', vest: '#d4502f', hat: '#2a2f38', beard: false };
export const DELL: Outfit = { hull: '#c8452c', hullShade: '#8e2a1c', hullLight: '#f0a68e', jacket: '#4f6a3c', vest: '#e2a23a', hat: '#c9c3b2', beard: true };

const SKIN = '#ecc6a0';
const SKIN_SHADE = '#c99a78';
const PADDLE = '#d8d2c4';
const BLADE = '#2f3a44';

const HALF = 140;
const HIP: Pt = { x: -6, y: -14 };
const SHOULDER: Pt = { x: 2, y: -66 };
const HEAD: Pt = { x: 4, y: -94 };
const HEAD_R = 17;

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 71 + boil * 977, 0.9);

const HULL: readonly Pt[] = [
  { x: -HALF, y: -10 }, { x: -100, y: -12 }, { x: 0, y: -13 }, { x: 100, y: -13 }, { x: HALF, y: -16 }, { x: HALF + 4, y: -12 },
  { x: 120, y: 2 }, { x: 70, y: 13 }, { x: 0, y: 17 }, { x: -70, y: 13 }, { x: -120, y: 3 }, { x: -HALF - 4, y: -6 },
];

function shape(pen: Pen, pts: readonly Pt[], fill: string, width = 2.4): void {
  pen.fill(pts, fill, 1);
  pen.stroke([...pts, pts[0]!], width, INK, 1, false);
}

/** A limb through its joints: inked, then its colour inside. */
function limb(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 4;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function hand(pen: Pen, p: Pt): void {
  pen.dot(p.x, p.y, 6.5, SKIN, 1);
  pen.circle(p.x, p.y, 6.5, 1.6, INK);
}

/** The double-bladed paddle between two hands, `over` beyond each. */
function paddle(ctx: CanvasRenderingContext2D, pen: Pen, a: Pt, b: Pt, over: number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const p0 = { x: a.x - d.x * over, y: a.y - d.y * over };
  const p1 = { x: b.x + d.x * over, y: b.y + d.y * over };
  limb(ctx, [p0, p1], 4, PADDLE);
  for (const [end, s] of [[p0, -1], [p1, 1]] as const) {
    const n = { x: -d.y, y: d.x };
    const tip = { x: end.x + d.x * s * 34, y: end.y + d.y * s * 34 };
    shape(pen, [
      { x: end.x + n.x * 4, y: end.y + n.y * 4 }, { x: tip.x + n.x * 11, y: tip.y + n.y * 11 },
      { x: tip.x - n.x * 11, y: tip.y - n.y * 11 }, { x: end.x - n.x * 4, y: end.y - n.y * 4 },
    ], BLADE, 2);
  }
}

interface Hands {
  readonly near: Pt;
  readonly far: Pt;
  readonly elbows: readonly [Pt, Pt];
  /** Paddle held between the hands (with this much beyond them), dropped, or flying from the near hand. */
  readonly paddle: 'held' | 'none' | 'flying';
}

function handsFor(arms: Arms, stroke: number, t: number): Hands {
  switch (arms) {
    case 'paddle': {
      // The shaft rocks: one blade dips forward, then the other.
      const r = 0.55 * Math.sin(stroke);
      const c = { x: 28 + 10 * Math.cos(stroke), y: -44 };
      const near = { x: c.x + 40 * Math.cos(r), y: c.y + 40 * Math.sin(r) };
      const far = { x: c.x - 40 * Math.cos(r), y: c.y - 40 * Math.sin(r) };
      return { near, far, elbows: [{ x: 16, y: -34 }, { x: -8, y: -38 }], paddle: 'held' };
    }
    case 'flail': {
      const w = Math.sin(t * 19);
      return {
        near: { x: 48 + 10 * w, y: -150 - 8 * w },
        far: { x: -38 - 8 * w, y: -146 + 10 * w },
        elbows: [{ x: 34, y: -104 }, { x: -26, y: -102 }],
        paddle: 'flying',
      };
    }
    case 'shrug':
      return { near: { x: 58, y: -78 }, far: { x: -50, y: -78 }, elbows: [{ x: 34, y: -46 }, { x: -30, y: -46 }], paddle: 'none' };
    case 'thumb':
      return { near: { x: 46, y: -128 }, far: { x: -16, y: -36 }, elbows: [{ x: 40, y: -84 }, { x: -18, y: -48 }], paddle: 'none' };
    case 'phone':
      return { near: { x: 44, y: -112 }, far: { x: 34, y: -106 }, elbows: [{ x: 30, y: -70 }, { x: 14, y: -72 }], paddle: 'none' };
    case 'cough':
      return { near: { x: 22, y: -88 }, far: { x: -30, y: -30 }, elbows: [{ x: 30, y: -54 }, { x: -24, y: -44 }], paddle: 'none' };
  }
}

/** Where the phone is, in the kayak's px, when Dad holds it up. */
export const PHONE_IN_HANDS: Pt = { x: 46, y: -122 };

/** A point of a paddler's own px (the kayak's frame) in the world. */
export function onPaddler(p: Paddler, local: Pt): Pt {
  const a = -p.tilt * p.facing;
  const lx = local.x * p.facing * p.scale;
  const ly = local.y * p.scale;
  return { x: p.x + lx * Math.cos(a) - ly * Math.sin(a), y: p.y + lx * Math.sin(a) + ly * Math.cos(a) };
}
export const headOf = (p: Paddler): Pt => onPaddler(p, HEAD);
export const phoneOf = (p: Paddler): Pt => onPaddler(p, PHONE_IN_HANDS);
/** The head's radius, own px. */
export const HEAD_SIZE = HEAD_R;

/** Draws one paddler and kayak, `outfit` theirs (`seed` keeps each one's line boil its own). */
export function drawPaddler(ctx: CanvasRenderingContext2D, p: Paddler, outfit: Outfit, boil: number, t: number, seed: number): void {
  const pen = penFor(ctx, seed, boil);
  const h = handsFor(p.arms, p.stroke, t);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-p.tilt * p.facing);
  ctx.scale(p.facing * p.scale, p.scale);
  // The far arm, behind the body.
  limb(ctx, [SHOULDER, h.elbows[1], h.far], 12, outfit.jacket);
  hand(pen, h.far);
  drawHull(ctx, pen, outfit);
  drawBody(pen, outfit);
  if (h.paddle === 'held') paddle(ctx, pen, h.far, h.near, 70);
  limb(ctx, [SHOULDER, h.elbows[0], h.near], 13, outfit.jacket);
  hand(pen, h.near);
  if (p.arms === 'thumb') pen.stroke([{ x: h.near.x, y: h.near.y - 4 }, { x: h.near.x + 1, y: h.near.y - 15 }], 5, SKIN);
  if (h.paddle === 'flying') {
    const spin = t * 9;
    const c = { x: h.near.x + 30, y: h.near.y - 40 };
    paddle(ctx, pen, { x: c.x - 40 * Math.cos(spin), y: c.y - 40 * Math.sin(spin) }, { x: c.x + 40 * Math.cos(spin), y: c.y + 40 * Math.sin(spin) }, 60);
  }
  if (p.arms === 'phone') drawPhoneInHands(pen);
  drawHead(ctx, pen, outfit, p.face, p.facing);
  ctx.restore();
}

function drawHull(ctx: CanvasRenderingContext2D, pen: Pen, o: Outfit): void {
  const g = ctx.createLinearGradient(0, -16, 0, 18);
  g.addColorStop(0, o.hullLight);
  g.addColorStop(0.35, o.hull);
  g.addColorStop(1, o.hullShade);
  ctx.save();
  ctx.beginPath();
  HULL.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  pen.hatch(HULL, 6, 0.6, 0.8, { onlyBelow: 2, alpha: 0.35 });
  pen.stroke([...HULL, HULL[0]!], 2.8, INK, 1, true);
  // The cockpit rim, deck lines and a grab loop at each end.
  pen.stroke([{ x: -44, y: -13 }, { x: -40, y: -20 }, { x: 30, y: -20 }, { x: 36, y: -13 }], 2.4, INK, 1, false);
  pen.hair([{ x: 44, y: -15 }, { x: 128, y: -15 }], 1.4, INK, 0.7);
  pen.hair([{ x: -128, y: -12 }, { x: -52, y: -14 }], 1.4, INK, 0.7);
  pen.hair([{ x: -110, y: -9 }, { x: 110, y: -10 }], 2.2, o.hullLight, 0.8);
}

function drawBody(pen: Pen, o: Outfit): void {
  const torso = [
    { x: HIP.x - 22, y: HIP.y + 2 }, { x: HIP.x - 24, y: -50 }, { x: SHOULDER.x - 18, y: SHOULDER.y - 6 }, { x: SHOULDER.x + 18, y: SHOULDER.y - 6 },
    { x: HIP.x + 28, y: -46 }, { x: HIP.x + 24, y: HIP.y + 2 },
  ];
  shape(pen, torso, o.jacket);
  const vest = [{ x: -20, y: -18 }, { x: -20, y: -56 }, { x: -6, y: -66 }, { x: 16, y: -66 }, { x: 26, y: -52 }, { x: 24, y: -18 }];
  shape(pen, vest, o.vest, 2);
  pen.hair([{ x: -18, y: -34 }, { x: 22, y: -34 }], 1.6, INK, 0.7);
  pen.hatch(torso, 6, -0.9, 0.8, { alpha: 0.2 });
}

function drawPhoneInHands(pen: Pen): void {
  const c = PHONE_IN_HANDS;
  shape(pen, [{ x: c.x - 9, y: c.y - 15 }, { x: c.x + 9, y: c.y - 15 }, { x: c.x + 9, y: c.y + 15 }, { x: c.x - 9, y: c.y + 15 }], '#22262c', 2);
  pen.dot(c.x - 4, c.y - 9, 2.2, '#e0412f', 1);
}

/** The head, front on (so the face reads even side on), its hat, and its mood. */
function drawHead(ctx: CanvasRenderingContext2D, pen: Pen, o: Outfit, face: Face, facing: 1 | -1): void {
  const { x, y } = HEAD;
  const r = HEAD_R;
  ctx.save();
  // Undo the mirror so the face isn't drawn backwards.
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  pen.dot(0, 0, r, SKIN, 1);
  pen.dot(r * 0.35, r * 0.35, r * 0.6, SKIN_SHADE, 0.35);
  pen.circle(0, 0, r, 2.4, INK);
  if (o.beard) shape(pen, [{ x: -r * 0.9, y: 2 }, { x: -r * 0.6, y: r * 1.05 }, { x: 0, y: r * 1.3 }, { x: r * 0.6, y: r * 1.05 }, { x: r * 0.9, y: 2 }, { x: 0, y: r * 0.55 }], '#b9b2a6', 1.8);
  // A beanie (or a cap with a peak, for Dad).
  shape(pen, [{ x: -r * 1.02, y: -2 }, { x: -r * 0.9, y: -r * 0.85 }, { x: 0, y: -r * 1.25 }, { x: r * 0.9, y: -r * 0.85 }, { x: r * 1.02, y: -2 }, { x: 0, y: -r * 0.4 }], o.hat, 2);
  if (o.beard) shape(pen, [{ x: r * 0.3, y: -r * 0.42 }, { x: r * 1.5, y: -r * 0.3 }, { x: r * 1.45, y: -r * 0.12 }, { x: r * 0.4, y: -r * 0.2 }], o.hat, 1.8);
  drawFace(pen, face, r);
  ctx.restore();
}

function eye(pen: Pen, x: number, y: number, r: number, look: Pt): void {
  pen.dot(x, y, r, '#fbf8ef', 1);
  pen.circle(x, y, r, 1.3, INK);
  pen.dot(x + look.x * r * 0.45, y + look.y * r * 0.45, r * 0.5, INK, 1);
}

function drawFace(pen: Pen, face: Face, r: number): void {
  const ex = r * 0.38;
  const ey = r * 0.02;
  switch (face) {
    case 'calm':
      pen.dot(-ex, ey, 2.2, INK);
      pen.dot(ex, ey, 2.2, INK);
      pen.hair([{ x: -5, y: r * 0.5 }, { x: 0, y: r * 0.62 }, { x: 5, y: r * 0.5 }], 1.8, INK, 0.9);
      break;
    case 'nervous':
      eye(pen, -ex, ey, 4.5, { x: 0.3, y: 0.9 });
      eye(pen, ex, ey, 4.5, { x: 0.3, y: 0.9 });
      pen.hair([{ x: -6, y: r * 0.58 }, { x: -2, y: r * 0.5 }, { x: 2, y: r * 0.6 }, { x: 6, y: r * 0.52 }], 1.8, INK, 0.9);
      // A drop of sweat.
      pen.fill([{ x: r * 1.05, y: -r * 0.5 }, { x: r * 1.25, y: -r * 0.05 }, { x: r * 0.9, y: -r * 0.05 }], '#bfe0ee', 1);
      break;
    case 'shock':
      eye(pen, -ex, ey - 1, 5.5, { x: 0, y: 0 });
      eye(pen, ex, ey - 1, 5.5, { x: 0, y: 0 });
      pen.dot(0, r * 0.58, 4.2, '#5a1e20', 1);
      pen.circle(0, r * 0.58, 4.2, 1.4, INK);
      pen.hair([{ x: -ex - 5, y: -r * 0.55 }, { x: -ex + 4, y: -r * 0.68 }], 1.8, INK, 0.9);
      pen.hair([{ x: ex - 4, y: -r * 0.68 }, { x: ex + 5, y: -r * 0.55 }], 1.8, INK, 0.9);
      break;
    case 'sheepish':
      pen.dot(-ex, ey, 2.4, INK);
      pen.dot(ex, ey, 2.4, INK);
      pen.hair([{ x: -ex - 5, y: -r * 0.5 }, { x: -ex + 4, y: -r * 0.6 }], 1.8, INK, 0.9);
      pen.hair([{ x: ex - 4, y: -r * 0.6 }, { x: ex + 5, y: -r * 0.5 }], 1.8, INK, 0.9);
      pen.hair([{ x: -7, y: r * 0.55 }, { x: 0, y: r * 0.58 }, { x: 7, y: r * 0.48 }], 2, INK, 0.9);
      break;
    case 'cough':
      pen.hair([{ x: -ex - 4, y: ey - 3 }, { x: -ex + 3, y: ey }, { x: -ex - 4, y: ey + 3 }], 1.8, INK, 0.95);
      pen.hair([{ x: ex + 4, y: ey - 3 }, { x: ex - 3, y: ey }, { x: ex + 4, y: ey + 3 }], 1.8, INK, 0.95);
      pen.dot(0, r * 0.55, 5, '#5a1e20', 1);
      pen.circle(0, r * 0.55, 5, 1.4, INK);
      break;
    case 'grin':
      pen.hair([{ x: -ex - 3, y: ey + 1 }, { x: -ex, y: ey - 3 }, { x: -ex + 3, y: ey + 1 }], 1.8, INK, 0.95);
      pen.hair([{ x: ex - 3, y: ey + 1 }, { x: ex, y: ey - 3 }, { x: ex + 3, y: ey + 1 }], 1.8, INK, 0.95);
      shape(pen, [{ x: -9, y: r * 0.32 }, { x: 9, y: r * 0.32 }, { x: 5, y: r * 0.72 }, { x: -5, y: r * 0.72 }], '#fbf8ef', 1.6);
      break;
    case 'smirk':
      pen.dot(-ex, ey, 2.3, INK);
      pen.dot(ex, ey, 2.3, INK);
      pen.hair([{ x: -ex - 5, y: -r * 0.4 }, { x: -ex + 4, y: -r * 0.38 }], 1.8, INK, 0.9);
      pen.hair([{ x: ex - 4, y: -r * 0.62 }, { x: ex + 5, y: -r * 0.48 }], 1.8, INK, 0.9);
      pen.hair([{ x: -6, y: r * 0.55 }, { x: 2, y: r * 0.55 }, { x: 8, y: r * 0.4 }], 2, INK, 0.95);
      break;
  }
}

/** Just his eyes, white in the dark inside the mouth (`look` -1 left .. 1 right, `shut` blinking). */
export function drawEyesInDark(ctx: CanvasRenderingContext2D, at: Pt, size: number, look: number, shut: boolean, boil: number): void {
  const pen = penFor(ctx, 41, boil);
  for (const side of [-1, 1]) {
    const x = at.x + side * size * 0.9;
    if (shut) {
      pen.stroke([{ x: x - size * 0.6, y: at.y }, { x: x + size * 0.6, y: at.y }], size * 0.18, '#e8e4d8');
      continue;
    }
    ctx.save();
    ctx.shadowColor = 'rgba(235,240,220,0.55)';
    ctx.shadowBlur = size * 0.8;
    pen.dot(x, at.y, size * 0.62, '#f2efe4', 1);
    ctx.restore();
    pen.dot(x + look * size * 0.28, at.y + size * 0.05, size * 0.3, '#050607', 1);
  }
}
