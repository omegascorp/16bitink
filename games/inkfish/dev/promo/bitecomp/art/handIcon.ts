import { INK, PAPER } from '../../../../src/art/pen';

/**
 * Flat silhouette icons for the "fits in one hand" beats, in the style of the
 * cut-ins' other simple shapes: a cupped hand palm up seen from the thumb
 * side, a whole red-bellied piranha in profile, and the two together. One
 * opaque fill each; parts are told apart by thin paper-coloured gaps.
 */

export const HAND_SLATE = '#3a3f45';

type Pt = readonly [number, number];

export interface HandIconOpts {
  /** The middle of the palm's hollow, where a held thing rests. */
  x: number;
  y: number;
  /** Wrist to fingertip, px. */
  size: number;
  angle?: number;
  /** Mirror left-right (the arm then comes from the right). */
  flipX?: boolean;
  /** Mirror top-bottom: palm down, the fingers curling down over something. */
  flipY?: boolean;
  fill?: string;
  /** The gap and outline colour. */
  paper?: string;
  /** How far the fingers curl, 0 = flat .. 1 = a tight cup. */
  curl?: number;
}

/** A tapered limb along a spine with a round tip: the base end is left open (it hides in the palm). */
function limbPath(ctx: CanvasRenderingContext2D, spine: readonly Pt[], half: readonly number[]): void {
  const n = spine.length;
  const dirs = spine.map((_, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len] as const;
  });
  const side = (sgn: number): Pt[] => spine.map((p, i) => [p[0] - dirs[i]![1] * half[i]! * sgn, p[1] + dirs[i]![0] * half[i]! * sgn] as const);
  const left = side(1);
  const right = side(-1).reverse();
  const through = (pts: Pt[]): void => {
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    const last = pts[pts.length - 1]!;
    ctx.lineTo(last[0], last[1]);
  };
  ctx.moveTo(left[0]![0], left[0]![1]);
  through(left);
  const tip = spine[n - 1]!;
  const d = dirs[n - 1]!;
  const a = Math.atan2(d[1], d[0]);
  ctx.arc(tip[0], tip[1], half[n - 1]!, a + Math.PI / 2, a - Math.PI / 2, true);
  through(right);
  ctx.closePath();
}

/** A finger's spine from its knuckle: three bones, each bent `bend` further up than the last. */
function fingerSpine(base: Pt, start: number, bend: number, len: number): Pt[] {
  const bones = [0.47, 0.29, 0.24];
  const pts: Pt[] = [base];
  let [x, y] = base;
  let a = start;
  for (const b of bones) {
    // Two points per bone keep the outline smooth through the joints.
    for (const f of [0.5, 0.5]) {
      x += Math.cos(a) * b * len * f;
      y += Math.sin(a) * b * len * f;
      pts.push([x, y]);
    }
    a -= bend * (pts.length < 4 ? 0.8 : 1.2);
  }
  return pts;
}

interface HandParts {
  fingers: { spine: Pt[]; half: number[] }[];
  /** Forearm, palm and thumb as one outline: the thumb grows out of the palm's heel. */
  palm: (ctx: CanvasRenderingContext2D) => void;
}

/** The hand in units of its size, fingers to +x, palm up (y down). */
function handParts(curl: number): HandParts {
  const bend = 0.3 + 0.36 * curl;
  // Back to front: little, ring, middle, index. Each fans a little higher than the one in front.
  const fingers = [
    { base: [0.08, 0.13] as Pt, start: -0.4, len: 0.37, w: 0.045 },
    { base: [0.09, 0.145] as Pt, start: -0.27, len: 0.46, w: 0.049 },
    { base: [0.09, 0.16] as Pt, start: -0.14, len: 0.5, w: 0.051 },
    { base: [0.07, 0.172] as Pt, start: -0.02, len: 0.46, w: 0.053 },
  ].map(({ base, start, len, w }) => {
    const spine = fingerSpine(base, start, bend, len);
    const half = spine.map((_, i) => w * (1 - 0.24 * (i / (spine.length - 1))));
    return { spine, half };
  });
  const palm = (ctx: CanvasRenderingContext2D): void => {
    ctx.moveTo(-1.0, 0.86);
    // Underside of the forearm up to the wrist, then the back of the hand out to the knuckles.
    ctx.bezierCurveTo(-0.76, 0.6, -0.52, 0.4, -0.36, 0.31);
    ctx.bezierCurveTo(-0.2, 0.24, 0.0, 0.25, 0.2, 0.206);
    ctx.bezierCurveTo(0.27, 0.19, 0.3, 0.11, 0.25, 0.072);
    // The palm's cradle, dipping under the held thing to the root of the thumb.
    ctx.bezierCurveTo(0.17, 0.068, 0.06, 0.08, -0.01, 0.07);
    // The thumb: shorter and thicker than the fingers, leaning in over the held thing.
    ctx.bezierCurveTo(0.0, 0.03, 0.025, -0.01, 0.04, -0.035);
    ctx.bezierCurveTo(0.058, -0.075, 0.025, -0.115, -0.02, -0.1);
    ctx.bezierCurveTo(-0.065, -0.085, -0.11, -0.03, -0.15, 0.02);
    // The thumb's mound into the wrist, and the forearm's top back out of frame.
    ctx.bezierCurveTo(-0.2, 0.06, -0.27, 0.1, -0.36, 0.13);
    ctx.bezierCurveTo(-0.56, 0.2, -0.86, 0.42, -1.16, 0.66);
    ctx.closePath();
  };
  return { fingers, palm };
}

function placed(ctx: CanvasRenderingContext2D, o: HandIconOpts): void {
  ctx.translate(o.x, o.y);
  ctx.rotate(o.angle ?? 0);
  ctx.scale((o.flipX ? -1 : 1) * o.size, (o.flipY ? -1 : 1) * o.size);
}

/** The hand alone: forearm, palm and thumb as one shape, the fingers fanned behind it. */
export function drawHandSilhouette(ctx: CanvasRenderingContext2D, o: HandIconOpts): void {
  const fill = o.fill ?? HAND_SLATE;
  const paper = o.paper ?? PAPER;
  const parts = handParts(o.curl ?? 0.6);
  const gap = 0.014;
  const outline = (draw: () => void, width: number): void => {
    ctx.beginPath();
    draw();
    ctx.lineWidth = width;
    ctx.strokeStyle = paper;
    ctx.stroke();
  };
  const solid = (draw: () => void): void => {
    ctx.beginPath();
    draw();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.save();
  placed(ctx, o);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // A paper rim round the whole hand, so it parts cleanly from whatever it holds or covers.
  outline(() => parts.palm(ctx), gap * 2.6);
  for (const f of parts.fingers) outline(() => limbPath(ctx, f.spine, f.half), gap * 2.6);
  // Each finger cuts a thin paper gap into the one behind it; the palm then covers their roots.
  for (const f of parts.fingers) {
    outline(() => limbPath(ctx, f.spine, f.half), gap);
    solid(() => limbPath(ctx, f.spine, f.half));
  }
  solid(() => parts.palm(ctx));
  ctx.restore();
}

export interface PiranhaIconOpts {
  /** The middle of the body. */
  x: number;
  y: number;
  /** Tail tip to jaw tip, px. */
  size: number;
  /** Lower jaw open, 0 = shut (teeth still show) .. 1 = wide. */
  jaw?: number;
  angle?: number;
  fill?: string;
  paper?: string;
}

function piranhaBody(ctx: CanvasRenderingContext2D): void {
  // Tail: a short, slightly forked fan off a narrow wrist.
  ctx.moveTo(-0.29, -0.055);
  ctx.bezierCurveTo(-0.36, -0.09, -0.43, -0.16, -0.49, -0.22);
  ctx.bezierCurveTo(-0.51, -0.14, -0.47, -0.05, -0.445, 0);
  ctx.bezierCurveTo(-0.47, 0.05, -0.51, 0.14, -0.49, 0.22);
  ctx.bezierCurveTo(-0.43, 0.16, -0.36, 0.09, -0.29, 0.055);
  // Belly from the tail wrist: the anal fin's long base, then the deep round belly up to the throat.
  ctx.bezierCurveTo(-0.24, 0.09, -0.14, 0.2, -0.02, 0.27);
  ctx.bezierCurveTo(0.1, 0.31, 0.22, 0.27, 0.3, 0.16);
  // The throat under the lower jaw's hinge.
  ctx.lineTo(0.27, 0.075);
  // The upper jaw's edge out to the blunt snout.
  ctx.lineTo(0.43, 0.035);
  // Blunt rounded head, steep forehead up to the humped back.
  ctx.bezierCurveTo(0.45, -0.02, 0.44, -0.1, 0.38, -0.17);
  ctx.bezierCurveTo(0.3, -0.26, 0.14, -0.31, 0.02, -0.3);
  ctx.bezierCurveTo(-0.12, -0.28, -0.24, -0.13, -0.29, -0.055);
  ctx.closePath();
}

function piranhaFins(ctx: CanvasRenderingContext2D): void {
  // Dorsal: a rounded sail mid-back.
  ctx.moveTo(0.04, -0.29);
  ctx.bezierCurveTo(0.0, -0.37, -0.06, -0.4, -0.12, -0.39);
  ctx.bezierCurveTo(-0.17, -0.38, -0.18, -0.3, -0.18, -0.21);
  ctx.closePath();
  // Adipose: a small lobe on the back just before the tail.
  ctx.moveTo(-0.22, -0.13);
  ctx.bezierCurveTo(-0.24, -0.19, -0.28, -0.19, -0.29, -0.15);
  ctx.lineTo(-0.27, -0.08);
  ctx.closePath();
  // Anal: long based, its tip swept back.
  ctx.moveTo(-0.04, 0.26);
  ctx.bezierCurveTo(-0.1, 0.33, -0.2, 0.3, -0.27, 0.2);
  ctx.lineTo(-0.27, 0.07);
  ctx.closePath();
}

/** The lower jaw about its hinge: an underbite that juts past the snout. */
function piranhaJaw(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(0.26, 0.07);
  ctx.lineTo(0.46, 0.035);
  ctx.bezierCurveTo(0.48, 0.07, 0.45, 0.12, 0.38, 0.15);
  ctx.bezierCurveTo(0.34, 0.165, 0.3, 0.165, 0.27, 0.15);
  ctx.closePath();
}

/** Triangular teeth along an edge from a to b, pointing `dir` (+1 down, -1 up). */
function teeth(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, count: number, h: number, dir: number): void {
  for (let i = 0; i < count; i++) {
    const t0 = (i + 0.1) / count;
    const t1 = (i + 0.9) / count;
    const tm = (t0 + t1) / 2;
    const at = (t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const p0 = at(t0);
    const p1 = at(t1);
    const pm = at(tm);
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(pm[0], pm[1] + h * dir);
    ctx.lineTo(p1[0], p1[1]);
    ctx.closePath();
  }
}

/** A whole red-bellied piranha in profile, facing right. */
export function drawPiranhaSilhouette(ctx: CanvasRenderingContext2D, o: PiranhaIconOpts): void {
  const fill = o.fill ?? INK;
  const paper = o.paper ?? PAPER;
  const open = 0.34 + 0.3 * Math.max(0, Math.min(1, o.jaw ?? 0));
  const hinge: Pt = [0.27, 0.07];
  const withJaw = (draw: () => void): void => {
    ctx.save();
    ctx.translate(hinge[0], hinge[1]);
    ctx.rotate(open);
    ctx.translate(-hinge[0], -hinge[1]);
    draw();
    ctx.restore();
  };
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.angle ?? 0);
  ctx.scale(o.size, o.size);
  ctx.lineJoin = 'round';
  // Paper rim first, so the fish parts from what is behind it.
  ctx.strokeStyle = paper;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  piranhaBody(ctx);
  piranhaFins(ctx);
  ctx.stroke();
  withJaw(() => {
    ctx.beginPath();
    piranhaJaw(ctx);
    ctx.stroke();
  });
  // The open mouth reads as a paper wedge between the jaws.
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(hinge[0] - 0.01, hinge[1]);
  ctx.lineTo(0.47, 0.035);
  withJaw(() => ctx.lineTo(0.47, 0.035));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  piranhaFins(ctx);
  ctx.fill();
  ctx.beginPath();
  piranhaBody(ctx);
  teeth(ctx, [0.3, 0.064], [0.43, 0.037], 3, 0.085, 1);
  ctx.fill();
  withJaw(() => {
    ctx.beginPath();
    piranhaJaw(ctx);
    teeth(ctx, [0.29, 0.068], [0.455, 0.037], 3, 0.085, -1);
    ctx.fill();
  });
  // Gill cover and eye, cut in paper.
  ctx.strokeStyle = paper;
  ctx.lineWidth = 0.014;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.21, -0.17);
  ctx.bezierCurveTo(0.15, -0.08, 0.15, 0.06, 0.2, 0.16);
  ctx.stroke();
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.arc(0.32, -0.1, 0.036, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface FishInHandOpts {
  /** The palm's hollow. */
  x: number;
  y: number;
  /** The hand's size; the fish is drawn to fit it. */
  size: number;
  jaw?: number;
  paper?: string;
}

/** The piranha resting in the cupped hand, its belly in the palm and the thumb over its flank. */
export function drawPiranhaInHandIcon(ctx: CanvasRenderingContext2D, o: FishInHandOpts): void {
  const s = o.size;
  drawPiranhaSilhouette(ctx, { x: o.x + 0.03 * s, y: o.y - 0.12 * s, size: 0.56 * s, jaw: o.jaw, angle: -0.1, paper: o.paper });
  drawHandSilhouette(ctx, { x: o.x, y: o.y, size: s, paper: o.paper });
}
