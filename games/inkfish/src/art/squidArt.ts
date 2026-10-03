import { bezier, PAPER_FILL } from './fish/kit';
import { ellipse, INK, Pen, type Pt } from './pen';
import { CLUB_LENGTH, LIMBS, limbPoints, REST_POSE, SQUID_BODY, type LimbKind } from './squidPose';

/**
 * The giant squid, the last giant, in the same pen and ink as the fish. It
 * is drawn in parts so it can move: the body (mantle and head), one arm and
 * one tentacle (straight, for the game to bend along a curve), a fin, and the
 * pupil of its huge eye. The whole animal in a resting pose is the portrait
 * used by the fish guide and the end screens.
 *
 * Body px are the same scale as a fish texture; see art/squidPose.ts for the
 * layout (origin at the body's centre, arms to the right).
 */
export const SQUID_ID = 'giantsquid';
export const isSquid = (shape: string): boolean => shape === SQUID_ID;

export const SQUID_TEX = {
  body: { w: 272, h: 128 },
  /** Limbs are drawn straight along the texture, root on the left. */
  limb: { w: 200, h: 24 },
  fin: { w: 76, h: 48 },
  pupil: { w: 24, h: 24 },
  portrait: { w: 512, h: 256 },
} as const;
/** Where the body's centre sits in the portrait. */
const PORTRAIT_CENTRE = { x: 150, y: 128 } as const;
/** Where a fin's root meets the mantle (body px), and the fin image's own origin. */
export const FIN = { x: -96, origin: { x: 0.45, y: 0.94 } } as const;
/** The eye's centre (body px) and how far its pupil can roll. */
export const EYE = { x: 74, y: -5, r: 13, roll: 3.2 } as const;

const WASH = { light: '#c47a5e', heavy: '#a3342b' } as const;
const SPOTS = '#9c3d27';

type Variant = 'light' | 'heavy';

interface Draw {
  readonly pen: Pen;
  readonly heavy: boolean;
  readonly wash: string;
  /** Body px to canvas px. */
  readonly P: (x: number, y: number) => Pt;
}

function draw(ctx: CanvasRenderingContext2D, variant: Variant, seed: number, ox: number, oy: number): Draw {
  return { pen: new Pen(ctx, seed, 0.45), heavy: variant === 'heavy', wash: WASH[variant], P: (x, y) => ({ x: ox + x, y: oy + y }) };
}

// ---------------------------------------------------------------- body

const MANTLE_TIP = -SQUID_BODY.hl;
const MANTLE_RIM = 54;

/** Mantle half height at x: a point at the tip, swelling to a long cylinder. */
export function mantleHalf(x: number): number {
  const u = Math.max(0, Math.min(1, (x - MANTLE_TIP) / (MANTLE_RIM - MANTLE_TIP)));
  return SQUID_BODY.hh * Math.pow(Math.min(1, u / 0.62), 0.78) * (1 + 0.04 * Math.sin(Math.max(0, u - 0.62) / 0.38 * Math.PI));
}

const headHalf = (x: number): number => 24 - 6 * Math.pow(Math.max(0, x - 44) / 74, 2);

function mantleShape(d: Draw): Pt[] {
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let x = MANTLE_TIP; x <= MANTLE_RIM; x += 4) {
    top.push(d.P(x, -mantleHalf(x)));
    bottom.push(d.P(x, mantleHalf(x) * 0.94));
  }
  const h = mantleHalf(MANTLE_RIM);
  // The rim of the mantle opening bulges forward over the neck.
  const rim = bezier(d.P(MANTLE_RIM, -h), d.P(MANTLE_RIM + 9, 0), d.P(MANTLE_RIM, h * 0.94), 10);
  return [...top, ...rim, ...bottom.reverse()];
}

function headShape(d: Draw): Pt[] {
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let x = 40; x <= 116; x += 4) {
    top.push(d.P(x, -headHalf(x)));
    bottom.push(d.P(x, headHalf(x) * 0.95));
  }
  const front = bezier(d.P(116, -headHalf(116)), d.P(127, 0), d.P(116, headHalf(116) * 0.95), 8);
  return [...top, ...front, ...bottom.reverse()];
}

/** Lines that follow the body's curve, for shading the lower flank. */
function flankLines(d: Draw, from: number, to: number, half: (x: number) => number, rows: number, gap: number, alpha: number, below = true): void {
  for (let r = 1; r <= rows; r++) {
    const pts: Pt[] = [];
    const a = from + d.pen.rng() * 10;
    const b = to - d.pen.rng() * 10;
    for (let x = a; x <= b; x += 5) {
      const h = half(x);
      const scale = h / SQUID_BODY.hh;
      pts.push(d.P(x, below ? h * 0.94 - r * gap * scale : -h + r * gap * scale));
    }
    d.pen.hair(pts, 0.55, INK, alpha * (1 - r / (rows + 2) * 0.6));
  }
}

function drawHead(d: Draw): void {
  const { pen, P } = d;
  const head = headShape(d);
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, d.wash, d.heavy ? 0.42 : 0.26);
  pen.clipped(head, () => {
    flankLines(d, 44, 120, headHalf, d.heavy ? 6 : 4, 2.6, 0.7);
    pen.stipple(head, 260, (x, y) => (y < P(0, 0).y ? 0.55 : 0.25), 1, SPOTS);
    // Folds where the head meets the crown of arms.
    for (const dx of [102, 108]) pen.hair(bezier(P(dx, -headHalf(dx) + 2), P(dx + 5, 0), P(dx, headHalf(dx) - 2), 8), 0.6, INK, 0.55);
  });
  pen.stroke(head, d.heavy ? 2.2 : 1.8, INK);
}

/** The funnel it jets water (and ink) through, peeking out under the mantle. */
function drawSiphon(d: Draw): void {
  const { pen, P } = d;
  const tube = [P(34, 12), P(60, 13), P(68, 17), P(66, 25), P(38, 26)];
  pen.fill(tube, PAPER_FILL, 1);
  pen.fill(tube, d.wash, 0.35);
  pen.hair([P(40, 19), P(64, 19)], 0.6, INK, 0.6);
  pen.stroke([...tube, tube[0]!], 1.2, INK);
}

function drawMantle(d: Draw): void {
  const { pen, P } = d;
  const mantle = mantleShape(d);
  pen.fill(mantle, PAPER_FILL, 1);
  pen.clipped(mantle, () => {
    d.pen.ctx.translate(1.5, 1);
    pen.fill(mantle, d.wash, d.heavy ? 0.45 : 0.3);
    d.pen.ctx.translate(-1.5, -1);
    // Chromatophores: the skin's colour cells, thickest along the back.
    const mid = P(0, 0).y;
    pen.stipple(mantle, d.heavy ? 1500 : 1100, (_x, y) => 0.15 + 0.7 * Math.max(0, (mid - y) / SQUID_BODY.hh + 0.3), 1.15, SPOTS);
    flankLines(d, MANTLE_TIP + 14, MANTLE_RIM, mantleHalf, d.heavy ? 8 : 6, 2.5, 0.75);
    flankLines(d, MANTLE_TIP + 30, MANTLE_RIM - 6, mantleHalf, 3, 2.4, 0.5, false);
    if (d.heavy) {
      // Engraved rings round the mantle.
      for (let x = MANTLE_TIP + 16; x < MANTLE_RIM; x += 5) {
        const h = mantleHalf(x);
        pen.hair(bezier(P(x, -h), P(x - h * 0.2, 0), P(x, h * 0.94), 6), 0.5, INK, 0.45);
      }
    }
    // The pen (its internal shell) shows as a faint ridge along the back.
    pen.hair(Array.from({ length: 30 }, (_, i) => {
      const x = MANTLE_TIP + 10 + i * 5.6;
      return P(x, -mantleHalf(x) + 4);
    }), 0.6, INK, 0.5);
  });
  // Rim of the mantle opening, with its inner lip.
  const h = mantleHalf(MANTLE_RIM);
  pen.hair(bezier(P(MANTLE_RIM - 5, -h + 3), P(MANTLE_RIM + 2, 0), P(MANTLE_RIM - 5, h * 0.94 - 3), 10), 0.6, INK, 0.6);
  pen.stroke(mantle, d.heavy ? 2.4 : 2, INK);
}

/** The eye: the biggest in the animal kingdom. The pupil is its own piece, so it can follow you. */
function drawEye(d: Draw, pupil: boolean): void {
  const { pen, P } = d;
  const c = P(EYE.x, EYE.y);
  const r = EYE.r;
  // Socket shadow.
  pen.clipped(ellipse(c.x, c.y, r * 1.45, r * 1.35, 24), () => pen.hatch(ellipse(c.x, c.y, r * 1.45, r * 1.35, 24), 2.2, -0.7, 0.5, { alpha: 0.5 }));
  pen.fill(ellipse(c.x, c.y, r * 1.05, r, 24), PAPER_FILL, 1);
  // Iris: a ring of fine radial strokes round a clear centre.
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    pen.hair([{ x: c.x + Math.cos(a) * r * 0.5, y: c.y + Math.sin(a) * r * 0.5 }, { x: c.x + Math.cos(a) * r * 0.86, y: c.y + Math.sin(a) * r * 0.82 }], 0.4, INK, 0.6);
  }
  pen.fill(ellipse(c.x, c.y, r * 0.86, r * 0.82, 24), '#7a6a3a', 0.18);
  pen.stroke([...ellipse(c.x, c.y, r * 1.05, r, 24), { x: c.x + r * 1.05, y: c.y }], 1.4, INK, 1, false);
  // Heavy lid above, a crease below.
  pen.stroke(bezier({ x: c.x - r * 1.3, y: c.y - r * 0.3 }, { x: c.x, y: c.y - r * 1.55 }, { x: c.x + r * 1.3, y: c.y - r * 0.2 }), d.heavy ? 1.8 : 1.2, INK, 1, false);
  pen.hair(bezier({ x: c.x - r, y: c.y + r * 0.9 }, { x: c.x, y: c.y + r * 1.3 }, { x: c.x + r, y: c.y + r * 0.85 }), 0.6, INK, 0.6);
  if (pupil) drawPupilAt(pen, c.x, c.y);
}

function drawPupilAt(pen: Pen, x: number, y: number): void {
  pen.dot(x, y, EYE.r * 0.42, INK);
  pen.dot(x + EYE.r * 0.16, y - EYE.r * 0.18, EYE.r * 0.12, PAPER_FILL);
}

function drawBody(d: Draw, pupil: boolean): void {
  drawHead(d);
  drawSiphon(d);
  drawMantle(d);
  drawEye(d, pupil);
}

/** Mantle and head, centred: the part of the squid that stays rigid (and gets bitten). */
export function drawSquidBody(ctx: CanvasRenderingContext2D, variant: Variant, seed: number): void {
  drawBody(draw(ctx, variant, seed, SQUID_TEX.body.w / 2, SQUID_TEX.body.h / 2), false);
}

export function drawSquidPupil(ctx: CanvasRenderingContext2D): void {
  drawPupilAt(new Pen(ctx, 7, 0.1), SQUID_TEX.pupil.w / 2, SQUID_TEX.pupil.h / 2);
}

// ---------------------------------------------------------------- limbs

/** Width of a limb at s (0 root .. 1 tip). Tentacles are thin stalks ending in a fat club. */
function limbWidth(kind: LimbKind, s: number, clubFrom: number): number {
  if (kind === 'arm') return 1.3 + 13.5 * Math.pow(1 - s, 0.9);
  if (s < clubFrom) return 5.5 - 1.8 * (s / clubFrom);
  const c = (s - clubFrom) / (1 - clubFrom);
  return c < 0.3 ? 4.3 + 9 * Math.sin((c / 0.3) * Math.PI / 2) : 1 + 12.3 * (1 - Math.pow((c - 0.3) / 0.7, 1.7));
}

/** Unit normals pointing to the left of travel (up, for a limb running to the right). */
function sideOf(path: readonly Pt[]): Pt[] {
  return path.map((_, i) => {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.min(path.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
  });
}

/** Resamples a polyline to `n` evenly spaced points, so detail spacing doesn't depend on the pose. */
function resample(path: readonly Pt[], n: number): Pt[] {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y));
  const total = lengths.at(-1)!;
  let j = 1;
  return Array.from({ length: n }, (_, i) => {
    const at = (i / (n - 1)) * total;
    while (j < path.length - 1 && lengths[j]! < at) j++;
    const a = path[j - 1]!;
    const b = path[j]!;
    const t = (at - lengths[j - 1]!) / Math.max(1e-6, lengths[j]! - lengths[j - 1]!);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

/**
 * One arm or tentacle along any path, root first: paper and wash, shading on
 * the underside, a row of suckers (two rows of bigger, toothed ones on a
 * tentacle's club), outlined. `far` limbs sit in the shadow behind the body.
 */
function drawLimb(d: Draw, path: readonly Pt[], kind: LimbKind, clubFrom: number, far: boolean): void {
  const { pen } = d;
  const pts = resample(path, 60);
  const side = sideOf(pts);
  const w = pts.map((_, i) => limbWidth(kind, i / (pts.length - 1), clubFrom));
  const upper = pts.map((p, i) => ({ x: p.x + side[i]!.x * w[i]! / 2, y: p.y + side[i]!.y * w[i]! / 2 }));
  const lower = pts.map((p, i) => ({ x: p.x - side[i]!.x * w[i]! / 2, y: p.y - side[i]!.y * w[i]! / 2 }));
  const shape = [...upper, ...[...lower].reverse()];
  const at = (i: number, k: number): Pt => ({ x: pts[i]!.x - side[i]!.x * w[i]! * k, y: pts[i]!.y - side[i]!.y * w[i]! * k });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, d.wash, (d.heavy ? 0.42 : 0.28) + (far ? 0.12 : 0));
  if (far) pen.fill(shape, INK, 0.1);
  pen.clipped(shape, () => {
    // Shading lines along the underside.
    for (const k of d.heavy ? [0.06, 0.18, 0.3] : [0.12, 0.28]) pen.hair(pts.map((_, i) => at(i, k)), 0.5, INK, 0.55);
    pen.stipple(shape, 160, () => 0.5, 0.9, SPOTS);
  });
  if (kind === 'arm') {
    // One row of suckers, shrinking towards the tip.
    for (let i = 3; i < pts.length - 4; i += 2) {
      const r = Math.max(0.7, w[i]! * 0.14);
      const c = at(i, 0.3);
      pen.hair([...ellipse(c.x, c.y, r, r, 10), { x: c.x + r, y: c.y }], 0.45, INK, 0.75);
      pen.dot(c.x, c.y, r * 0.35, INK, 0.6);
    }
  } else {
    const club = Math.floor(clubFrom * (pts.length - 1));
    for (let i = club + 1; i < pts.length - 2; i++) {
      for (const k of [-0.12, 0.22]) {
        const r = Math.max(0.8, w[i]! * 0.13);
        const c = at(i, k);
        pen.hair([...ellipse(c.x, c.y, r, r, 10), { x: c.x + r, y: c.y }], 0.5, INK, 0.85);
        pen.dot(c.x, c.y, r * 0.4, INK, 0.7);
      }
    }
    // Tiny suckers on the bare stalk, few and far between.
    for (let i = 6; i < club; i += 6) pen.dot(at(i, 0.25).x, at(i, 0.25).y, 0.7, INK, 0.6);
  }
  pen.stroke(upper, d.heavy ? 1.5 : 1.2, INK, 1, false);
  pen.stroke(lower, d.heavy ? 1.6 : 1.3, INK, 1, false);
}

/** Where along a tentacle its club starts, as a share of its length. */
const clubShare = (length: number): number => 1 - CLUB_LENGTH / length;

/** One limb drawn straight across its texture, root on the left, for the game to bend. */
export function drawSquidLimb(ctx: CanvasRenderingContext2D, kind: LimbKind, variant: Variant, seed: number): void {
  const { w, h } = SQUID_TEX.limb;
  const d = draw(ctx, variant, seed, 0, h / 2);
  // Run past the root edge so the root has no end cap: it tucks under the head.
  drawLimb(d, [d.P(-4, 0), d.P(w - 1, 0)], kind, clubShare(w + 3), false);
}

// ---------------------------------------------------------------- fins

/** One fin lobe, root along the bottom of its texture, raked back towards the tip of the mantle. */
function drawFinAt(d: Draw, mirror: boolean): void {
  const { pen, P } = d;
  const s = mirror ? -1 : 1;
  const Q = (x: number, y: number): Pt => P(x, y * s);
  // A small rhomboid lobe, as on the real animal: the mantle does the swimming.
  const edge = [
    ...bezier(Q(-24, 0), Q(-26, -14), Q(-17, -27), 10),
    ...bezier(Q(-17, -27), Q(2, -19), Q(26, 0), 12),
  ];
  pen.fill(edge, PAPER_FILL, 1);
  pen.fill(edge, d.wash, d.heavy ? 0.4 : 0.26);
  pen.clipped(edge, () => pen.stipple(edge, 120, () => 0.4, 0.9, SPOTS));
  const root = Q(-2, 0);
  for (let i = 2; i < edge.length - 2; i += 2) pen.hair([root, edge[i]!], 0.45, INK, 0.45);
  pen.stroke(edge, d.heavy ? 1.6 : 1.3, INK, 1, false);
}

export function drawSquidFin(ctx: CanvasRenderingContext2D, variant: Variant, seed: number): void {
  const { w, h } = SQUID_TEX.fin;
  drawFinAt(draw(ctx, variant, seed, w * FIN.origin.x, h * FIN.origin.y), false);
}

// ---------------------------------------------------------------- portrait

/** The whole squid at rest, arms fanned: for the guide, the map and the end screens. */
export function drawSquidPortrait(ctx: CanvasRenderingContext2D, variant: Variant, seed: number): void {
  const d = draw(ctx, variant, seed, PORTRAIT_CENTRE.x, PORTRAIT_CENTRE.y);
  const pose = { ...REST_POSE, t: 0.8 };
  const limbs = LIMBS.map((limb) => ({ limb, path: limbPoints(limb, pose).map((p) => d.P(p.x, p.y)) }));
  for (const { limb, path } of limbs.filter((l) => l.limb.far)) drawLimb(d, path, limb.kind, clubShare(limb.length), true);
  for (const mirror of [false, true]) {
    const h = mantleHalf(FIN.x);
    const finD = draw(ctx, variant, seed + (mirror ? 5 : 3), PORTRAIT_CENTRE.x + FIN.x, PORTRAIT_CENTRE.y + (mirror ? h * 0.94 : -h) + (mirror ? -2 : 2));
    drawFinAt(finD, mirror);
  }
  drawBody(d, true);
  for (const { limb, path } of limbs.filter((l) => !l.limb.far)) drawLimb(d, path, limb.kind, clubShare(limb.length), false);
}
