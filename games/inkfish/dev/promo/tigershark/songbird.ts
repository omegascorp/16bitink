import { BOIL_FRAMES } from '../../../src/art/textures';
import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';

/**
 * A migrating songbird, a little yellow warbler, in the game's pen and wash
 * (after art/birdArt.ts, at a songbird's proportions): a round head with a
 * fine pointed bill and a pale eye-ring, an olive back over a yellow breast
 * streaked with rust, rounded wings of olive coverts and dusky flight
 * feathers edged in yellow, a notched tail. Facing right, in a box of
 * BIRD_BOX units. Poses: three of a flap ('up', 'mid', 'down') and 'float',
 * sitting low on the sea, soaked, its wings spread on the water.
 *
 * Also one of its feathers, for what's left when a bird vanishes.
 */

export const BIRD_BOX = { w: 110, h: 90 } as const;
/** The body's middle in the box: where a sprite is centred. */
export const BIRD_MID: Pt = { x: 56, y: 44 };
/** The sea's surface across the floating pose, box units. */
export const FLOAT_LINE = 49;

export type BirdPose = 'up' | 'mid' | 'down' | 'float';
export const BIRD_POSES: readonly BirdPose[] = ['up', 'mid', 'down', 'float'];

const PAPER_FILL = '#fffaf0';
const YELLOW = '#f0c93a';
const YELLOW_PALE = '#f8e27e';
const OLIVE = '#9a9234';
const OLIVE_DARK = '#686426';
const FLIGHT = '#504c2a';
const EDGE = '#efdc7a';
const STREAK = '#b4532c';
const BILL = '#4a4034';
const LEGS = '#a9846a';

function bez(p0: Pt, c: Pt, p1: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

interface Brush {
  readonly pen: Pen;
  /** Box units to canvas px. */
  readonly s: number;
  readonly P: (x: number, y: number) => Pt;
  readonly Q: (pts: readonly Pt[]) => Pt[];
}

/** The body's outline, box units: forehead, crown, nape, back, rump, under the tail, belly, breast, throat. */
function bodyShape(wet: boolean): Pt[] {
  const sag = wet ? 1.5 : 0;
  return [
    ...bez({ x: 81, y: 33 }, { x: 76.5, y: 23.5 - sag * 0.4 }, { x: 66, y: 27 }),
    ...bez({ x: 66, y: 27 }, { x: 52, y: 31 + sag }, { x: 34, y: 41 }),
    ...bez({ x: 34, y: 41 }, { x: 29, y: 44.5 }, { x: 33, y: 49 }, 5),
    ...bez({ x: 33, y: 49 }, { x: 50, y: 60 }, { x: 66, y: 52.5 }),
    ...bez({ x: 66, y: 52.5 }, { x: 77.5, y: 47.5 }, { x: 81, y: 38 }),
  ];
}

/** The rounded wing: `a` radians above straight back, `len` units long, `far` the one behind the body. */
function wing(b: Brush, shoulder: Pt, a: number, len: number, far: boolean, spread: number): void {
  const { pen, s, Q } = b;
  const d = { x: -Math.cos(a), y: -Math.sin(a) };
  const n = { x: d.y, y: -d.x };
  const at = (f: number, off: number): Pt => ({ x: shoulder.x + d.x * len * f + n.x * off, y: shoulder.y + d.y * len * f + n.y * off });
  const chord = (f: number): number => (13 + 3 * spread) * Math.pow(Math.max(0, 1 - f ** 2.4), 0.65) + 2.5;
  // Leading edge, bowed forward, from the shoulder past the wrist to the rounded tip.
  const lead = bez(at(0, -1), at(0.45, -3.5), at(1, 1.5), 12);
  // Trailing edge: ten feather points, primaries at the tip, secondaries towards the body.
  const trail: Pt[] = [];
  const points: { tip: Pt; base: Pt }[] = [];
  for (let i = 0; i <= 9; i++) {
    const f = 0.98 - i * 0.095;
    const tip = at(f, chord(f));
    const notch = at(f - 0.045, chord(f - 0.045) - 2.2);
    trail.push(tip, notch);
    points.push({ tip, base: at(Math.max(0.12, f - 0.32), chord(f) * 0.25) });
  }
  trail.push(at(0, chord(0) * 0.85));
  const shape = [...lead, ...trail];
  const alpha = far ? 0.72 : 1;
  pen.fill(Q(shape), PAPER_FILL, alpha);
  pen.fill(Q(shape), OLIVE, 0.85 * alpha);
  pen.clipped(Q(shape), () => {
    // The flight feathers, each its own long dusky feather with a pale outer edge, from the body out to the tip,
    // the outer ones over the inner.
    for (const p of [...points].reverse()) {
      const dx = p.tip.x - p.base.x;
      const dy = p.tip.y - p.base.y;
      const l = Math.hypot(dx, dy) || 1;
      const side = { x: -dy / l, y: dx / l };
      const wdt = 2.3;
      const feather = [
        { x: p.base.x + side.x * wdt, y: p.base.y + side.y * wdt },
        { x: p.tip.x + side.x * wdt * 0.6 - dx * 0.04, y: p.tip.y + side.y * wdt * 0.6 - dy * 0.04 },
        p.tip,
        { x: p.tip.x - side.x * wdt * 0.8 - dx * 0.05, y: p.tip.y - side.y * wdt * 0.8 - dy * 0.05 },
        { x: p.base.x - side.x * wdt, y: p.base.y - side.y * wdt },
      ];
      pen.fill(Q(feather), FLIGHT, 0.7 * alpha);
      pen.hair(Q([feather[0]!, feather[1]!, feather[2]!]), 0.6 * s, EDGE, 0.7 * alpha);
      pen.hair(Q([lerp(p.base, p.tip, 0.15), lerp(p.base, p.tip, 0.92)]), 0.3 * s, INK, 0.4 * alpha);
    }
    // Darker towards the tip, where the feathers overlap least.
    pen.fill(Q([at(0.72, -3), at(1.1, -3), at(1.1, 20), at(0.72, 20)]), FLIGHT, 0.25 * alpha);
    // Coverts: rows of small rounded feathers, the outer row tipped pale (the wing bars).
    for (const [f0, tipped] of [[0.08, false], [0.2, true], [0.34, true]] as const) {
      for (let k = 0; k < 6; k++) {
        const c = at(f0 + k * 0.045, 2.5 + k * 1.7 + (f0 > 0.3 ? 1.5 : 0));
        const r = 2.4 - k * 0.12;
        const cover = Array.from({ length: 9 }, (_, i) => {
          const ang = Math.atan2(n.y, n.x) - Math.PI / 2 + (i / 8) * Math.PI;
          return { x: c.x + Math.cos(ang) * r, y: c.y + Math.sin(ang) * r };
        });
        pen.fill(Q(cover), OLIVE, 0.6 * alpha);
        pen.hair(Q(cover), 0.45 * s, tipped ? EDGE : OLIVE_DARK, 0.85 * alpha);
      }
    }
    // Shade along the leading edge.
    pen.hair(Q(lead.map((p) => ({ x: p.x + n.x * 2, y: p.y + n.y * 2 }))), 0.5 * s, INK, 0.35 * alpha);
  });
  pen.stroke(Q([...shape, shape[0]!]), (far ? 0.9 : 1.15) * s, INK, far ? 0.75 : 1, false);
}

function tail(b: Brush, raise: number, fan: number): void {
  const { pen, s, Q } = b;
  const r = raise;
  const shape = [
    { x: 34, y: 42.5 },
    ...bez({ x: 30, y: 42 }, { x: 22, y: 40 - r * 0.5 - fan }, { x: 11, y: 39.5 - r - fan }, 6),
    { x: 13.5, y: 43.5 - r },
    { x: 10.5, y: 47.5 - r * 0.6 + fan },
    ...bez({ x: 12, y: 49 - r * 0.6 + fan }, { x: 22, y: 50 + fan * 0.5 }, { x: 33, y: 48.5 }, 6),
  ];
  pen.fill(Q(shape), PAPER_FILL, 1);
  pen.fill(Q(shape), OLIVE_DARK, 0.82);
  pen.clipped(Q(shape), () => {
    // Yellow inner webs, as a yellow warbler's tail shows in flight.
    pen.fill(Q([{ x: 33, y: 44 }, { x: 19, y: 43 - r * 0.7 }, { x: 19, y: 47 - r * 0.5 }, { x: 33, y: 47.5 }]), YELLOW, 0.55);
    for (const [ty, tx] of [[40.5, 11.5], [43, 12.5], [45.5, 11.5], [48, 12]] as const) {
      pen.hair(Q([{ x: 33, y: 45.5 }, { x: tx, y: ty - r * (ty < 45 ? 0.9 : 0.6) + (ty > 45 ? fan : -fan) * 0.6 }]), 0.45 * s, INK, 0.5);
    }
  });
  pen.stroke(Q([...shape, shape[0]!]), 1.05 * s, INK, 1, false);
}

function body(b: Brush, wet: boolean): void {
  const { pen, s, Q } = b;
  const shape = bodyShape(wet);
  pen.fill(Q(shape), PAPER_FILL, 1);
  pen.fill(Q(shape), YELLOW, wet ? 0.82 : 0.92);
  pen.clipped(Q(shape), () => {
    // The olive back and crown, laid on in thin washes so it fades into the yellow.
    for (let k = 0; k < 5; k++) {
      const dy = k * 1.8;
      pen.fill(Q([{ x: 90, y: 10 }, { x: 90, y: 30 + dy * 0.5 }, { x: 70, y: 31 + dy }, { x: 50, y: 37 + dy }, { x: 26, y: 45 + dy * 0.6 }, { x: 26, y: 10 }]), OLIVE, 0.2);
    }
    // A light breast, catching the sky.
    pen.fill(Q(ellipseUnits(66, 45, 8, 5)), YELLOW_PALE, 0.55);
    // Rusty streaks down the breast.
    for (const [x, y] of [[71, 43], [67, 46], [63, 49], [69, 49.5], [59, 51], [65, 52]] as const) {
      pen.hair(Q([{ x: x + 1.2, y: y - 1.6 }, { x: x - 0.8, y: y + 1.8 }]), 0.8 * s, STREAK, 0.6);
    }
    // Feather scallops along the back.
    for (const dy of [0, 3.2]) {
      for (let k = 0; k < 5; k++) {
        const p0 = { x: 62 - k * 5.5, y: 31 + k * 2.2 + dy };
        const p1 = { x: 57 - k * 5.5, y: 33.2 + k * 2.2 + dy };
        pen.hair(Q(bez(p0, { x: (p0.x + p1.x) / 2 - 0.8, y: (p0.y + p1.y) / 2 + 1.6 }, p1, 4)), 0.4 * s, OLIVE_DARK, 0.55);
      }
    }
    // The belly in shadow: contour hatching under it.
    for (let k = 0; k < 6; k++) {
      const off = k * 1.4;
      pen.hair(Q(bez({ x: 36, y: 46 + off * 0.4 }, { x: 50, y: 52 + off }, { x: 68, y: 47 + off }, 8)), 0.42 * s, INK, 0.18 + k * 0.04);
    }
    if (wet) {
      // Soaked: dark, clumped feathers on the head and back.
      pen.fill(Q(shape), '#5b5a3a', 0.18);
      for (const [x, y] of [[74, 27], [69, 28], [58, 31], [49, 35]] as const) {
        pen.hair(Q([{ x, y: y + 2 }, { x: x - 2.2, y: y - 1.6 }, { x: x - 3, y: y + 2.4 }]), 0.5 * s, INK, 0.7);
      }
    }
  });
  pen.stroke(Q([...shape.slice(0, 22)]), 1.25 * s, INK, 1, false);
  pen.stroke(Q([...shape.slice(21), shape[0]!]), 1.25 * s, INK, 1, false);
}

const ellipseUnits = (x: number, y: number, rx: number, ry: number): Pt[] => ellipse(x, y, rx, ry, 14);

function head(b: Brush, open: number): void {
  const { pen, s, Q } = b;
  // The bill: fine and pointed, the upper half darker, the gape between.
  const upper = [{ x: 80.2, y: 32.6 }, ...bez({ x: 84, y: 33 }, { x: 88.5, y: 34.2 }, { x: 90.5, y: 35.4 - open * 0.6 }, 4), { x: 81, y: 35.7 }];
  const lower = [{ x: 81, y: 35.7 + open * 0.4 }, { x: 89, y: 36 + open * 1.4 }, { x: 81.2, y: 38 + open }];
  pen.fill(Q(lower), '#8a7a62', 1);
  pen.fill(Q(upper), BILL, 1);
  pen.stroke(Q([...upper, upper[0]!]), 0.75 * s, INK, 1, false);
  pen.hair(Q(lower), 0.6 * s, INK, 0.9);
  // The eye: dark and round, a pale yellow ring, a glint.
  const ex = 74.3;
  const ey = 32.4;
  pen.fill(Q(ellipseUnits(ex, ey, 3, 2.9)), YELLOW_PALE, 0.95);
  pen.dot(ex * s, ey * s, 1.95 * s, INK);
  pen.dot((ex + 0.6) * s, (ey - 0.7) * s, 0.55 * s, PAPER_FILL);
  // A faint olive cheek, and the line of the crown.
  pen.hair(Q(bez({ x: 77, y: 36.5 }, { x: 73, y: 39 }, { x: 69, y: 36 }, 6)), 0.45 * s, OLIVE_DARK, 0.5);
}

function legs(b: Brush, dangle: number): void {
  const { pen, s, Q } = b;
  for (const dx of [0, 3]) {
    const knee = { x: 52 + dx, y: 53.5 };
    const foot = { x: 47 + dx + dangle * 2, y: 56.5 + dangle * 4 };
    pen.stroke(Q([knee, foot]), 0.8 * s, LEGS, 1, false);
    pen.hair(Q([foot, { x: foot.x + 2.4, y: foot.y + 0.8 }]), 0.5 * s, INK, 0.85);
    pen.hair(Q([foot, { x: foot.x - 1.8, y: foot.y + 1.2 }]), 0.5 * s, INK, 0.85);
  }
}

/** Wing angles (radians above straight back) for the far and near wing, and how wide each spreads. */
const WINGS: Readonly<Record<Exclude<BirdPose, 'float'>, { far: number; near: number; spread: number }>> = {
  up: { far: 1.42, near: 1.2, spread: 1 },
  mid: { far: 0.5, near: 0.22, spread: 0.6 },
  down: { far: -0.62, near: -0.95, spread: 0.4 },
};

/** One drawing of the songbird, filling a canvas of BIRD_BOX * `s` px. */
export function drawSongbird(ctx: CanvasRenderingContext2D, pose: BirdPose, s: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.32 * s);
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const b: Brush = { pen, s, P, Q: (pts) => pts.map((p) => P(p.x, p.y)) };
  if (pose === 'float') {
    // Sitting low in the water, wings spread out on it, soaked; drawn down to the waterline only.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, BIRD_BOX.w * s, FLOAT_LINE * s);
    ctx.clip();
    wing(b, { x: 61, y: 37 }, 0.08, 34, true, 0.9);
    tail(b, 4, 1.5);
    body(b, true);
    head(b, 0.8);
    wing(b, { x: 58, y: 39 }, -0.2, 38, false, 1);
    ctx.restore();
    return;
  }
  const w = WINGS[pose];
  wing(b, { x: 62, y: 35 }, w.far, 33, true, w.spread);
  tail(b, pose === 'up' ? 1.5 : 0, pose === 'down' ? 1 : 0.4);
  legs(b, pose === 'up' ? 0.6 : 0);
  body(b, false);
  head(b, pose === 'up' ? 0.6 : 0);
  wing(b, { x: 59, y: 37 }, w.near, 40, false, w.spread);
}

export interface BirdSprites {
  /** [pose][boil frame], each BIRD_BOX * res px. */
  readonly frames: Readonly<Record<BirdPose, readonly HTMLCanvasElement[]>>;
  readonly res: number;
}

export function makeBirdSprites(res: number): BirdSprites {
  const frames = Object.fromEntries(
    BIRD_POSES.map((pose, p) => [
      pose,
      Array.from({ length: BOIL_FRAMES }, (_, f) => {
        const { canvas, ctx } = makeCanvas(Math.ceil(BIRD_BOX.w * res), Math.ceil(BIRD_BOX.h * res));
        drawSongbird(ctx, pose, res, 503 + p * 71 + f * 389);
        return canvas;
      }),
    ]),
  ) as Record<BirdPose, HTMLCanvasElement[]>;
  return { frames, res };
}

/**
 * Draws the songbird with its body's middle at (x, y), `size` px across its
 * box, turned `tilt` radians (nose up), facing `facing`.
 */
export function drawBirdAt(
  ctx: CanvasRenderingContext2D, sprites: BirdSprites, pose: BirdPose, boil: number, x: number, y: number, size: number, tilt: number, facing: 1 | -1, alpha = 1,
): void {
  if (alpha <= 0) return;
  const frame = sprites.frames[pose][boil % BOIL_FRAMES]!;
  const k = size / BIRD_BOX.w;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.rotate(-tilt);
  ctx.drawImage(frame, -BIRD_MID.x * k, -BIRD_MID.y * k, BIRD_BOX.w * k, BIRD_BOX.h * k);
  ctx.restore();
}

// ---------------------------------------------------------------- a feather

export const FEATHER_BOX = { w: 64, h: 24 } as const;

/** A single contour feather, quill to the left, yellow at the base going olive to the tip, one split in its vane. */
export function drawFeather(ctx: CanvasRenderingContext2D, s: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.25 * s);
  const Q = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: p.x * s, y: p.y * s }));
  const shaft = bez({ x: 4, y: 14 }, { x: 30, y: 14 }, { x: 59, y: 9 }, 14);
  const at = (f: number): Pt => shaft[Math.round(f * (shaft.length - 1))]!;
  const upper = [at(0.18), ...bez({ x: 16, y: 7.5 }, { x: 40, y: 3 }, { x: 60, y: 6.5 }, 10), at(1)];
  const lower = [at(1), ...bez({ x: 60, y: 11.5 }, { x: 40, y: 21 }, { x: 14, y: 19 }, 10), at(0.15)];
  // The split: a notch in the lower vane.
  const split = [at(0.55), { x: 37, y: 18.5 }, { x: 33.5, y: 18.8 }];
  const vane = [...upper, ...lower.slice(1)];
  pen.fill(Q(vane), PAPER_FILL, 1);
  pen.fill(Q(vane), YELLOW, 0.75);
  pen.clipped(Q(vane), () => {
    pen.fill(Q([{ x: 34, y: 0 }, { x: 70, y: 0 }, { x: 70, y: 24 }, { x: 40, y: 24 }]), OLIVE, 0.55);
    pen.fill(Q([{ x: 50, y: 0 }, { x: 70, y: 0 }, { x: 70, y: 24 }, { x: 54, y: 24 }]), OLIVE_DARK, 0.45);
    // Barbs, slanting towards the tip.
    for (let i = 2; i < 30; i++) {
      const f = 0.16 + i * 0.029;
      const p = at(Math.min(1, f));
      pen.hair(Q([p, { x: p.x + 5.5, y: p.y - 9 }]), 0.32 * s, INK, 0.32);
      pen.hair(Q([p, { x: p.x + 5, y: p.y + 10 }]), 0.32 * s, INK, 0.32);
    }
  });
  // Cut the split out of the vane.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  pen.fill(Q(split), '#000', 1);
  ctx.restore();
  pen.stroke(Q(upper), 0.75 * s, INK, 0.9, false);
  pen.stroke(Q(lower), 0.75 * s, INK, 0.9, false);
  // Downy fluff at the base, then the quill.
  for (let k = 0; k < 5; k++) {
    const base = at(0.1 + k * 0.025);
    pen.hair(Q(bez(base, { x: base.x - 2, y: base.y + (k % 2 ? 5 : -5) }, { x: base.x + 2.5, y: base.y + (k % 2 ? 7 : -6) }, 5)), 0.35 * s, INK, 0.45);
  }
  pen.stroke(Q(shaft), 0.95 * s, '#3f3a2a', 1, false);
}

export function makeFeatherFrames(res: number): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(FEATHER_BOX.w * res), Math.ceil(FEATHER_BOX.h * res));
    drawFeather(ctx, res, 911 + f * 157);
    return canvas;
  });
}

/** The feather centred at (x, y), `size` px long, turned `tilt` radians. */
export function drawFeatherAt(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], boil: number, x: number, y: number, size: number, tilt: number, alpha = 1): void {
  if (alpha <= 0) return;
  const frame = frames[boil % frames.length]!;
  const k = size / FEATHER_BOX.w;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(-tilt);
  ctx.drawImage(frame, -FEATHER_BOX.w * k * 0.5, -FEATHER_BOX.h * k * 0.5, FEATHER_BOX.w * k, FEATHER_BOX.h * k);
  ctx.restore();
}
