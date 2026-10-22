import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import {
  type Arm, columnAt, EYE, EYE_R, FAR_SHIFT, type FrogLook, GROUND_Y, HINGE, inside, lipsOf, type Lips, mapPt, mouthShape, OUTLINE, PECTORAL, PELVIC, ROD_LEN,
  ROD_ROOT, TAIL_BASE_X, TIP,
} from './shape';

/**
 * The frogfish in the game's pen and ink, painted rather than doodled: a
 * warm yellow-orange wash over paper, deeper orange and rust blotches, pale
 * saddles, a few dark spots, the skin covered in little warts (each a lit
 * top and an inked shadow), stippled and hatched on its shadow side; a
 * scalloped round tail and soft dorsal fin with rays; elbowed arm fins it
 * stands on. Baked once per boil frame in three layers (the far limbs, the
 * body, the near limbs); the body is drawn in columns so its mouth opens
 * and its throat and belly balloon (shape.ts). The live parts go on top:
 * the inside of the mouth, the lips, the eye and the rod with its bait.
 *
 * Everything here is in frog px (fp); the caller sets up the transform.
 */

const RES = 3.6;
const BOX = { x0: -165, y0: -128, w: 290, h: 262 } as const;

export const SKIN = '#f0b443';
const SKIN_DEEP = '#e07f2a';
const RUST = '#b4501f';
const CREAM = '#fbe7b4';
const SPOT = '#6e2a14';
const LIP = '#f3a47a';
const SHADE = '#5a2410';
const BAIT = '#f08c98';

export interface FrogSprites {
  readonly back: readonly HTMLCanvasElement[];
  readonly body: readonly HTMLCanvasElement[];
  readonly front: readonly HTMLCanvasElement[];
}

function bake(seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(BOX.w * RES), Math.ceil(BOX.h * RES));
    ctx.scale(RES, RES);
    ctx.translate(-BOX.x0, -BOX.y0);
    draw(new Pen(ctx, seed + f * 977, 0.45), ctx);
    return canvas;
  });
}

export function makeFrogSprites(): FrogSprites {
  return {
    back: bake(211, (pen) => {
      drawArm(pen, shifted(PECTORAL), true);
      drawArm(pen, shifted(PELVIC), true);
    }),
    body: bake(223, drawBody),
    front: bake(239, (pen) => {
      drawArm(pen, PELVIC, false);
      drawArm(pen, PECTORAL, false);
    }),
  };
}

// ---------------------------------------------------------------- outline helpers

/** The outline's top and bottom at x (fp). */
function edgesAt(x: number): { readonly top: number; readonly bottom: number } {
  const ys: number[] = [];
  for (let i = 0; i < OUTLINE.length; i++) {
    const a = OUTLINE[i]!;
    const b = OUTLINE[(i + 1) % OUTLINE.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    ys.push(a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
  }
  return ys.length ? { top: Math.min(...ys), bottom: Math.max(...ys) } : { top: 0, bottom: 0 };
}

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const quad = (a: Pt, c: Pt, b: Pt, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * c.y + u * u * b.y };
  });

/** A tube round a centre line, `w0` wide at its start tapering to `w1`, as a closed outline. */
function tube(line: readonly Pt[], w0: number, w1: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = (w0 + (w1 - w0) * (i / (line.length - 1))) / 2;
    left.push({ x: p.x - ((b.y - a.y) / d) * w, y: p.y + ((b.x - a.x) / d) * w });
    right.push({ x: p.x + ((b.y - a.y) / d) * w, y: p.y - ((b.x - a.x) / d) * w });
  });
  return [...left, ...right.reverse()];
}

const shifted = (a: Arm): Arm => {
  const s = (p: Pt): Pt => ({ x: p.x + FAR_SHIFT.x, y: p.y + FAR_SHIFT.y });
  return { ...a, shoulder: s(a.shoulder), elbow: s(a.elbow), wrist: s(a.wrist), hand: [s(a.hand[0]), s(a.hand[1])] };
};

// ---------------------------------------------------------------- skin

/** Little warts over a region: each a lit cap and an inked shadow below it. */
function warts(pen: Pen, region: readonly Pt[], count: number, size: readonly [number, number], keep: (p: Pt) => boolean = () => true): void {
  const xs = region.map((p) => p.x);
  const ys = region.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(region, () => {
    for (let i = 0; i < count; i++) {
      const p = { x: x0 + pen.rng() * (x1 - x0), y: y0 + pen.rng() * (y1 - y0) };
      if (!inside(region, p) || !keep(p)) continue;
      const r = size[0] + pen.rng() * (size[1] - size[0]);
      pen.fill(ellipse(p.x + r * 0.25, p.y + r * 0.3, r * 1.05, r * 0.95, 10), SKIN_DEEP, 0.32);
      pen.fill(ellipse(p.x - r * 0.15, p.y - r * 0.2, r * 0.7, r * 0.6, 10), CREAM, 0.38);
      const arc = Array.from({ length: 7 }, (_, k) => {
        const a = -0.3 + (k / 6) * 2.4;
        return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
      });
      pen.hair(arc, 0.34, INK, 0.42);
    }
  });
}

/** A tuft of skin flaps (papillae): a few fleshy hairs fanning out from `p` along `dir`. */
function tuft(pen: Pen, p: Pt, dir: Pt, size: number): void {
  const d = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / d, y: dir.y / d };
  for (const s of [-0.55, 0, 0.5]) {
    const tip = { x: p.x + (u.x - u.y * s) * size, y: p.y + (u.y + u.x * s) * size };
    const flap = [p, { x: (p.x + tip.x) / 2 - u.y * 1.1, y: (p.y + tip.y) / 2 + u.x * 1.1 }, tip, { x: (p.x + tip.x) / 2 + u.y * 1.1, y: (p.y + tip.y) / 2 - u.x * 1.1 }];
    pen.fill(flap, SKIN, 0.85);
    pen.hair([p, tip], 0.45, INK, 0.75);
  }
}

// ---------------------------------------------------------------- fins

/** The round tail fan: scalloped, rayed, a deeper band near its edge. */
function drawTail(pen: Pen): void {
  const root = { x: TAIL_BASE_X + 5, y: 0 };
  const n = 26;
  const edge = Array.from({ length: n + 1 }, (_, k) => {
    const a = Math.PI - 0.82 + (1.64 * k) / n;
    const r = 50 + 2.4 * Math.sin(k * 2.2) - 4 * Math.abs(k / n - 0.5);
    return { x: root.x + Math.cos(a) * r, y: root.y + Math.sin(a) * r };
  });
  const shape = [{ x: TAIL_BASE_X + 6, y: -15 }, ...edge, { x: TAIL_BASE_X + 6, y: 15 }];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SKIN, 0.82);
  pen.clipped(shape, () => {
    const band = [...edge.map((p) => lerpPt(root, p, 0.93)), ...edge.map((p) => lerpPt(root, p, 0.72)).reverse()];
    pen.fill(band, SKIN_DEEP, 0.55);
    for (let i = 0; i < 6; i++) pen.dot(root.x - 18 - pen.rng() * 26, -26 + pen.rng() * 52, 1.4 + pen.rng() * 1.2, SPOT, 0.55);
    pen.hatch(shape, 2.3, 0.9, 0.3, { color: SHADE, alpha: 0.18, onlyBelow: 6 });
  });
  for (let k = 1; k < n; k += 2) {
    const from = { x: TAIL_BASE_X + 2, y: -13 + (26 * k) / n };
    pen.hair([from, lerpPt(from, edge[k]!, 0.5), edge[k]!], 0.45, INK, 0.55);
  }
  pen.stroke(edge, 1.1, INK, 1, false);
}

/** A soft fin along the back (or the belly): rayed, scalloped, raked back. */
function drawEdgeFin(pen: Pen, from: number, to: number, height: number, side: -1 | 1): void {
  const n = 20;
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const x = from + (to - from) * f;
    const e = edgesAt(x);
    const y = side < 0 ? e.top + 3 : e.bottom - 3;
    const h = height * Math.sin(Math.PI * Math.min(1, f * 1.06)) ** 0.55 * (1 + 0.08 * Math.sin(i * 2.7));
    base.push({ x, y });
    tips.push({ x: x - h * 0.4, y: y + side * h });
  }
  const shape = [...base, ...[...tips].reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SKIN, 0.78);
  pen.clipped(shape, () => {
    const band = [...tips.map((p, i) => lerpPt(base[i]!, p, 0.95)), ...tips.map((p, i) => lerpPt(base[i]!, p, 0.7)).reverse()];
    pen.fill(band, SKIN_DEEP, 0.5);
  });
  base.forEach((b, i) => {
    if (i % 2) return;
    pen.hair([b, tips[i]!], 0.45, INK, 0.6);
  });
  pen.stroke(tips, 1, INK, 1, false);
}

// ---------------------------------------------------------------- the body

function drawBody(pen: Pen, ctx: CanvasRenderingContext2D): void {
  drawTail(pen);
  drawEdgeFin(pen, -4, -92, 24, -1);
  drawEdgeFin(pen, -60, -94, 16, 1);

  const body = [...OUTLINE];
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    // The wash, a touch off the line as watercolour is.
    ctx.translate(1.2, 0.9);
    pen.fill(body, SKIN, 0.92);
    ctx.translate(-1.2, -0.9);
    // Lit from above and in front; deeper orange round the back and the belly.
    const lit = ctx.createRadialGradient(40, -62, 6, 30, -40, 120);
    lit.addColorStop(0, 'rgba(255,246,214,0.55)');
    lit.addColorStop(1, 'rgba(255,246,214,0)');
    ctx.fillStyle = lit;
    ctx.fillRect(BOX.x0, BOX.y0, BOX.w, BOX.h);
    const low = ctx.createLinearGradient(0, -20, 0, 90);
    low.addColorStop(0, 'rgba(176,72,24,0)');
    low.addColorStop(1, 'rgba(176,72,24,0.42)');
    ctx.fillStyle = low;
    ctx.fillRect(BOX.x0, BOX.y0, BOX.w, BOX.h);
    const back = ctx.createLinearGradient(-100, 0, 10, 0);
    back.addColorStop(0, 'rgba(176,72,24,0.32)');
    back.addColorStop(1, 'rgba(176,72,24,0)');
    ctx.fillStyle = back;
    ctx.fillRect(BOX.x0, BOX.y0, BOX.w, BOX.h);
    // Painted blotches: deep orange and rust, then pale saddles over the back.
    const rng = createRng(4401);
    for (let i = 0; i < 16; i++) {
      const p = { x: -92 + rng() * 180, y: -90 + rng() * 170 };
      pen.fill(ellipse(p.x, p.y, 9 + rng() * 14, 6 + rng() * 10, 14), i % 3 ? SKIN_DEEP : RUST, i % 3 ? 0.3 : 0.2);
    }
    for (const [x, y, rx, ry] of [[-50, -70, 18, 9], [6, -82, 15, 8], [-18, 10, 14, 10], [44, 30, 12, 9], [-70, 22, 10, 12]] as const) {
      pen.fill(ellipse(x, y, rx, ry, 16), CREAM, 0.42);
    }
    // A few dark spots, each in a ring of deep orange.
    for (const [x, y, r] of [[-40, -40, 3.2], [-62, -8, 2.6], [10, -54, 2.4], [-14, 44, 2.8], [24, 6, 2.2], [-78, 36, 2.2], [70, 18, 2]] as const) {
      pen.fill(ellipse(x, y, r * 1.9, r * 1.7, 12), SKIN_DEEP, 0.55);
      pen.fill(ellipse(x, y, r, r * 0.9, 10), SPOT, 0.8);
    }
    // The eye's socket: a raised ring of skin.
    pen.fill(ellipse(EYE.x, EYE.y, EYE_R + 6, EYE_R + 5.5, 22), SKIN_DEEP, 0.45);
    pen.fill(ellipse(EYE.x - 1, EYE.y - 2, EYE_R + 3, EYE_R + 2, 22), CREAM, 0.35);
    pen.fill(ellipse(EYE.x, EYE.y, EYE_R + 0.5, EYE_R + 0.5, 22), '#2a120a', 0.85);
    // Shadow side: stipple thickening downwards and backwards, then hatching that follows the belly.
    pen.stipple(body, 3000, (x, y) => Math.max(0, (y + 10) / 120) * 0.6 + Math.max(0, (-x - 30) / 220), 0.4, SHADE);
    for (let r = 1; r <= 9; r++) {
      const row: Pt[] = [];
      for (let x = -88 + r * 2; x <= 86 - r * 3; x += 5) row.push({ x, y: edgesAt(x).bottom - r * 3.1 });
      pen.hair(row, 0.4, INK, 0.3 * (1 - r / 12));
    }
  });
  // Warts all over, bigger over the back; none on the lips or in the eye.
  const nearMouth = (p: Pt): boolean => p.x > HINGE.x - 4 && Math.abs(p.y - (HINGE.y + ((TIP.y - HINGE.y) * (p.x - HINGE.x)) / (TIP.x - HINGE.x))) < 4.5;
  warts(pen, body, 520, [1, 2.3], (p) => !nearMouth(p) && Math.hypot(p.x - EYE.x, p.y - EYE.y) > EYE_R + 2.5);
  warts(pen, body, 60, [2.4, 3.6], (p) => p.y < 10 && p.x < 40);
  // The eye's rim, inked.
  pen.hair([...ellipse(EYE.x, EYE.y, EYE_R + 1, EYE_R + 1, 22), { x: EYE.x + EYE_R + 1, y: EYE.y }], 0.7, INK, 0.9);
  for (let k = 0; k < 9; k++) {
    const a = -2.9 + k * 0.42;
    pen.dot(EYE.x + Math.cos(a) * (EYE_R + 4.5), EYE.y + Math.sin(a) * (EYE_R + 4), 1.3, CREAM, 0.8);
  }
  // The second spine, a fleshy stalk on the forehead, and the third, a hump behind it.
  const stalk = tube([{ x: 84, y: -70 }, { x: 81, y: -79 }, { x: 77, y: -86 }], 5.5, 3.6);
  pen.fill(stalk, SKIN, 1);
  pen.fill(stalk, SKIN_DEEP, 0.35);
  pen.stroke([...stalk, stalk[0]!], 0.8, INK, 1, false);
  tuft(pen, { x: 77, y: -86 }, { x: -0.4, y: -1 }, 5.5);
  for (const x of [38, 46, 54]) pen.hair([{ x, y: edgesAt(x).top + 2 }, { x: x - 3, y: edgesAt(x).top + 9 }], 0.6, INK, 0.6);
  // The gill opening: a small pore behind the arm.
  const pore = ellipse(-24, 44, 3.4, 2.5, 12);
  pen.fill(pore, '#2a120a', 0.9);
  pen.hair([...pore, pore[0]!], 0.5, CREAM, 0.7);
  // Skin flaps along the outline, and on the chin.
  for (let i = 4; i < OUTLINE.length; i += 9) {
    const p = OUTLINE[i]!;
    if (p.x > HINGE.x + 30 || p.x < TAIL_BASE_X + 8) continue;
    const q = OUTLINE[(i + 1) % OUTLINE.length]!;
    tuft(pen, p, { x: q.y - p.y, y: p.x - q.x }, 3.2 + pen.rng() * 2);
  }
  // The outline: heavier under the belly.
  const n = OUTLINE.length;
  const half = Math.floor(n / 2);
  pen.stroke(OUTLINE.slice(0, half + 1), 2, INK);
  pen.stroke([...OUTLINE.slice(half), OUTLINE[0]!], 2.5, INK);
}

// ---------------------------------------------------------------- the limbs

/** Through `a` and `c` with a rounded corner at `b`. */
function elbowLine(a: Pt, b: Pt, c: Pt): Pt[] {
  const near = (p: Pt, q: Pt, u: number): Pt => lerpPt(p, q, u);
  return [...quad(a, near(a, b, 0.6), near(b, c, 0.0), 6).slice(0, -1), ...quad(near(a, b, 0.82), b, near(b, c, 0.25), 6), ...quad(near(b, c, 0.25), near(b, c, 0.6), c, 6).slice(1)];
}

function drawArm(pen: Pen, a: Arm, far: boolean): void {
  const line = elbowLine(a.shoulder, a.elbow, a.wrist);
  // The hand: a fan of fin rays splayed on the sand like fingers, each with a rounded tip.
  const fingers = 7;
  const tips = Array.from({ length: fingers }, (_, k) => {
    const p = lerpPt(a.hand[0], a.hand[1], k / (fingers - 1));
    return { x: p.x, y: p.y + 1.2 * Math.sin(k * 2.1) };
  });
  const span = Math.hypot(a.hand[1].x - a.hand[0].x, a.hand[1].y - a.hand[0].y) / (fingers - 1);
  // Round finger tips with notches between them.
  const fan: Pt[] = [a.wrist, lerpPt(a.wrist, tips[0]!, 0.7)];
  tips.forEach((p, k) => {
    fan.push(p);
    const next = tips[k + 1];
    if (next) fan.push(lerpPt(a.wrist, lerpPt(p, next, 0.5), 0.88));
  });
  fan.push(lerpPt(a.wrist, tips[fingers - 1]!, 0.7));
  pen.fill(fan, PAPER_FILL, 1);
  pen.fill(fan, SKIN, 0.85);
  pen.clipped(fan, () => {
    pen.fill(ellipse(a.wrist.x, a.wrist.y, span * 1.6, span * 1.1, 14), CREAM, 0.35);
    pen.stipple(fan, 260, (_x, y) => (y - a.wrist.y) / 14, 0.35, SHADE);
  });
  for (const p of tips) pen.hair([a.wrist, lerpPt(a.wrist, p, 0.5), p], 0.5, INK, 0.7);
  pen.stroke(fan.slice(1), 1, INK, 1, false);
  if (far) pen.fill(fan, SHADE, 0.3);
  // The arm: a fleshy tube from inside the body, shaded underneath, warty; no line where it leaves the body.
  const arm = tube(line, a.width, a.width * 0.6);
  pen.fill(arm, PAPER_FILL, 1);
  pen.fill(arm, SKIN, 0.92);
  pen.clipped(arm, () => {
    pen.fill(tube(line.map((p) => ({ x: p.x + 2.5, y: p.y + 1.5 })), a.width * 0.8, a.width * 0.5), SKIN_DEEP, 0.45);
    pen.stipple(arm, 500, () => 0.45, 0.35, SHADE);
    pen.fill(tube(line.map((p) => ({ x: p.x - 2, y: p.y - 1 })), a.width * 0.35, a.width * 0.2), CREAM, 0.45);
  });
  warts(pen, arm, 50, [0.8, 1.6]);
  const half = arm.length / 2;
  const sideA = arm.slice(2, half);
  const sideB = arm.slice(half, arm.length - 2);
  pen.stroke(sideA, 1.25, INK, 1, false);
  pen.stroke(sideB, 1.25, INK, 1, false);
  if (far) pen.fill(arm, SHADE, 0.3);
}

// ---------------------------------------------------------------- drawing it

const stamp = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
  ctx.save();
  ctx.scale(1 / RES, 1 / RES);
  ctx.drawImage(canvas, BOX.x0 * RES, BOX.y0 * RES);
  ctx.restore();
};

/** The body cut into columns: mouth open, throat and belly ballooned. */
function drawColumns(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, look: FrogLook): void {
  if (look.jaw <= 0.002 && look.throat <= 0.002 && look.belly <= 0.002) {
    stamp(ctx, canvas);
    return;
  }
  const step = 1.5;
  const bottom = BOX.y0 + BOX.h;
  for (let sx = 0; sx < canvas.width; sx += step) {
    const x = BOX.x0 + (sx + step / 2) / RES;
    const c = columnAt(look, x);
    const cutPx = Math.max(0, Math.min(canvas.height, (c.cut - BOX.y0) * RES));
    const dx = BOX.x0 + sx / RES;
    const w = (step + 0.9) / RES;
    const upperH = (c.cut - BOX.y0) * c.upperScale;
    ctx.drawImage(canvas, sx, 0, step, cutPx, dx, c.cut - upperH - c.up, w, upperH);
    ctx.drawImage(canvas, sx, cutPx, step, canvas.height - cutPx, dx, c.cut + c.down, w, (bottom - c.cut) * c.lowerScale);
  }
}

function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The inside of the open mouth: pink at the lips, dark down the throat, the gill arches showing. */
function drawMouthInside(ctx: CanvasRenderingContext2D, lips: Lips, boil: number): void {
  if (lips.height < 1.5) return;
  const shape = mouthShape(lips);
  ctx.save();
  pathOf(ctx, shape);
  const g = ctx.createLinearGradient(HINGE.x, HINGE.y, lips.mid.x, lips.mid.y);
  g.addColorStop(0, '#120504');
  g.addColorStop(0.45, '#4a1512');
  g.addColorStop(1, '#b4544a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const pen = new Pen(ctx, 5501 + boil * 977, 0.35);
  // The gill arches: pale curved ridges at the back of the throat.
  for (let k = 0; k < 4; k++) {
    const x = HINGE.x + 6 + k * 6;
    const top = lips.upper[Math.min(lips.upper.length - 1, 2 + k * 2)]!.y;
    const bot = lips.lower[Math.min(lips.lower.length - 1, 2 + k * 2)]!.y;
    pen.hair(quad({ x, y: top + 3 }, { x: x - 5 - k, y: (top + bot) / 2 }, { x, y: bot - 3 }, 8), 1.1, '#e08a7c', 0.45);
  }
  // The floor of the mouth, a paler tongue.
  const lo = lips.lower[Math.round(lips.lower.length * 0.65)]!;
  pen.fill(ellipse(lo.x, lo.y - lips.height * 0.12, lips.height * 0.26, lips.height * 0.1, 14), '#e3958a', 0.5);
  ctx.restore();
}

/** Darkness deepening towards the corner of the mouth, over whatever is going in. */
function drawThroatShadow(ctx: CanvasRenderingContext2D, lips: Lips): void {
  if (lips.height < 1.5) return;
  ctx.save();
  pathOf(ctx, mouthShape(lips));
  const g = ctx.createLinearGradient(HINGE.x, HINGE.y, lips.mid.x, lips.mid.y);
  g.addColorStop(0, 'rgba(18,5,4,1)');
  g.addColorStop(0.5, 'rgba(40,10,8,0.75)');
  g.addColorStop(0.85, 'rgba(60,16,12,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** Fleshy lips along the cut, inked. */
function drawLips(ctx: CanvasRenderingContext2D, lips: Lips, boil: number): void {
  const pen = new Pen(ctx, 3301 + boil * 977, 0.3);
  const open = Math.min(1, lips.height / 14);
  // Shut: one inked line with a fleshy ridge of lower lip under it, lit above.
  if (open < 1) {
    const shut = 1 - open;
    pen.stroke(lips.lower.map((p, i) => ({ x: p.x, y: p.y + 2.6 * Math.sin((Math.PI * i) / (lips.lower.length - 1)) ** 0.5 })), 3.2, SKIN_DEEP, 0.75 * shut, false);
    pen.hair(lips.upper.map((p) => ({ x: p.x, y: p.y - 2 })), 1, CREAM, 0.55 * shut);
    pen.stroke(lips.lower, 1.6, INK, shut, false);
  }
  if (open > 0) {
    pen.stroke(lips.lower, 4.2, LIP, 0.95 * open, false);
    pen.stroke(lips.upper, 3.4, LIP, 0.95 * open, false);
    pen.hair(lips.upper.map((p) => ({ x: p.x, y: p.y - 1.6 })), 0.9, CREAM, 0.6 * open);
    pen.stroke(lips.lower.map((p) => ({ x: p.x, y: p.y + 1.6 })), 1.5, INK, open, false);
    pen.stroke(lips.upper.map((p) => ({ x: p.x, y: p.y - 1.4 })), 1.3, INK, open, false);
    // The lips' inner edges, and tiny teeth.
    pen.hair(lips.upper.map((p) => ({ x: p.x, y: p.y + 1.6 })), 0.7, INK, 0.8 * open);
    pen.hair(lips.lower.map((p) => ({ x: p.x, y: p.y - 2 })), 0.7, INK, 0.8 * open);
    for (let i = 6; i < lips.upper.length; i += 2) {
      const u = lips.upper[i]!;
      const l = lips.lower[i]!;
      pen.fill([{ x: u.x - 0.8, y: u.y + 1.5 }, { x: u.x, y: u.y + 3.6 * open }, { x: u.x + 0.8, y: u.y + 1.5 }], PAPER_FILL, 0.9 * open);
      pen.fill([{ x: l.x - 0.8, y: l.y - 2 }, { x: l.x, y: l.y - 4.2 * open }, { x: l.x + 0.8, y: l.y - 2 }], PAPER_FILL, 0.9 * open);
    }
  }
  // The corner of the mouth: a crease turning down.
  const c = lips.upper[0]!;
  pen.stroke(quad({ x: c.x + 2, y: c.y }, { x: c.x - 3, y: c.y + 0.5 }, { x: c.x - 6, y: c.y + 5 }, 5), 1.2, INK, 0.9, false);
}

/** Its face: lids down (0 open .. 1 shut), pupils looking (-1 .. 1 each way), squeezed shut happily, or the pupil small with shock. */
export interface FrogFace {
  readonly lid: number;
  readonly look: Pt;
  readonly happy: number;
  readonly pupil: number;
}

function drawEye(ctx: CanvasRenderingContext2D, at: Pt, face: FrogFace, boil: number): void {
  const pen = new Pen(ctx, 7101 + boil * 977, 0.25);
  const r = EYE_R;
  const ball = ellipse(at.x, at.y, r, r, 26);
  if (face.happy > 0.5) {
    // Squeezed shut in a grin: skin over the eye and a curved line.
    pen.fill(ellipse(at.x, at.y, r + 0.5, r + 0.5, 22), SKIN, 1);
    pen.fill(ellipse(at.x, at.y + 2, r, r * 0.7, 22), SKIN_DEEP, 0.4);
    pen.stroke(quad({ x: at.x - r * 0.8, y: at.y + 2 }, { x: at.x, y: at.y - r * 0.75 }, { x: at.x + r * 0.8, y: at.y + 2 }, 10), 1.8, INK, 1, false);
    return;
  }
  pen.fill(ball, '#f6dc8a', 1);
  pen.clipped(ball, () => {
    // A golden iris, ringed darker, with fine radial lines.
    pen.fill(ellipse(at.x, at.y, r, r, 24), '#d99a33', 0.55);
    pen.fill(ellipse(at.x + 1, at.y + 2, r, r, 24), '#9a5a1c', 0.3);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      pen.hair([{ x: at.x + Math.cos(a) * r * 0.45, y: at.y + Math.sin(a) * r * 0.45 }, { x: at.x + Math.cos(a) * r * 0.95, y: at.y + Math.sin(a) * r * 0.95 }], 0.3, '#7a3f12', 0.6);
    }
    const p = { x: at.x + face.look.x * r * 0.38, y: at.y + face.look.y * r * 0.34 };
    const pr = r * 0.5 * face.pupil;
    pen.fill(ellipse(p.x, p.y, pr, pr * 0.92, 18), '#120806', 1);
    pen.fill(ellipse(p.x - pr * 0.35, p.y - pr * 0.4, Math.max(0.8, pr * 0.3), Math.max(0.8, pr * 0.26), 10), '#fffaf0', 0.95);
    if (face.lid > 0.01) {
      // The upper lid: warty skin coming down, its edge inked.
      const edge = at.y - r + 2 * r * face.lid;
      const lidShape = [{ x: at.x - r - 2, y: at.y - r - 2 }, { x: at.x + r + 2, y: at.y - r - 2 }, { x: at.x + r + 2, y: edge }, ...quad({ x: at.x + r + 2, y: edge }, { x: at.x, y: edge + 2.5 }, { x: at.x - r - 2, y: edge }, 10)];
      pen.fill(lidShape, SKIN, 1);
      pen.fill(lidShape, SKIN_DEEP, 0.3);
      pen.stroke(quad({ x: at.x + r, y: edge }, { x: at.x, y: edge + 2.5 }, { x: at.x - r, y: edge }, 10), 1.2, INK, 1, false);
    }
  });
  pen.stroke([...ball, ball[0]!], 1.1, INK, 1, false);
}

/** The rod: its angle (radians, 0 pointing forwards, -π/2 up), how much it bows, and the bait's wiggle phase. */
export interface Rod {
  readonly angle: number;
  readonly bend: number;
  readonly wiggle: number;
}

/** The rod's tip (where the bait hangs), fp, for the frog at `look`. */
export function baitAt(look: FrogLook, rod: Rod): Pt {
  const root = mapPt(look, ROD_ROOT);
  return { x: root.x + Math.cos(rod.angle) * ROD_LEN, y: root.y + Math.sin(rod.angle) * ROD_LEN };
}

function drawRod(ctx: CanvasRenderingContext2D, look: FrogLook, rod: Rod, boil: number): void {
  const pen = new Pen(ctx, 8101 + boil * 977, 0.25);
  const root = mapPt(look, ROD_ROOT);
  const tip = baitAt(look, rod);
  const mid = { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 };
  const nx = -(tip.y - root.y) / ROD_LEN;
  const ny = (tip.x - root.x) / ROD_LEN;
  const line = quad(root, { x: mid.x + nx * rod.bend, y: mid.y + ny * rod.bend }, tip, 14);
  pen.stroke(line, 2.6, INK, 1, false);
  // Banded, as the real rod is.
  for (let i = 2; i < line.length - 1; i += 3) pen.hair([line[i]!, line[i + 1]!], 1.4, CREAM, 0.85);
  // The bait: a fleshy pink lure with little streamers that wave.
  const dir = Math.atan2(tip.y - line[12]!.y, tip.x - line[12]!.x);
  const c = { x: tip.x + Math.cos(dir) * 5.5, y: tip.y + Math.sin(dir) * 5.5 };
  for (let k = 0; k < 5; k++) {
    const a = dir + Math.PI + (k - 2) * 0.42;
    const len = 12 + (k % 2) * 5;
    const wave = 3.2 * Math.sin(rod.wiggle * 1.7 + k * 1.3);
    const end = { x: c.x + Math.cos(a) * len - Math.sin(a) * wave, y: c.y + Math.sin(a) * len + Math.cos(a) * wave };
    const ctl = { x: c.x + Math.cos(a) * len * 0.5 + Math.sin(a) * wave, y: c.y + Math.sin(a) * len * 0.5 - Math.cos(a) * wave };
    pen.stroke(quad(c, ctl, end, 6), 1.7, BAIT, 0.95, false);
    pen.hair(quad(c, ctl, end, 6), 0.35, INK, 0.7);
  }
  const blob = ellipse(c.x, c.y, 8.4, 6.2, 16).map((p) => ({
    x: c.x + (p.x - c.x) * Math.cos(dir) - (p.y - c.y) * Math.sin(dir),
    y: c.y + (p.x - c.x) * Math.sin(dir) + (p.y - c.y) * Math.cos(dir),
  }));
  pen.fill(blob, BAIT, 1);
  pen.fill(ellipse(c.x - 2, c.y - 2.2, 3.5, 2.4, 10), '#ffe2e6', 0.85);
  pen.dot(c.x + 2.4, c.y + 1.4, 1.2, '#b8404e', 0.8);
  pen.dot(c.x - 0.8, c.y + 2.8, 0.9, '#b8404e', 0.7);
  pen.dot(c.x + 4, c.y - 1.5, 0.8, '#b8404e', 0.6);
  pen.stroke([...blob, blob[0]!], 0.8, INK, 1, false);
}

/** Everything about the frog for one frame. */
export interface FrogDraw {
  readonly look: FrogLook;
  readonly face: FrogFace;
  readonly rod: Rod;
  readonly boil: number;
}

/** Behind whatever goes in: the far limbs and the inside of the mouth. */
export function drawFrogBack(ctx: CanvasRenderingContext2D, s: FrogSprites, d: FrogDraw): void {
  stamp(ctx, s.back[d.boil % s.back.length]!);
  drawMouthInside(ctx, lipsOf(d.look), d.boil);
}

/** Clips to what is in front of the mouth: the opening between the lips and all the water ahead of it. Call inside save/restore. */
export function clipToMouth(ctx: CanvasRenderingContext2D, look: FrogLook): void {
  const lips = lipsOf(look);
  const far = 4000;
  const top = lips.upper[lips.upper.length - 1]!;
  const bottom = lips.lower[lips.lower.length - 1]!;
  ctx.beginPath();
  lips.upper.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.lineTo(top.x + 2, -far);
  ctx.lineTo(far, -far);
  ctx.lineTo(far, far);
  ctx.lineTo(bottom.x + 2, far);
  [...lips.lower].reverse().forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.clip();
}

/** In front of whatever goes in: the throat's shadow, the body, the near limbs, the lips, the eye and the rod. */
export function drawFrogFront(ctx: CanvasRenderingContext2D, s: FrogSprites, d: FrogDraw): void {
  const lips = lipsOf(d.look);
  drawThroatShadow(ctx, lips);
  drawColumns(ctx, s.body[d.boil % s.body.length]!, d.look);
  stamp(ctx, s.front[d.boil % s.front.length]!);
  drawLips(ctx, lips, d.boil);
  drawEye(ctx, mapPt(d.look, EYE), d.face, d.boil);
  drawRod(ctx, d.look, d.rod, d.boil);
}

export { GROUND_Y };
