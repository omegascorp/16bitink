import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { columnWash, dab, mix, mixStops, path, softLine, step01, type Stops, taper } from '../../seal/art/paint';
import { BODY, EYE, EYE_R, HAIRS, type Leg, SNOUT, SNOUT_TOP, SNOUT_UNDER, type Spine, topAt, underAt } from './echidnaShape';

/**
 * The echidna's brushwork, in its own units (./echidnaShape.ts), in the
 * manner of the seal short's painted animals: the fur laid in column by
 * column from a shadowed back to a warm flank, every spine a little painted
 * quill (a cast shadow, a cream shaft lit on top, a dark tip, a hair of ink
 * underneath), the snout bare grey-brown leather, the legs furry with broad
 * horn claws. `lw` is one screen pixel in local units.
 */

// ---------------------------------------------------------------- ink

const ROOT = '#4a3220';
const CREAM_LIT = '#faedbd';
const CREAM_SHADE = '#b0965e';
const HONEY = '#dcbb72';
const BAND = '#7c5530';
const TIP = '#1d120b';
const LEATHER = ['#857367', '#5c4c42', '#3e322b', '#221b17'] as const;
const CLAW_ROOT = '#3b2f26';
const CLAW = '#d9ccb0';

const AT = [0, 0.3, 0.58, 0.8, 1] as const;
const BACK_PAL = ['#1b110a', '#2b1a10', '#46301d', '#5d3e25', '#2f1e12'] as const;
const FACE_PAL = ['#3a2718', '#4f3521', '#664630', '#5a3c26', '#2c1d12'] as const;

function furStops(x: number): Stops {
  const face = step01(x, 16, 28);
  return mixStops(AT, [[BACK_PAL, 1 - face], [FACE_PAL, face]]);
}

const dirOf = (a: number): Pt => ({ x: Math.cos(a), y: Math.sin(a) });
const add = (p: Pt, d: Pt, k: number): Pt => ({ x: p.x + d.x * k, y: p.y + d.y * k });

function line(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string, alpha = 1): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the spines

/** A quill's outline: fattest a third of the way out, bowed a touch outwards, to a sharp point. */
function quill(ctx: CanvasRenderingContext2D, b: Pt, d: Pt, n: Pt, len: number, w: number, bow: number): void {
  const tip = add(add(b, d, len), n, bow * 0.4);
  const c1 = add(add(b, d, len * 0.34), n, w * 0.66 + bow);
  const c2 = add(add(b, d, len * 0.4), n, -w * 0.55 + bow);
  ctx.beginPath();
  ctx.moveTo(b.x + n.x * w * 0.5, b.y + n.y * w * 0.5);
  ctx.quadraticCurveTo(c1.x, c1.y, tip.x, tip.y);
  ctx.quadraticCurveTo(c2.x, c2.y, b.x - n.x * w * 0.5, b.y - n.y * w * 0.5);
  ctx.quadraticCurveTo(b.x - d.x * w * 0.4, b.y - d.y * w * 0.4, b.x + n.x * w * 0.5, b.y + n.y * w * 0.5);
  ctx.closePath();
}

export interface SpinePose {
  /** 0 lying back .. 1 standing out (bristled). */
  readonly lift: number;
  /** 0 .. 1: lowered flat and limp. */
  readonly droop: number;
  readonly boil: number;
}

export function spineAngle(s: Spine, pose: SpinePose): number {
  const towards = Math.atan2(Math.sin(s.lifted - s.flat), Math.cos(s.lifted - s.flat));
  // Drooped: flatter than at rest, pressed down onto the coat.
  return s.flat + towards * (0.12 + 0.88 * pose.lift) * (1 - 0.9 * pose.droop) + 0.035 * Math.sin(pose.boil * 2.3 + s.seed * 97);
}

export function paintSpine(ctx: CanvasRenderingContext2D, s: Spine, pose: SpinePose, lw: number): void {
  const a = spineAngle(s, pose);
  const d = dirOf(a);
  // The side of the quill facing up (the light).
  const n0 = { x: -d.y, y: d.x };
  const n = n0.y <= 0 ? n0 : { x: -n0.x, y: -n0.y };
  const len = s.len * (1 + 0.1 * pose.lift - 0.06 * pose.droop);
  const w = s.width;
  const bow = len * 0.035 * (s.seed - 0.3);
  // The shadow it casts on the quills and fur under it.
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.translate(0.25, 0.9);
  ctx.fillStyle = 'rgba(16,9,4,0.2)';
  quill(ctx, s.base, d, n, len * 1.02, w * 1.9, bow);
  ctx.fill();
  ctx.fillStyle = 'rgba(16,9,4,0.28)';
  quill(ctx, s.base, d, n, len * 0.96, w * 1.25, bow);
  ctx.fill();
  ctx.restore();
  // The shaft: dark at the root in the fur, cream, honey, a brown band, the black-brown tip.
  const lit = Math.max(0, Math.min(1, s.lit - 0.25 * s.depth));
  const cream = mix(CREAM_SHADE, CREAM_LIT, lit);
  const tip = add(s.base, d, len);
  const g = ctx.createLinearGradient(s.base.x, s.base.y, tip.x, tip.y);
  const bandAt = 0.66 + 0.08 * s.seed;
  g.addColorStop(0, 'rgba(74,50,32,0)');
  g.addColorStop(0.05, ROOT);
  g.addColorStop(0.16, cream);
  g.addColorStop(bandAt - 0.18, mix(HONEY, CREAM_LIT, 0.35 + lit * 0.5));
  g.addColorStop(bandAt, mix(BAND, HONEY, lit * 0.4));
  g.addColorStop(Math.min(0.97, bandAt + 0.1), TIP);
  g.addColorStop(1, TIP);
  ctx.fillStyle = g;
  quill(ctx, s.base, d, n, len, w, bow);
  ctx.fill();
  // Rounded: lit along the top, a darker underside, a hair of ink under it.
  const along = (u0: number, u1: number, off: number): Pt[] =>
    [0, 0.25, 0.5, 0.75, 1].map((k) => {
      const u = u0 + (u1 - u0) * k;
      const half = w * 0.5 * (u < 0.34 ? 1 + 0.3 * (u / 0.34) : 1.3 * (1 - (u - 0.34) / 0.66));
      return add(add(s.base, d, len * u), n, off * half + bow * 4 * u * (1 - u));
    });
  line(ctx, along(0.1, bandAt - 0.04, 0.42), w * 0.26, '#fffbea', 0.25 + 0.5 * lit);
  line(ctx, along(0.12, bandAt + 0.05, -0.55), w * 0.28, '#5c3f22', 0.35);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 0.75 * lw;
  quill(ctx, s.base, d, n, len, w, bow);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the fur

export function paintFur(ctx: CanvasRenderingContext2D, lw: number, boil: number): void {
  ctx.save();
  path(ctx, BODY);
  ctx.clip();
  columnWash(ctx, -47, 40, 1, topAt, underAt, furStops);
  // Light and shade in the round: the flank lit, the throat and the belly in shadow, a dark mask round the eye.
  dab(ctx, -12, 2, 20, '140,98,60', 0.22);
  dab(ctx, 22, 2, 9, '150,108,70', 0.28);
  dab(ctx, 27, 1.5, 6, '170,128,86', 0.25);
  dab(ctx, EYE.x - 0.5, EYE.y + 0.3, 5.5, '16,9,5', 0.55);
  softLine(ctx, [{ x: -42, y: 9 }, { x: -20, y: 12.4 }, { x: 10, y: 11.6 }, { x: 34, y: 4.5 }], 4, '#0e0805', 0.4);
  // The coat's shadow on the fur just under its lower edge.
  softLine(ctx, [{ x: -40, y: 5 }, { x: -20, y: 7.5 }, { x: 0, y: 7.5 }, { x: 12, y: 4 }, { x: 20, y: -4 }], 5, '#0e0805', 0.35);
  // The fur's lie: short strokes, light and dark.
  const rng = createRng(911 + Math.round(boil) * 13);
  for (const h of HAIRS) {
    const a = h.angle + (rng() - 0.5) * 0.12;
    const end = add(h.at, dirOf(a), h.len);
    const mid = add(add(h.at, dirOf(a), h.len * 0.5), dirOf(a + Math.PI / 2), 0.25 * (h.seed - 0.5));
    line(ctx, [h.at, mid, end], Math.max(lw, 0.32), h.light ? '#b48a5c' : '#0d0704', h.light ? 0.16 : 0.32);
  }
  ctx.restore();
}

/** The coat's front edge: the face's fur growing back over the first quills' roots, so the coat grows out of the fur. */
export function paintCoatEdge(ctx: CanvasRenderingContext2D, lw: number): void {
  const rng = createRng(3301);
  for (let i = 0; i < 90; i++) {
    const v = rng();
    const root = { x: 26.5 - v * 15 + (rng() - 0.3) * 2.6, y: -10.5 + v * 15 + (rng() - 0.5) * 1.5 };
    const a = Math.PI + 0.25 - 0.5 * v + (rng() - 0.5) * 0.4;
    const len = 2 + rng() * 2.4;
    const mid = add(add(root, dirOf(a), len * 0.5), dirOf(a + Math.PI / 2), 0.3 * (rng() - 0.5));
    taper(ctx, [root, mid, add(root, dirOf(a), len)], 0.75, Math.max(lw * 0.6, 0.12), rng() < 0.4 ? '#6a4a30' : '#3b2819', 0.95);
  }
}

/** Form: the low sun on top of the dome, the rump and belly turning into shadow. Draw it 'source-atop'. */
export function paintForm(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  dab(ctx, -12, -30, 30, '255,240,200', 0.2);
  const under = ctx.createLinearGradient(0, -6, 0, 16);
  under.addColorStop(0, 'rgba(14,8,4,0)');
  under.addColorStop(1, 'rgba(14,8,4,0.4)');
  ctx.fillStyle = under;
  ctx.fillRect(-70, -6, 100, 30);
  dab(ctx, -50, 4, 22, '14,8,4', 0.35);
  ctx.restore();
}

// ---------------------------------------------------------------- the head

export function paintSnout(ctx: CanvasRenderingContext2D, lw: number): void {
  ctx.save();
  path(ctx, SNOUT);
  const g = ctx.createLinearGradient(0, -6.5, 0, 6);
  g.addColorStop(0, LEATHER[0]);
  g.addColorStop(0.3, LEATHER[1]);
  g.addColorStop(0.68, LEATHER[2]);
  g.addColorStop(1, LEATHER[3]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Lit along the top, a sheen; the wrinkles near the root; a darker tip.
  softLine(ctx, SNOUT_TOP.map((p) => ({ x: p.x, y: p.y + 1.6 })).slice(1, -1), 2.2, '#cbbcac', 0.4);
  softLine(ctx, SNOUT_TOP.map((p) => ({ x: p.x, y: p.y + 1.2 })).slice(3, -3), 0.7, '#f4ece2', 0.45);
  softLine(ctx, SNOUT_UNDER.map((p) => ({ x: p.x, y: p.y - 1 })), 2, '#0d0907', 0.4);
  const tg = ctx.createLinearGradient(50, 0, 60, 0);
  tg.addColorStop(0, 'rgba(20,14,12,0)');
  tg.addColorStop(1, 'rgba(20,14,12,0.45)');
  ctx.fillStyle = tg;
  ctx.fillRect(50, -10, 12, 20);
  for (const [x, a] of [[37.4, 0.22], [40.2, 0.16], [43.4, 0.1]] as const) {
    const top = { x, y: SNOUT_TOP[Math.round(((x - 33) / 25.4) * 14)]!.y };
    const bot = { x: x - 0.4, y: SNOUT_UNDER[Math.round(((x - 33) / 24.6) * 14)]!.y };
    const mid = { x: x + 0.9, y: (top.y + bot.y) / 2 };
    line(ctx, [top, mid, bot], Math.max(lw * 0.9, 0.22), '#120c09', a);
    line(ctx, [{ x: top.x + 0.5, y: top.y }, { x: mid.x + 0.5, y: mid.y }, { x: bot.x + 0.5, y: bot.y }], Math.max(lw * 0.8, 0.2), '#a8968a', a * 0.6);
  }
  ctx.restore();
  // The nostril near the tip, the tiny mouth under it.
  line(ctx, [{ x: 57.6, y: 2.9 }, { x: 58.6, y: 3.4 }], Math.max(lw * 1.3, 0.35), '#060403', 0.9);
  line(ctx, [{ x: 54.2, y: 5.5 }, { x: 57.4, y: 5.9 }], Math.max(lw * 1.1, 0.25), '#060403', 0.7);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3 * lw;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  SNOUT.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** Fur growing a little way onto the snout's root, over its outline. */
export function paintSnoutRoot(ctx: CanvasRenderingContext2D, lw: number): void {
  const rng = createRng(4417);
  for (let i = 0; i < 30; i++) {
    const y = -6.2 + rng() * 10.6;
    const x = 33.6 + rng() * 1.5 - Math.abs(y + 0.8) * 0.15;
    line(ctx, [{ x, y }, { x: x + 1.4 + rng() * 1.4, y: y + (rng() - 0.5) * 0.8 }], Math.max(lw, 0.32), rng() < 0.5 ? '#5f412a' : '#2a1a10', 0.85);
  }
}

export function paintEye(ctx: CanvasRenderingContext2D, sad: number, bristle: number, lw: number): void {
  const { x, y } = EYE;
  const r = EYE_R * (1 + 0.22 * bristle);
  // The lid's ring of fur round it, pale against the dark mask.
  ctx.save();
  ctx.fillStyle = 'rgba(122,88,58,0.75)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.45, r * 1.3, -0.15, 0, Math.PI * 2);
  ctx.fill();
  if (sad > 0.5) {
    // Shut: the lid drawn down, a soft crease along it.
    ctx.fillStyle = '#4c3322';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, [{ x: x - r * 1.05, y: y - r * 0.05 }, { x, y: y + r * 0.45 }, { x: x + r * 1.05, y: y - r * 0.1 }], 1.25 * lw, INK, 0.95);
    line(ctx, [{ x: x - r * 0.8, y: y - r * 0.5 }, { x, y: y - r * 0.2 }, { x: x + r * 0.8, y: y - r * 0.55 }], 0.9 * lw, '#a07c58', 0.6);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.15, y + r * 0.4, 0.05, x, y, r);
  g.addColorStop(0, '#5a3a22');
  g.addColorStop(0.5, '#1a0f08');
  g.addColorStop(1, '#040202');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.32, y - r * 0.36, r * 0.3, r * 0.24, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(x - r * 0.38, y + r * 0.4, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Ink round the mound: firm along the belly and chin, light on the brow, none on the spiny back. */
export function paintBodyInk(ctx: CanvasRenderingContext2D, lw: number): void {
  const under = BODY.filter((p) => p.y > -1 && p.x < 34.5);
  const sorted = [...under].sort((a, b) => a.x - b.x);
  line(ctx, sorted.filter((p) => p.x > -44), 1.7 * lw, INK, 0.95);
  const brow = BODY.filter((p) => p.y < -4 && p.x > 24);
  line(ctx, [...brow].sort((a, b) => b.x - a.x), 1.3 * lw, INK, 0.85);
}

// ---------------------------------------------------------------- the legs

export function paintLeg(ctx: CanvasRenderingContext2D, leg: Leg, far: boolean, lw: number, seed: number): void {
  const shade = far ? 0.42 : 0;
  const front = leg.hip.x > 0;
  // Its shadow on the body behind it.
  if (!far) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.translate(front ? -1.4 : 1.2, 0.4);
    path(ctx, leg.shape);
    const sg = ctx.createLinearGradient(0, 1, 0, 8);
    sg.addColorStop(0, 'rgba(10,6,3,0)');
    sg.addColorStop(1, 'rgba(10,6,3,0.45)');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  path(ctx, leg.shape);
  const g = ctx.createLinearGradient(0, 0, 0, 20);
  g.addColorStop(0, 'rgba(75,50,30,0)');
  g.addColorStop(0.16, mix('#4e331f', '#000000', shade));
  g.addColorStop(0.5, mix('#5e3e25', '#000000', shade));
  g.addColorStop(0.8, mix('#4a301d', '#000000', shade));
  g.addColorStop(1, mix('#271810', '#000000', shade));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const xs = leg.shape.map((p) => p.x);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  // Lit down its front, shadowed behind, a fold where the elbow meets the body.
  softLine(ctx, [{ x: front ? x1 - 2 : x1 - 2.5, y: 4 }, { x: front ? x1 - 1.6 : x1 - 3.5, y: 12 }], 4, '#b08458', far ? 0.08 : 0.28);
  softLine(ctx, [{ x: front ? x0 + 1.5 : x0 + 3, y: 6 }, { x: front ? x0 + 3 : x0 + 4, y: 16 }], 4, '#0c0704', 0.35);
  if (front) softLine(ctx, [{ x: x0 + 2.5, y: 3 }, { x: x0 + 2, y: 7.5 }, { x: x0 + 5, y: 11.5 }], 1.6, '#0c0704', far ? 0.2 : 0.45);
  // Fur running down the leg.
  const rng = createRng(seed);
  for (let i = 0; i < 46; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = 4 + rng() * 15;
    const a = Math.PI / 2 + (front ? -0.15 : 0.3) + (rng() - 0.5) * 0.5;
    line(ctx, [{ x, y }, add({ x, y }, dirOf(a), 1.8 + rng() * 1.8)], Math.max(lw, 0.3), rng() < 0.45 ? '#a57c52' : '#0d0704', far ? 0.18 : 0.32);
  }
  // The sole: a dark pad under the paw.
  softLine(ctx, [{ x: x0 + 1, y: 19.6 }, { x: x1 - 1, y: 19.4 }], 2.2, '#0b0604', 0.6);
  ctx.restore();
  // Ink round it below the belly only, broken by tufts of fur on its edge.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-80, -60, 160, 100);
  BODY.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
  ctx.strokeStyle = INK;
  ctx.lineWidth = (far ? 1.2 : 1.5) * lw;
  ctx.lineJoin = 'round';
  path(ctx, leg.shape);
  ctx.stroke();
  const tuft = createRng(seed + 7);
  for (let i = 1; i < leg.shape.length - 1; i += 2) {
    const p = leg.shape[i]!;
    if (p.y < 6 || p.y > 18.5) continue;
    const q = leg.shape[i + 1]!;
    const t = Math.atan2(q.y - p.y, q.x - p.x);
    const out = t - Math.PI / 2;
    const len = 0.6 + tuft() * 0.8;
    line(ctx, [add(p, dirOf(out), -0.3), add(add(p, dirOf(out), len), dirOf(Math.PI / 2), 0.5)], Math.max(lw * 1.2, 0.3), far ? '#1d120a' : '#4a301d', 0.8);
  }
  ctx.restore();
}

/** The claws: horn-coloured, dark at the root, curved, each a tapered blade (broad and flat on the front feet). */
export function paintClaws(ctx: CanvasRenderingContext2D, leg: Leg, far: boolean, lw: number): void {
  for (const c of leg.claws) {
    const len = Math.hypot(c.reach.x, c.reach.y);
    const d = { x: c.reach.x / len, y: c.reach.y / len };
    const n = { x: -d.y, y: d.x };
    const tip = { x: c.root.x + c.reach.x + n.x * c.bend * 0.5, y: c.root.y + c.reach.y + n.y * c.bend * 0.5 + Math.abs(c.bend) * 0.6 };
    const ctrl = add(add(c.root, d, len * 0.55), n, -c.bend * 0.4);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(c.root.x + n.x * c.w * 0.5, c.root.y + n.y * c.w * 0.5);
    ctx.quadraticCurveTo(ctrl.x + n.x * c.w * 0.45, ctrl.y + n.y * c.w * 0.45, tip.x, tip.y);
    ctx.quadraticCurveTo(ctrl.x - n.x * c.w * 0.3, ctrl.y - n.y * c.w * 0.3, c.root.x - n.x * c.w * 0.5, c.root.y - n.y * c.w * 0.5);
    ctx.closePath();
    const g = ctx.createLinearGradient(c.root.x, c.root.y, tip.x, tip.y);
    g.addColorStop(0, CLAW_ROOT);
    g.addColorStop(0.45, mix(CLAW, CLAW_ROOT, 0.45));
    g.addColorStop(1, CLAW);
    ctx.fillStyle = far ? mix('#6b5e4d', '#000000', 0.2) : g;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9 * lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
    line(ctx, [add(c.root, d, -0.2), add(c.root, d, -1.8)], Math.max(lw * 0.9, 0.18), '#0b0604', far ? 0.25 : 0.45);
    if (!far) line(ctx, [add(add(c.root, d, len * 0.3), n, c.w * 0.18), add(add(ctrl, d, len * 0.1), n, c.w * 0.12)], Math.max(lw * 0.9, c.w * 0.18), '#fff6e0', 0.45);
  }
}
