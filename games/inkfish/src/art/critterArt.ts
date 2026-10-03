import { bezier, C, PAPER_FILL } from './fish/kit';
import { ellipse, INK, Pen, type Pt } from './pen';

/**
 * Seabed crawlers: crabs, shrimp, snails and the deep-sea walkers. They are
 * species like any fish (eaten by size, bite back when bigger) but live on
 * the sand. Drawn like fish: one boil frame per call, on a FISH_TEX square
 * canvas, centred on C, head to the RIGHT, in the same pen-and-ink style.
 * The boil frame also sets the leg pose (0..2), so crawling animates.
 */
export type CritterId = 'shorecrab' | 'periwinkle' | 'shrimp' | 'hermitcrab' | 'urchin' | 'lobster' | 'spidercrab' | 'isopod' | 'seapig';

export const CRITTER_IDS: readonly CritterId[] = ['shorecrab', 'periwinkle', 'shrimp', 'hermitcrab', 'urchin', 'lobster', 'spidercrab', 'isopod', 'seapig'];

/**
 * Body proportions in texture px (same units as a fish Anatomy): `hl`/`hh` are
 * the half length and half height of the solid body (legs, antennae and
 * spines left out) for hit capsules; `foot` is how far below C the feet touch
 * the ground, so the game can stand the critter on the seabed.
 */
export const CRITTER_BODY: Readonly<Record<CritterId, { readonly hl: number; readonly hh: number; readonly foot: number }>> = {
  shorecrab: { hl: 54, hh: 20, foot: 46 },
  periwinkle: { hl: 52, hh: 36, foot: 40 },
  shrimp: { hl: 66, hh: 16, foot: 30 },
  hermitcrab: { hl: 64, hh: 36, foot: 46 },
  urchin: { hl: 40, hh: 30, foot: 44 },
  lobster: { hl: 100, hh: 18, foot: 40 },
  spidercrab: { hl: 38, hh: 26, foot: 90 },
  isopod: { hl: 86, hh: 20, foot: 34 },
  seapig: { hl: 68, hh: 24, foot: 38 },
};

export const isCritter = (shape: string): shape is CritterId => (CRITTER_IDS as readonly string[]).includes(shape);

const TAU = Math.PI * 2;
const RED = '#a3342b';

/** One drawing pass: everything is in local px with the origin at the canvas centre. */
interface D {
  readonly pen: Pen;
  readonly heavy: boolean;
  /** Leg pose 0..2. */
  readonly f: number;
  readonly ink: string;
  /** Ground line (local y of the feet). */
  readonly g: number;
  /** Wash strength for limbs (dark animals like the lobster go above 1). */
  readonly tone: number;
}

/** Limbs on the far side are drawn darker, as if in shadow. */
const limbAlpha = (d: D, far: boolean): number => Math.min(0.9, (far ? 0.62 : d.heavy ? 0.5 : 0.36) * d.tone);

// ---------------------------------------------------------------- geometry

const pt = (x: number, y: number): Pt => ({ x, y });
const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const add = (a: Pt, b: Pt): Pt => pt(a.x + b.x, a.y + b.y);
const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
/** Moves and scales a local shape (for the far-side copy of a limb). */
const xf = (pts: readonly Pt[], ox: number, oy: number, s = 1, sy = s): Pt[] => pts.map((p) => pt(ox + p.x * s, oy + p.y * sy));

function cub(p0: Pt, c0: Pt, c1: Pt, p1: Pt, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x, u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y);
  });
}

/** Unit normal (pointing to the left of travel) at each point of a polyline. */
function normals(pts: readonly Pt[]): Pt[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt((b.y - a.y) / d, -(b.x - a.x) / d);
  });
}

/** A polyline thickened into a closed shape, `w(u)` is the full width at u in 0..1. */
function ribbon(spine: readonly Pt[], w: (u: number) => number): { top: Pt[]; bot: Pt[]; shape: Pt[] } {
  const n = normals(spine);
  const half = (i: number): number => w(i / (spine.length - 1)) / 2;
  const top = spine.map((p, i) => pt(p.x + n[i]!.x * half(i), p.y + n[i]!.y * half(i)));
  const bot = spine.map((p, i) => pt(p.x - n[i]!.x * half(i), p.y - n[i]!.y * half(i)));
  return { top, bot, shape: [...top, ...[...bot].reverse()] };
}

const tube = (pts: readonly Pt[], w0: number, w1: number): Pt[] => ribbon(pts, (u) => w0 + (w1 - w0) * u).shape;

/** A tapered segment with rounded ends: one piece of a jointed leg. */
function capsule(a: Pt, b: Pt, w0: number, w1: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const arc = (c: Pt, r: number, from: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => pt(c.x + Math.cos(from + (i / 6) * Math.PI) * r, c.y + Math.sin(from + (i / 6) * Math.PI) * r));
  return [...arc(b, w1 / 2, ang - Math.PI / 2), ...arc(a, w0 / 2, ang + Math.PI / 2)];
}

/** Pushes every `step`-th point of a curve outwards: a serrated edge (crab teeth, rostrum). */
function serrate(pts: readonly Pt[], from: number, to: number, step: number, h: number): Pt[] {
  const n = normals(pts);
  return pts.map((p, i) => (i >= from && i <= to && (i - from) % step === 0 ? pt(p.x + n[i]!.x * h, p.y + n[i]!.y * h) : p));
}

/** Foot offset for leg `i` in the current pose: alternate legs swing in opposite phase. */
function gait(d: D, i: number, stride: number, lift: number): Pt {
  const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + i * 0.45;
  return pt(Math.cos(ph) * stride, -Math.max(0, Math.sin(ph)) * lift);
}

/** Hip, raised knee, ankle, foot: an arthropod walking leg. */
function jointed(hip: Pt, foot: Pt, rise: number, out: number): Pt[] {
  const knee = pt(hip.x + (foot.x - hip.x) * 0.4, Math.min(hip.y, foot.y) - rise);
  const ankle = add(lerp(knee, foot, 0.6), pt(Math.sign(foot.x - hip.x) * out, 0));
  return [hip, knee, ankle, foot];
}

// ---------------------------------------------------------------- ink helpers

/** Paper, a slightly misregistered wash, and the predator's red tint. */
function skin(d: D, shape: readonly Pt[], wash: string, strength = 1): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(1.5, 1);
    pen.fill(shape, wash, Math.min(0.92, (d.heavy ? 0.42 : 0.26) * strength));
    pen.ctx.translate(-1.5, -1);
  });
  if (d.heavy) pen.fill(shape, RED, 0.12);
}

/** Belly-side hatching under `below`; the heavy look adds engraved cross-hatching. */
function shade(d: D, shape: readonly Pt[], below: number, alpha = 0.55): void {
  const { pen, heavy, ink } = d;
  pen.hatch(shape, heavy ? 2.2 : 2.8, 0.06, 0.5, { onlyBelow: below, color: ink, alpha });
  if (heavy) pen.hatch(shape, 3, -0.9, 0.45, { onlyBelow: below - 8, color: ink, alpha: alpha * 0.8 });
}

function edge(d: D, shape: readonly Pt[], w = 1.7): void {
  d.pen.stroke(closed(shape), w * (d.heavy ? 1.3 : 1), d.ink);
}

/** A jointed limb: one tapered capsule per segment, outlined, proximal segments on top. `tip` colours the last one. */
function limb(d: D, pts: readonly Pt[], w: readonly number[], wash: string, far = false, tip = wash): void {
  for (let i = pts.length - 2; i >= 0; i--) {
    const seg = capsule(pts[i]!, pts[i + 1]!, w[i]!, w[i + 1]!);
    d.pen.fill(seg, PAPER_FILL, 1);
    d.pen.fill(seg, i === pts.length - 2 ? tip : wash, limbAlpha(d, far));
    if (d.heavy) d.pen.fill(seg, RED, 0.1);
    d.pen.stroke(closed(seg), (far ? 0.7 : 0.95) * (d.heavy ? 1.25 : 1), d.ink, far ? 0.7 : 1, false);
  }
}

/** A thin feeler (antenna, papilla tip) with pressure taper. */
function feeler(d: D, pts: readonly Pt[], w = 0.8, color = d.ink, alpha = 0.95): void {
  d.pen.stroke(pts, w, color, alpha, false);
}

/** A glossy black eye. */
function eyeDot(d: D, x: number, y: number, r: number): void {
  d.pen.dot(x, y, r, d.ink);
  d.pen.dot(x + r * 0.3, y - r * 0.35, Math.max(0.6, r * 0.28), PAPER_FILL);
}

/** Mottling: ink dots denser towards the top of a shape. */
function mottle(d: D, shape: readonly Pt[], count: number, top: number, bottom: number, color = d.ink): void {
  d.pen.stipple(shape, count, (_, y) => Math.max(0, (bottom - y) / (bottom - top)) * 0.8, 0.55, color);
}

// ---------------------------------------------------------------- shore crab

const CRAB_WASH = '#6b7a34';

/**
 * A crab claw (cheliped) from the body forward; `open` lifts the moving
 * finger, `long` stretches the hand (lobsters).
 */
function claw(d: D, ox: number, oy: number, s: number, wash: string, open: number, far: boolean, long = 1): void {
  const L = (pts: readonly Pt[]): Pt[] => xf(xf(pts, -34, 0, 1).map((p) => pt(p.x * (p.x > 26 ? long : 1) - (p.x > 26 ? 26 * (long - 1) : 0), p.y)), ox + 34 * s, oy, s);
  const arm = L([pt(34, 8), pt(50, 6), pt(60, -2)]);
  limb(d, arm, [9 * s, 8 * s, 8 * s], wash, far);
  const palm = L(ellipse(76, -6, 16, 10.5, 20));
  const fixed = tube(L(cub(pt(86, -1), pt(94, 1), pt(100, 0), pt(106, -5), 8)), 7 * s, 1.2 * s);
  const moving = tube(L(cub(pt(84, -13), pt(94, -16 - open), pt(101, -12 - open), pt(105, -7 - open * 1.4), 8)), 7 * s, 1.2 * s);
  for (const part of [fixed, moving, palm]) {
    d.pen.fill(part, PAPER_FILL, 1);
    d.pen.fill(part, wash, limbAlpha(d, far));
    if (d.heavy) d.pen.fill(part, RED, 0.1);
  }
  // Dark finger tips.
  for (const f of [fixed, moving]) d.pen.clipped(f, () => d.pen.fill(L(ellipse(104, -6 - open * 0.6, 7, 9, 12)), d.ink, far ? 0.35 : 0.55));
  if (!far) d.pen.hatch(palm, d.heavy ? 2.2 : 2.8, 0.1, 0.5, { onlyBelow: oy - 4 * s, color: d.ink, alpha: 0.5 });
  for (const part of [fixed, moving, palm]) d.pen.stroke(closed(part), (far ? 0.7 : 1.1) * (d.heavy ? 1.25 : 1), d.ink, far ? 0.7 : 1, false);
}

function crabLegs(d: D, far: boolean, wash: string): void {
  const hips = [26, 10, -8, -24];
  const feet = [78, 50, -48, -76];
  hips.forEach((hx, i) => {
    const step = gait(d, i + (far ? 1 : 0), 5, 5);
    const hip = far ? pt(hx + 6, 2) : pt(hx, 8);
    const foot = pt(feet[i]! * (far ? 0.85 : 1) + step.x, d.g - (far ? 3 : 0) + step.y);
    const knee = pt(hip.x + (foot.x - hip.x) * 0.55, -14 - (far ? 4 : 0));
    const ankle = pt(hip.x + (foot.x - hip.x) * 0.92, 18);
    limb(d, [hip, knee, ankle, foot], [6, 5, 3.6, 0.8], wash, far);
  });
}

function shoreCrab(d: D): void {
  const { pen, f } = d;
  const open = [1, 4, 2][f]!;
  crabLegs(d, true, CRAB_WASH);
  claw(d, -8, -9, 0.9, CRAB_WASH, open * 0.7, true);
  // Near legs too: the carapace overhangs their bases.
  crabLegs(d, false, CRAB_WASH);
  const top = serrate(cub(pt(-46, 4), pt(-40, -22), pt(20, -28), pt(44, -14), 20), 12, 19, 2, 2.8);
  const shell = [...top, ...bezier(pt(44, -14), pt(52, -6), pt(46, 4), 6).slice(1), ...cub(pt(46, 4), pt(26, 12), pt(-26, 12), pt(-46, 4), 14).slice(1)];
  skin(d, shell, CRAB_WASH, 1.3);
  mottle(d, shell, 500, -30, 6, '#3d4a1c');
  shade(d, shell, 2);
  // Rim of the carapace and the groove over the gut.
  pen.hair(cub(pt(-40, 6), pt(-26, 2), pt(26, 0), pt(44, -2), 12), 0.7, d.ink, 0.7);
  pen.hair(bezier(pt(-8, -26), pt(-2, -12), pt(10, -24), 8), 0.6, d.ink, 0.6);
  edge(d, shell);
  claw(d, -2, 0, 1.05, CRAB_WASH, open, false);
  // Eyes on short stalks, antennules between them.
  for (const [x, y] of [[36, -18], [42, -14]] as const) {
    pen.stroke([pt(x, y), pt(x + 4, y - 6)], 2.4, d.ink, 1, false);
    eyeDot(d, x + 5, y - 8, 3);
  }
  feeler(d, [pt(46, -10), pt(54, -18), pt(58, -20)], 0.6);
}

// ---------------------------------------------------------------- periwinkle

const SNAIL_FOOT = '#a8957a';

function tentacle(d: D, base: Pt, tip: Pt, far: boolean): void {
  const t = tube(bezier(base, pt(base.x + 4, (base.y + tip.y) / 2 + 2), tip, 8), 4.6, 1.4);
  d.pen.fill(t, PAPER_FILL, 1);
  d.pen.fill(t, SNAIL_FOOT, far ? 0.65 : 0.4);
  d.pen.stroke(closed(t), far ? 0.7 : 0.9, d.ink, far ? 0.7 : 1, false);
}

/** The muscular foot gliding on the sand, head and tentacles out in front. */
function snailFoot(d: D): Pt[] {
  const { pen, f, g } = d;
  const reach = [0, 2, 4][f]!;
  const sway = [0, 3, -2][f]!;
  const sole = cub(pt(-40, g - 2), pt(-20, g + 1), pt(40, g + 1), pt(56 + reach, g - 1), 14);
  const head = cub(pt(56 + reach, g - 1), pt(68 + reach, g - 4), pt(66 + reach, 16), pt(52 + reach, 15), 8);
  const back = cub(pt(52 + reach, 15), pt(36, 12), pt(-20, g - 10), pt(-40, g - 2), 10);
  const foot = [...sole, ...head.slice(1), ...back.slice(1)];
  tentacle(d, pt(54 + reach, 18), pt(64 + reach + sway, -2), true);
  skin(d, foot, SNAIL_FOOT);
  pen.clipped(foot, () => {
    // Pedal waves rippling along the sole.
    for (let x = -30 + f * 4; x < 52; x += 12) pen.hair(bezier(pt(x, g), pt(x + 3, g - 4), pt(x + 1, g - 7), 4), 0.5, d.ink, 0.35);
  });
  shade(d, foot, g - 6);
  edge(d, foot, 1.4);
  tentacle(d, pt(58 + reach, 19), pt(74 + reach + sway, 0), false);
  eyeDot(d, 57 + reach, 18, 1.7);
  return foot;
}

function periwinkle(d: D): void {
  const { pen } = d;
  snailFoot(d);
  // Globular body whorl with a short pointed spire up and back.
  const apex = pt(-38, -44);
  const shell = [
    ...cub(apex, pt(-16, -48), pt(26, -36), pt(28, -4), 12),
    ...cub(pt(28, -4), pt(30, 20), pt(6, 30), pt(-16, 28), 10).slice(1),
    ...cub(pt(-16, 28), pt(-40, 26), pt(-46, 0), pt(-38, -18), 10).slice(1),
    ...cub(pt(-38, -18), pt(-36, -28), pt(-40, -36), apex, 6).slice(1),
  ];
  skin(d, shell, '#5d5040', 1.6);
  pen.clipped(shell, () => {
    // Spiral ridges wrapping the body whorl, and darker growth bands.
    for (let r = 10; r < 44; r += 4) pen.hair(ellipse(-4, 2, r, r * 0.9, 36).slice(19, 34), 0.6, d.ink, 0.45);
    for (let i = 0; i < 5; i++) pen.hair(bezier(pt(-30 + i * 12, -30 + i * 2), pt(-20 + i * 14, 0), pt(-24 + i * 12, 30), 8), 2.4, '#3a2f22', 0.18);
  });
  mottle(d, shell, 220, -46, 0, '#2c2318');
  shade(d, shell, 6);
  // Sutures between the whorls.
  pen.stroke(cub(pt(-39, -16), pt(-28, -30), pt(-2, -38), pt(22, -26), 10), 1, d.ink, 0.9, false);
  pen.stroke(cub(pt(-38, -32), pt(-34, -40), pt(-24, -44), pt(-12, -44), 8), 0.9, d.ink, 0.85, false);
  edge(d, shell);
  // Aperture: dark mouth with a pale lip, the foot coming out of it.
  const ap = ellipse(16, 16, 11, 12, 16);
  pen.fill(ap, '#2a2228', 0.7);
  pen.stroke(closed(ap), 1.4, d.ink, 1, false);
  pen.hair(ellipse(16, 16, 13, 14, 16).slice(10, 17), 1.6, PAPER_FILL, 0.8);
  const neck = cub(pt(10, 26), pt(20, 12), pt(40, 12), pt(52, 16), 8);
  const neckShape = [...neck, ...cub(pt(54, 26), pt(36, 28), pt(20, 30), pt(10, 26), 8)];
  skin(d, neckShape, SNAIL_FOOT);
  pen.stroke(neck, 1.3, d.ink, 1, false);
}

// ---------------------------------------------------------------- shrimp

const SHRIMP_WASH = '#d6a95a';

function shrimpBody(): { spine: Pt[]; top: Pt[]; bot: Pt[]; shape: Pt[] } {
  const spine = cub(pt(58, -4), pt(14, -26), pt(-50, -24), pt(-64, 4), 30);
  const w = (u: number): number => (u < 0.08 ? 10 + (u / 0.08) * 20 : u < 0.4 ? 30 : 30 - ((u - 0.4) / 0.6) * 18);
  // The spine runs head to tail (leftwards), so its left-hand side is the belly.
  const { top, bot, shape } = ribbon(spine, w);
  return { spine, top: bot, bot: top, shape };
}

function shrimpLegs(d: D, bot: readonly Pt[]): void {
  // Walking legs under the carapace.
  for (let i = 0; i < 5; i++) {
    const hip = add(bot[3 + i * 2]!, pt(0, -3));
    const step = gait(d, i, 4, 4);
    const foot = pt(hip.x + 10 - i * 5 + step.x, d.g + step.y);
    limb(d, jointed(hip, foot, -2, 5), [2.8, 2.4, 1.8, 0.7], SHRIMP_WASH);
  }
  // Swimmerets under the tail flutter every frame.
  for (let i = 0; i < 5; i++) {
    const base = add(bot[14 + i * 3]!, pt(0, -2));
    const flap = Math.sin(d.f * (TAU / 3) + i * 1.3) * 4;
    const tip = pt(base.x + 3 + flap, base.y + 10 - i);
    limb(d, [base, tip], [4, 1.5], SHRIMP_WASH);
    for (let k = 1; k < 4; k++) d.pen.hair([lerp(base, tip, k / 4), add(lerp(base, tip, k / 4), pt(-3, 2))], 0.4, d.ink, 0.6);
  }
}

function shrimpHead(d: D, top: readonly Pt[]): void {
  const { pen } = d;
  // Serrated rostrum over the eyes.
  const upper = serrate(bezier(top[2]!, pt(70, -14), pt(90, -14), 10), 1, 7, 2, 2.2);
  const rostrum = [...upper, ...bezier(pt(90, -14), pt(72, -8), pt(58, -4), 6).slice(1)];
  pen.fill(rostrum, PAPER_FILL, 1);
  pen.fill(rostrum, SHRIMP_WASH, 0.4);
  pen.stroke(closed(rostrum), 0.9, d.ink, 1, false);
  // Antennal scale, antennules, then the long antennae swept back.
  const scale = tube(bezier(pt(56, 0), pt(66, 2), pt(78, -2), 6), 5, 1);
  pen.fill(scale, PAPER_FILL, 1);
  pen.stroke(closed(scale), 0.7, d.ink, 1, false);
  feeler(d, cub(pt(58, -4), pt(72, -10), pt(84, -6), pt(96, -12), 10), 0.7);
  feeler(d, cub(pt(58, -4), pt(72, -6), pt(82, 0), pt(94, -2), 10), 0.6);
  const sway = [0, 3, -2][d.f]!;
  feeler(d, cub(pt(56, 2), pt(110, -6), pt(70 + sway, -70), pt(-40, -62 + sway), 24), 0.8);
  feeler(d, cub(pt(56, 2), pt(104, 4), pt(80, -58), pt(-56, -42), 24), 0.7, d.ink, 0.7);
  pen.stroke([pt(50, -6), pt(56, -10)], 2.6, d.ink, 1, false);
  eyeDot(d, 57, -11, 3.8);
}

function shrimp(d: D): void {
  const { pen } = d;
  const { spine, top, bot, shape } = shrimpBody();
  // Tail fan: telson and uropods spread from the last segment.
  const end = spine[spine.length - 2]!;
  const prev = spine[spine.length - 5]!;
  const dir = Math.atan2(end.y - prev.y, end.x - prev.x);
  const rim = Array.from({ length: 11 }, (_, i) => {
    const a = dir - 0.75 + (i / 10) * 1.5;
    const len = 30 - Math.abs(i - 5) * 1.1;
    return add(end, pt(Math.cos(a) * len, Math.sin(a) * len));
  });
  const fan = [add(end, pt(Math.cos(dir + 1.6) * 6, Math.sin(dir + 1.6) * 6)), ...rim, add(end, pt(Math.cos(dir - 1.6) * 6, Math.sin(dir - 1.6) * 6))];
  pen.fill(fan, PAPER_FILL, 1);
  pen.fill(fan, SHRIMP_WASH, d.heavy ? 0.45 : 0.3);
  for (let i = 1; i < 10; i++) pen.hair([end, rim[i]!], 0.5, d.ink, 0.6);
  pen.stroke(closed(fan), 1, d.ink, 1, false);
  shrimpLegs(d, bot);
  skin(d, shape, SHRIMP_WASH, 1);
  pen.clipped(shape, () => {
    // Glassy body: a gut line and speckled chromatophores.
    pen.hair(spine.slice(10).map((p) => add(p, pt(0, 1))), 1.2, '#8a5a2a', 0.35);
    pen.stipple(shape, 260, () => 0.35, 0.6, '#9b5a2a');
    // Segment joints across the tail.
    for (let i = 12; i < spine.length - 1; i += 3) pen.hair([top[i]!, lerp(top[i]!, bot[i]!, 0.5), bot[i]!].map((p, k) => add(p, pt(k === 1 ? -2 : 0, 0))), 0.7, d.ink, 0.8);
    pen.hair(cub(top[11]!, pt(30, -4), pt(40, 4), bot[5]!, 8), 0.8, d.ink, 0.8);
  });
  shade(d, shape, 0, 0.35);
  edge(d, shape, 1.4);
  shrimpHead(d, top);
}

// ---------------------------------------------------------------- hermit crab

const HERMIT_WASH = '#b45a32';
const SHELL_WASH = '#c69c5c';

/** A whelk lying on its side, spire back and up, siphonal canal forward. */
function whelk(d: D): void {
  const { pen } = d;
  const a = pt(-78, -30);
  const b = pt(34, 10);
  const spine = Array.from({ length: 41 }, (_, i) => lerp(a, b, i / 40));
  const whorls = [0.12, 0.24, 0.38, 0.6];
  const w = (u: number): number => {
    const k = whorls.findIndex((s) => u < s);
    const s0 = k <= 0 ? 0 : whorls[k - 1]!;
    const s1 = k < 0 ? 1 : whorls[k]!;
    const bulge = u < 0.6 ? 0.82 + 0.18 * Math.sin(Math.PI * ((u - s0) / (s1 - s0))) : 1;
    const env = u < 0.62 ? Math.pow(u / 0.62, 0.85) : Math.pow(Math.max(0, 1 - ((u - 0.62) / 0.38) ** 2), 0.8) * 0.88 + 0.12;
    return 74 * env * bulge;
  };
  const { top, bot, shape } = ribbon(spine, w);
  skin(d, shape, SHELL_WASH, 1.4);
  pen.clipped(shape, () => {
    // Brown spiral bands and the sutures between whorls.
    for (const v of [0.25, 0.45, 0.7]) pen.stroke(spine.map((p, i) => lerp(p, top[i]!, v)), 2.2, '#7a4a2a', 0.35, false);
    for (const v of [0.3, 0.6]) pen.stroke(spine.map((p, i) => lerp(p, bot[i]!, v)), 2, '#7a4a2a', 0.3, false);
    for (const s of whorls) {
      const i = Math.round(s * 40);
      pen.stroke(bezier(top[i]!, add(spine[i]!, pt(6, -2)), bot[i]!, 8), 1, d.ink, 0.9, false);
    }
    // Growth lines.
    for (let i = 26; i < 40; i += 2) pen.hair(bezier(top[i]!, add(spine[i]!, pt(3, 0)), bot[i]!, 6), 0.45, d.ink, 0.4);
  });
  mottle(d, shape, 220, -40, 30, '#5a3a20');
  shade(d, shape, 14);
  edge(d, shape);
  // Dark aperture on the lower front where the crab lives.
  const ap = ellipse(12, 18, 16, 10, 18).map((p) => pt(p.x + (p.y - 18) * -0.4, p.y));
  pen.fill(ap, '#2a2228', 0.8);
  pen.stroke(closed(ap), 1.3, d.ink, 1, false);
}

function hermitLegs(d: D, far: boolean): void {
  [0, 1].forEach((i) => {
    const s = gait(d, i + (far ? 1 : 0), 5, 5);
    const hip = far ? pt(22 + i * 6, 14) : pt(24 + i * 6, 20);
    const foot = pt((far ? 68 : 84) - i * 26 + s.x, d.g - (far ? 3 : 0) + s.y);
    const knee = pt(hip.x + (foot.x - hip.x) * 0.55, hip.y - 12);
    const ankle = pt(hip.x + (foot.x - hip.x) * 0.9, hip.y + (d.g - hip.y) * 0.5);
    limb(d, [hip, knee, ankle, foot], [7, 6, 4.4, 1], HERMIT_WASH, far);
    // Pale joint bands.
    if (!far) for (const p of [knee, ankle]) d.pen.dot(p.x, p.y, 1.4, PAPER_FILL, 0.8);
  });
}

function hermitCrab(d: D): void {
  const { pen, f } = d;
  hermitLegs(d, true);
  whelk(d);
  // Head shield and eyes on long stalks.
  const shield = ellipse(30, 8, 11, 9, 16);
  skin(d, shield, HERMIT_WASH, 1.4);
  edge(d, shield, 1.1);
  for (const [x, lean] of [[30, -2], [34, 3]] as const) {
    pen.stroke([pt(x, 2), pt(x + lean + 2, -16)], 2.6, d.ink, 1, false);
    eyeDot(d, x + lean + 2, -19, 3.2);
  }
  const sway = [0, 3, -2][f]!;
  feeler(d, cub(pt(38, 4), pt(64, -18), pt(84, -38 + sway), pt(100, -28 + sway), 12), 0.9, HERMIT_WASH);
  feeler(d, cub(pt(38, 4), pt(62, -8), pt(86, -14), pt(104, -4 - sway), 12), 0.7, d.ink, 0.8);
  const open = [1, 4, 2][f]!;
  claw(d, 4, 2, 0.65, HERMIT_WASH, open * 0.6, true);
  hermitLegs(d, false);
  claw(d, -10, 14, 1.05, HERMIT_WASH, open, false);
}

// ---------------------------------------------------------------- urchin

const URCHIN_WASH = '#4a3150';
const SPINE = '#2b1d33';

/** One needle spine from `base` along angle `a`. */
function spine(d: D, base: Pt, a: number, len: number, w: number, far: boolean): void {
  const dir = pt(Math.cos(a), Math.sin(a));
  const n = pt(-dir.y * w * 0.5, dir.x * w * 0.5);
  const tip = add(base, pt(dir.x * len, dir.y * len));
  const needle = [add(base, n), tip, add(base, pt(-n.x, -n.y))];
  d.pen.fill(needle, far ? '#6a5470' : SPINE, far ? 0.75 : 0.95);
  d.pen.hair([lerp(base, tip, 0.1), lerp(base, tip, 0.75)].map((p) => add(p, pt(n.x * 0.4, n.y * 0.4))), 0.4, PAPER_FILL, far ? 0.25 : 0.5);
  d.pen.hair(closed(needle), 0.45, d.ink, far ? 0.5 : 0.9);
}

function urchin(d: D): void {
  const { pen, f } = d;
  const rx = 40;
  const ry = 31;
  const cy = -4;
  const sway = (a: number): number => Math.sin(f * (TAU / 3) + a * 3) * 0.07;
  const rim = (a: number, k = 0.94): Pt => pt(Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
  // Tube feet reaching for the sand.
  for (let i = 0; i < 9; i++) {
    const x = -30 + i * 7.5;
    const reach = d.g - 2 + Math.sin(f * 2 + i) * 2;
    pen.hair(bezier(pt(x, 18), pt(x * 1.2 + 2, 28), pt(x * 1.25, reach), 6), 0.7, d.ink, 0.6);
    pen.dot(x * 1.25, reach, 1.2, d.ink, 0.7);
  }
  // Back row of spines all round, then the bottom ones it stands on.
  for (let i = 0; i < 30; i++) {
    const a = -Math.PI - 0.5 + ((i + 0.5) / 30) * (Math.PI + 1);
    spine(d, rim(a, 0.85), a + sway(a), 32 + (i % 3) * 5, 3.2, true);
  }
  for (let i = 0; i < 6; i++) {
    const a = 1.0 + (i / 5) * (Math.PI - 2);
    const base = rim(a);
    spine(d, base, a + sway(a) * 0.5, (d.g - base.y) / Math.sin(a) + 1, 3, true);
  }
  const test = ellipse(0, cy, rx, ry, 40).map((p) => pt(p.x, Math.min(p.y, 22)));
  skin(d, test, URCHIN_WASH, 2.4);
  pen.clipped(test, () => {
    // Five-part pattern: rows of pores on meridians, plus tubercle bumps.
    for (const m of [-0.6, 0, 0.6]) for (let t = -0.9; t < 0.8; t += 0.12) pen.dot(Math.sin(m) * rx * Math.cos(t * 1.2), cy + Math.sin(t * 1.6) * ry * 0.9, 0.9, PAPER_FILL, 0.6);
  });
  shade(d, test, 2, 0.6);
  edge(d, test);
  // Front spines radiating towards the viewer and out past the rim.
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI - 0.3 + ((i * 0.618) % 1) * (Math.PI + 0.6);
    const r = 0.35 + ((i * 0.37) % 0.55);
    const base = pt(Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
    pen.dot(base.x, base.y, 1.6, PAPER_FILL, 0.9);
    spine(d, base, a + sway(a), 22 + r * 22, 3.4, false);
  }
}

// ---------------------------------------------------------------- lobster

const LOBSTER_WASH = '#2c2e33';
const LOBSTER_TIP = '#c25a2c';

function lobsterTail(d: D): void {
  const { pen } = d;
  // Tail fan: telson between the uropods, ribbed.
  const fan = [pt(-70, -12), ...cub(pt(-80, -16), pt(-100, -24), pt(-110, -2), pt(-100, 14), 10), pt(-72, 8)];
  skin(d, fan, LOBSTER_WASH, 2.4);
  for (let i = 0; i < 6; i++) pen.hair([pt(-74, -2), fan[2 + i * 2]!], 0.5, d.ink, 0.7);
  edge(d, fan, 1.2);
  // Abdomen segments, tail first so each overlaps the next one back.
  for (let k = 5; k >= 0; k--) {
    const x0 = 4 - k * 12.5;
    const x1 = x0 - 14;
    const h0 = 19 - k * 1.2;
    const h1 = h0 - 1.2;
    const seg = [pt(x0, -h0), ...bezier(pt(x0, -h0), pt((x0 + x1) / 2, -h0 - 2), pt(x1, -h1), 6).slice(1), pt(x1, 6), pt(x1 + 3, 15), pt(x0 - 4, 13), pt(x0, 6)];
    skin(d, seg, LOBSTER_WASH, 2.4);
    mottle(d, seg, 50, -h0, 14, d.ink);
    shade(d, seg, 4);
    edge(d, seg, 1.3);
    pen.hair([pt(x1 + 2, -h1 + 3), pt(x0 - 2, -h0 + 3)], 0.6, PAPER_FILL, 0.6);
  }
}

function lobsterHead(d: D): void {
  const { pen } = d;
  const top = cub(pt(-2, -20), pt(18, -24), pt(36, -18), pt(48, -10), 14);
  const rostrum = [pt(48, -10), pt(64, -12), pt(50, -4)];
  const cara = [...top, ...rostrum.slice(1), ...cub(pt(50, -4), pt(50, 8), pt(30, 14), pt(-2, 14), 10).slice(1)];
  skin(d, cara, LOBSTER_WASH, 2.4);
  mottle(d, cara, 260, -24, 14, d.ink);
  shade(d, cara, 0);
  pen.hair(cub(pt(18, -22), pt(22, -10), pt(18, 0), pt(10, 12), 8), 0.8, d.ink, 0.8);
  edge(d, cara, 1.6);
  pen.stroke([pt(44, -8), pt(48, -12)], 2.4, d.ink, 1, false);
  eyeDot(d, 49, -13, 2.8);
}

function lobsterFeelers(d: D): void {
  const sway = [0, 3, -2][d.f]!;
  feeler(d, cub(pt(50, -6), pt(100, -34), pt(40 + sway, -74), pt(-60, -60 + sway), 26), 1.3, LOBSTER_TIP);
  feeler(d, cub(pt(48, -4), pt(104, -24), pt(60, -60 - sway), pt(-36, -50), 26), 1, '#7a3a20', 0.8);
  feeler(d, cub(pt(52, -6), pt(64, -14), pt(74, -18), pt(84, -26), 8), 0.7);
  feeler(d, cub(pt(52, -6), pt(64, -10), pt(76, -12), pt(86, -16), 8), 0.6);
}

function lobster(d: D): void {
  const { f } = d;
  const open = [1, 4, 2][f]!;
  for (let i = 0; i < 4; i++) {
    const s = gait(d, i + 1, 4, 4);
    limb(d, jointed(pt(34 - i * 10, 8), pt(46 - i * 16 + s.x, d.g - 3 + s.y), 8, 3), [4, 3.5, 2.5, 0.8], LOBSTER_WASH, true, LOBSTER_TIP);
  }
  claw(d, 0, -12, 0.9, LOBSTER_WASH, open * 0.7, true, 1.3);
  lobsterFeelers(d);
  lobsterTail(d);
  lobsterHead(d);
  for (let i = 0; i < 4; i++) {
    const s = gait(d, i, 4, 4);
    limb(d, jointed(pt(36 - i * 10, 12), pt(50 - i * 16 + s.x, d.g + s.y), 8, 3), [4.5, 4, 3, 0.8], LOBSTER_WASH, false, LOBSTER_TIP);
  }
  claw(d, -6, 6, 1, LOBSTER_WASH, open, false, 1.35);
}

// ---------------------------------------------------------------- spider crab

const SPIDER_WASH = '#c4692f';

function spiderLegs(d: D, far: boolean): void {
  const hips = [20, 8, -8, -20];
  const reach = [104, 58, -52, -104];
  hips.forEach((hx, i) => {
    const step = gait(d, i + (far ? 1 : 0), 7, 7);
    const hip = far ? pt(hx + 4, -4) : pt(hx, 2);
    const foot = pt(reach[i]! * (far ? 0.8 : 1) + step.x, d.g - (far ? 4 : 0) + step.y);
    limb(d, jointed(hip, foot, far ? 32 : 36, 8), [6.5, 5, 3.6, 1], SPIDER_WASH, far);
  });
}

function spiderCrab(d: D): void {
  const { pen } = d;
  spiderLegs(d, true);
  // Near legs too: the round body sits in front of their bases.
  spiderLegs(d, false);
  const open = [1, 3, 2][d.f]!;
  limb(d, [pt(24, 0), pt(48, 8), pt(58, 32), pt(60, 48)], [5, 4, 3, 1.2], SPIDER_WASH, true);
  const top = serrate(cub(pt(-34, 4), pt(-38, -34), pt(16, -38), pt(36, -14), 18), 2, 14, 3, 2.5);
  const body = [...top, pt(50, -24), pt(40, -8), ...cub(pt(38, -6), pt(30, 16), pt(-24, 20), pt(-34, 4), 12).slice(1)];
  skin(d, body, SPIDER_WASH, 1.8);
  mottle(d, body, 200, -32, 10, '#6a2e12');
  pen.stipple(body, 120, () => 0.6, 0.9, PAPER_FILL);
  shade(d, body, 0);
  edge(d, body);
  pen.stroke([pt(32, -12), pt(36, -18)], 2, d.ink, 1, false);
  eyeDot(d, 37, -19, 2.4);
  // Chelipeds held down in front with small claws.
  const arm = [pt(28, 4), pt(54, 14), pt(68, 38)];
  limb(d, arm, [6, 5, 4], SPIDER_WASH);
  const tip = arm[2]!;
  limb(d, [tip, add(tip, pt(2, 14))], [4, 1], SPIDER_WASH);
  limb(d, [tip, add(tip, pt(6 + open, 12))], [3, 1], SPIDER_WASH);
}

// ---------------------------------------------------------------- isopod

const ISOPOD_WASH = '#8e809e';
const ISO_TOP = (x: number): number => -28 * Math.pow(Math.max(0, 1 - (x / 88) ** 2), 0.55) + 4;

function isopodBody(): Pt[] {
  const top = Array.from({ length: 45 }, (_, i) => {
    const x = -86 + (i / 44) * 172;
    return pt(x, ISO_TOP(x));
  });
  // Underside: the side plates hang down as backward-pointing lobes.
  const bot = Array.from({ length: 61 }, (_, i) => {
    const x = 86 - (i / 60) * 172;
    const lobe = x < 62 && x > -40 ? 4 * (((62 - x) / 14.6) % 1) : 0;
    const round = Math.abs(x) > 74 ? (Math.abs(x) - 74) * 0.9 : 0;
    return pt(x, 10 + lobe - round);
  });
  return [...top, ...bot];
}

function isopod(d: D): void {
  const { pen, f } = d;
  const legX = Array.from({ length: 7 }, (_, i) => 54 - i * 14.6);
  const leg = (x: number, i: number, far: boolean): void => {
    const s = gait(d, i + (far ? 1 : 0), 3, 3);
    const hip = pt(x - 4 + (far ? 4 : 0), far ? 6 : 10);
    const dir = x > 0 ? 1 : -1;
    limb(d, [hip, pt(hip.x + dir * 6, hip.y + 10), pt(hip.x + dir * 4 + s.x, d.g - (far ? 2 : 0) + s.y)], [5, 4, 1], ISOPOD_WASH, far);
  };
  legX.forEach((x, i) => leg(x, i, true));
  // Antennae: a long pair sweeping down and forward, short antennules on top.
  const sway = [0, 2, -2][f]!;
  feeler(d, cub(pt(80, 2), pt(104, 2), pt(112, 18 + sway), pt(100, 30), 12), 1.6);
  feeler(d, cub(pt(82, -4), pt(92, -10), pt(98, -12), pt(104, -8 + sway), 8), 1);
  // Uropods out of the tail.
  limb(d, [pt(-72, 4), pt(-94, 8)], [8, 3], ISOPOD_WASH, true);
  const body = isopodBody();
  skin(d, body, ISOPOD_WASH, 1.5);
  pen.clipped(body, () => {
    // Armour plates: head, seven body rings, small tail rings, the tail shield.
    const cuts = [62, ...legX.map((x) => x - 7.6), -46, -52, -58, -64];
    cuts.forEach((x, i) => {
      pen.stroke(bezier(pt(x, ISO_TOP(x) - 1), pt(x - 5, -8), pt(x - 3, 14), 6), i < 8 ? 1 : 0.7, d.ink, 0.9, false);
      pen.hair(bezier(pt(x - 3, ISO_TOP(x - 3) + 2), pt(x - 7, -6), pt(x - 6, 10), 6), 1.4, PAPER_FILL, 0.5);
    });
    mottle(d, body, 260, -26, 10, '#3e3450');
  });
  shade(d, body, -2);
  edge(d, body);
  // Big compound eye on the head.
  const eye = ellipse(72, -10, 6, 4.5, 14);
  pen.fill(eye, d.ink, 0.85);
  pen.stipple(eye, 40, () => 0.7, 0.5, PAPER_FILL);
  legX.forEach((x, i) => leg(x, i, false));
  limb(d, [pt(-74, 8), pt(-96, 14)], [8, 3], ISOPOD_WASH);
}

// ---------------------------------------------------------------- sea pig

const PIG_WASH = '#e08a96';

/** Soft translucent part: paper, pink wash, thin outline. */
function jelly(d: D, shape: readonly Pt[], far: boolean): void {
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.fill(shape, PIG_WASH, far ? 0.55 : d.heavy ? 0.45 : 0.3);
  if (d.heavy) d.pen.fill(shape, RED, 0.1);
  d.pen.stroke(closed(shape), (far ? 0.7 : 1) * (d.heavy ? 1.25 : 1), d.ink, far ? 0.7 : 1, false);
}

/** Stubby conical tube-feet legs that step in turn. */
function pigLegs(d: D, far: boolean): void {
  [44, 20, -4, -28, -52].forEach((x, i) => {
    const s = gait(d, i + (far ? 1 : 0), 6, 5);
    const hip = far ? pt(x + 12, 8) : pt(x, 12);
    const foot = pt(x + (x > 0 ? 5 : -3) + s.x, d.g - 4 - (far ? 3 : 0) + s.y);
    jelly(d, capsule(hip, foot, 15, 8), far);
    if (!far) d.pen.hair([add(foot, pt(-2, -1)), add(foot, pt(2, -1))], 0.5, d.ink, 0.6);
  });
}

/** One of the long back papillae the sea pig waves like antennae. */
function papilla(d: D, base: Pt, len: number, far: boolean): void {
  const sway = [0, 3, -2][d.f]! * (far ? -1 : 1);
  const path = cub(base, add(base, pt(-2, -len * 0.4)), add(base, pt(6 + sway, -len * 0.8)), add(base, pt(14 + sway, -len)), 10);
  jelly(d, tube(path, 6, 1.6), far);
}

function seaPig(d: D): void {
  const { pen } = d;
  pigLegs(d, true);
  papilla(d, pt(34, -24), 28, true);
  papilla(d, pt(20, -26), 24, true);
  const body = ellipse(0, -4, 68, 28, 48).map((p, i) => {
    const lump = 1 + 0.025 * Math.sin(i * 1.7);
    return pt(p.x * lump, Math.min(16, -4 + (p.y + 4) * lump));
  });
  skin(d, body, PIG_WASH, 1.1);
  pen.clipped(body, () => {
    // Gut showing through the jelly, and fine pores.
    pen.hair(cub(pt(58, 2), pt(20, -12), pt(-20, 8), pt(-60, -2), 16), 2, '#a24a5a', 0.25);
    pen.stipple(body, 160, () => 0.5, 0.7, PAPER_FILL);
    pen.hair(cub(pt(-60, -18), pt(-20, -30), pt(30, -32), pt(60, -16), 16), 1.8, PAPER_FILL, 0.6);
  });
  shade(d, body, 4, 0.4);
  edge(d, body, 1.5);
  pigLegs(d, false);
  papilla(d, pt(40, -24), 32, false);
  papilla(d, pt(26, -28), 26, false);
  // Mouth: a ring of short feeding tentacles under the front end.
  for (let i = 0; i < 5; i++) {
    const a = 0.2 + i * 0.32;
    const b = pt(60 + Math.cos(a) * 4, 8 + Math.sin(a) * 3);
    jelly(d, capsule(b, add(b, pt(Math.cos(a) * 8, Math.sin(a) * 8)), 4, 3), false);
  }
}

// ---------------------------------------------------------------- entry

const DRAW: Record<CritterId, (d: D) => void> = {
  shorecrab: shoreCrab, periwinkle, shrimp, hermitcrab: hermitCrab, urchin, lobster, spidercrab: spiderCrab, isopod, seapig: seaPig,
};

/** Draws one boil frame of a crawler facing right; `frame` (0..2) also sets the leg pose. */
export function drawCritter(ctx: CanvasRenderingContext2D, kind: CritterId, variant: 'light' | 'heavy', frame: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.5);
  ctx.save();
  ctx.translate(C, C);
  DRAW[kind]({ pen, heavy: variant === 'heavy', f: ((frame % 3) + 3) % 3, ink: INK, g: CRITTER_BODY[kind].foot, tone: kind === 'lobster' ? 1.7 : 1 });
  ctx.restore();
}
