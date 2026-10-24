import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import type { Joint } from './crownElitePaint';
import type { Pose } from './types';

/**
 * The rig behind the Crown's mounted figures (the Lancer and the hero): it
 * turns a Pose into where the horse's parts go, and the drawing code in
 * crownMountHorse.ts / crownMountRider.ts paints the same parts through it.
 *
 * - The body (torso, saddle, rider, tail, caparison) is one rigid piece:
 *   `body` maps its drawing (made in the standing pose's coordinates) into
 *   the figure, pitching it about the girth and lifting it with the gait.
 * - The neck bends from its base (`warp` bends any body point by how far up
 *   the neck it sits); the head rides on the neck's end (`head`), nodding.
 * - Each leg is a chain: a shoulder (or hip) pivot inside the body, the
 *   upper limb, forearm (gaskin), cannon and pastern, solved so a planted
 *   hoof stays put on the ground while the body moves over it, and a
 *   swinging leg folds and reaches.
 * - The rider's upper body (`upper`) leans and breathes over the seat.
 */

/** A 2D affine map, as canvas's transform(a, b, c, d, e, f). */
export interface Affine {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

const RAD = Math.PI / 180;

/** Rotation by `deg` (clockwise on screen, y down) about `c`, then a shift. */
export function rotAbout(c: Pt, deg: number, dx = 0, dy = 0): Affine {
  const cs = Math.cos(deg * RAD);
  const sn = Math.sin(deg * RAD);
  return { a: cs, b: sn, c: -sn, d: cs, e: c.x - cs * c.x + sn * c.y + dx, f: c.y - sn * c.x - cs * c.y + dy };
}

export function apply(m: Affine, p: Pt): Pt {
  return pt(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
}

export function invert(m: Affine): Affine {
  const det = m.a * m.d - m.b * m.c;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
}

/** `outer` after `inner`. */
export function compose(o: Affine, i: Affine): Affine {
  return {
    a: o.a * i.a + o.c * i.b,
    b: o.b * i.a + o.d * i.b,
    c: o.a * i.c + o.c * i.d,
    d: o.b * i.c + o.d * i.d,
    e: o.a * i.e + o.c * i.f + o.e,
    f: o.b * i.e + o.d * i.f + o.f,
  };
}

/** Runs `draw` with `m` applied to the canvas. */
export function within(d: Draw, m: Affine, draw: () => void): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  draw();
  ctx.restore();
}

/** Maps [x, y] pairs through `f`. */
export function mapXY(xy: readonly (readonly [number, number])[], f: (p: Pt) => Pt): [number, number][] {
  return xy.map(([x, y]) => {
    const p = f(pt(x, y));
    return [p.x, p.y];
  });
}

// ─── Curves ────────────────────────────────────────────────────────────────

type Key = readonly [at: number, value: number];

/** A smooth curve through keys (Catmull-Rom); `loop` wraps it round 0..1. */
export function spline(keys: readonly Key[], x: number, loop = false): number {
  const n = keys.length;
  if (n === 1) return keys[0]![1];
  const at = (k: number): Key => {
    if (!loop) return keys[Math.max(0, Math.min(n - 1, k))]!;
    const i = ((k % n) + n) % n;
    const [p, v] = keys[i]!;
    return [p + Math.floor(k / n), v];
  };
  let u = loop ? ((x % 1) + 1) % 1 : Math.max(keys[0]![0], Math.min(keys[n - 1]![0], x));
  let i = loop ? n - 1 : 0;
  for (let k = 0; k < n - (loop ? 0 : 1); k++) if (keys[k]![0] <= u) i = k;
  const [p1, v1] = at(i);
  if (loop && u < p1) u += 1;
  const [p0, v0] = at(i - 1);
  const [p2, v2] = at(i + 1);
  const [p3, v3] = at(i + 2);
  const span = p2 - p1 || 1;
  const s = (u - p1) / span;
  const m1 = p2 === p0 ? 0 : ((v2 - v0) / (p2 - p0)) * span;
  const m2 = p3 === p1 ? 0 : ((v3 - v1) / (p3 - p1)) * span;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v1 + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * v2 + (s3 - s2) * m2;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Five attack keys at t = 0, .25, .5, .75, 1 (the baked frames), eased between. */
export type Beat = readonly [number, number, number, number, number];

export function beat(v: Beat, t: number): number {
  const x = Math.max(0, Math.min(1, t)) * 4;
  const i = Math.min(3, Math.floor(x));
  const e = smoothstep(0, 1, x - i);
  return v[i]! + (v[i + 1]! - v[i]!) * e;
}

// ─── Legs ──────────────────────────────────────────────────────────────────

/** A leg's eight joints (body to hoof: top, upper, mid, knee or hock, two on the cannon, fetlock, coronet) and its hoof's turn. */
export interface LegPose {
  readonly joints: readonly Joint[];
  /** Hoof turn: 0 flat on the ground. */
  readonly tilt: number;
}

export type LegName = 'nearFore' | 'farFore' | 'nearHind' | 'farHind';
export type Legs = Readonly<Record<LegName, LegPose>>;
const LEG_NAMES: readonly LegName[] = ['nearFore', 'farFore', 'nearHind', 'farHind'];

/** Standing foreleg, its cannon at x. */
const STAND_FORE = (x: number): LegPose => ({
  joints: [[x - 1, -36, 11], [x, -27.6, 8], [x + 0.4, -18, 4.6], [x + 0.6, -14.4, 5.2], [x + 0.5, -10.6, 3.5], [x + 0.4, -6.4, 3.4], [x + 0.8, -4.6, 4.3], [x + 2.4, -3, 3.3]],
  tilt: 0,
});

/** A hind leg standing, its cannon at x: thigh, gaskin angled back to the point of the hock, then plumb. */
const STAND_HIND = (x: number): LegPose => ({
  joints: [[x + 8, -40, 18], [x + 4, -29, 13], [x + 1.4, -22.4, 8], [x - 1.4, -16.8, 6.2], [x - 0.5, -12.6, 3.8], [x, -6.6, 3.6], [x + 0.2, -4.6, 4.4], [x + 1.8, -3, 3.3]],
  tilt: 0,
});

/** The standing poses the figures rest in. */
export type Stance = 'charge' | 'walk';

const STANCES: Readonly<Record<Stance, Legs>> = {
  // Charging: the near fore folded high, the far hind thrust back.
  charge: {
    nearFore: {
      joints: [[14, -36, 11], [16.8, -28.4, 8], [22, -22.6, 4.8], [23.8, -20, 5.3], [23.2, -16.5, 3.5], [21.6, -12.2, 3.4], [21, -10.6, 4.3], [19.6, -8.6, 3.3]],
      tilt: 0.7,
    },
    farFore: STAND_FORE(11),
    nearHind: STAND_HIND(-27),
    farHind: {
      joints: [[-19, -39, 15], [-22.6, -29, 12], [-27.6, -22, 7.6], [-31.6, -17.4, 5.8], [-32.6, -13.4, 3.6], [-34, -7.2, 3.4], [-34.2, -4.9, 4.2], [-33, -3, 3.2]],
      tilt: -0.12,
    },
  },
  // Walking: the far fore lifted mid-stride, the hinds apart.
  walk: {
    nearFore: STAND_FORE(15.6),
    farFore: {
      joints: [[10, -36, 10], [11.4, -27.6, 7.6], [13.6, -18.4, 4.4], [14.2, -15, 5], [13, -11.4, 3.3], [10.8, -8, 3.2], [10.1, -6.6, 4.1], [9.8, -4.8, 3.2]],
      tilt: 0.95,
    },
    nearHind: STAND_HIND(-28.4),
    farHind: STAND_HIND(-21.6),
  },
};

/** The legs' places in the gallop, and when each hoof strikes the ground (fraction of the stride). */
const GALLOP_REST: Legs = { nearFore: STAND_FORE(14.6), farFore: STAND_FORE(11), nearHind: STAND_HIND(-26.4), farHind: STAND_HIND(-22.6) };
const STRIKE: Readonly<Record<LegName, number>> = { farHind: 0.05, nearHind: 0.17, farFore: 0.4, nearFore: 0.52 };
/** Each hoof is down for this much of the stride; all four are up from about 0.82 to 1.05 (the suspension). */
const DUTY = 0.3;

/** The pivot joints of the chain, indices into the eight: top, elbow/stifle, knee/hock, fetlock, coronet. */
const PIV = [0, 1, 3, 6, 7] as const;

const v2 = (a: Pt, b: Pt): Pt => pt(b.x - a.x, b.y - a.y);
const len = (p: Pt): number => Math.hypot(p.x, p.y);
/** A unit vector `deg` from straight down, positive toward the front. */
const down = (deg: number): Pt => pt(Math.sin(deg * RAD), Math.cos(deg * RAD));
const angleOf = (p: Pt): number => Math.atan2(p.x, p.y) / RAD;

interface Chain {
  readonly rest: LegPose;
  readonly piv: readonly Pt[];
  readonly upper: number;
  readonly fore: number;
  readonly cannon: number;
  readonly pastern: number;
  readonly cannonRest: number;
  readonly pasternRest: number;
  /** Shoulder or hip pivot (body coordinates). */
  readonly pivot: Pt;
  /** +1 bends the elbow back (forelegs), −1 the stifle forward (hinds). */
  readonly bend: number;
}

function chainOf(rest: LegPose, isFore: boolean): Chain {
  const piv = PIV.map((i) => pt(rest.joints[i]![0], rest.joints[i]![1]));
  const [j0, j1, k, fet, cor] = piv as [Pt, Pt, Pt, Pt, Pt];
  return {
    rest,
    piv,
    upper: len(v2(j0, j1)),
    fore: len(v2(j1, k)),
    cannon: len(v2(k, fet)),
    pastern: len(v2(fet, cor)),
    cannonRest: angleOf(v2(k, fet)),
    pasternRest: angleOf(v2(fet, cor)),
    pivot: isFore ? pt(j0.x + 2, j0.y - 16) : pt(j0.x - 3, j0.y - 10),
    bend: isFore ? 1 : -1,
  };
}

/** What a leg is doing: a hoof planted where it is, or a knee carried somewhere; and the lower leg's angles. */
interface LegAim {
  readonly hoof?: Pt;
  readonly knee?: Pt;
  /** Degrees from straight down, positive toward the front. */
  readonly cannon: number;
  readonly pastern: number;
  readonly tilt: number;
}

/** Re-places joint `q` of the rest bone a0→b0 on the posed bone a→b. */
function onBone(q: Pt, a0: Pt, b0: Pt, a: Pt, b: Pt): Pt {
  const r = v2(a0, b0);
  const l0 = len(r) || 1;
  const u0 = pt(r.x / l0, r.y / l0);
  const d = v2(a0, q);
  const along = d.x * u0.x + d.y * u0.y;
  const across = -d.x * u0.y + d.y * u0.x;
  const s = v2(a, b);
  const l = len(s) || 1;
  const u = pt(s.x / l, s.y / l);
  return pt(a.x + u.x * along - u.y * across, a.y + u.y * along + u.x * across);
}

/** Solves a leg on the posed body: the shoulder turns as much as it must to reach, then the elbow (stifle) bends. */
function solveLeg(ch: Chain, aim: LegAim, body: Affine): LegPose {
  const p = down(aim.pastern);
  const c = down(aim.cannon);
  let knee = aim.knee ?? pt(aim.hoof!.x - p.x * ch.pastern - c.x * ch.cannon, aim.hoof!.y - p.y * ch.pastern - c.y * ch.cannon);
  // The shoulder: its pivot rides the body; the leg's top swings round it to reach a far knee.
  const pivot = apply(body, ch.pivot);
  const top0 = apply(body, ch.piv[0]!);
  const r = len(v2(pivot, top0));
  const reach = (ch.upper + ch.fore) * 0.985;
  let top = top0;
  if (len(v2(top, knee)) > reach) {
    const toK = v2(pivot, knee);
    const dist = len(toK);
    const cos = Math.max(-1, Math.min(1, (r * r + dist * dist - reach * reach) / (2 * r * dist)));
    const g = Math.acos(cos);
    const base = Math.atan2(toK.y, toK.x);
    const was = Math.atan2(top0.y - pivot.y, top0.x - pivot.x);
    const turn = (a: number): number => Math.abs(Math.atan2(Math.sin(a - was), Math.cos(a - was)));
    const a = turn(base + g) < turn(base - g) ? base + g : base - g;
    top = pt(pivot.x + Math.cos(a) * r, pivot.y + Math.sin(a) * r);
  }
  // Two-bone reach from the top to the knee (hock).
  const tk = v2(top, knee);
  const d = Math.max(Math.abs(ch.upper - ch.fore) + 0.01, Math.min(ch.upper + ch.fore, len(tk)));
  const dir = Math.atan2(tk.y, tk.x);
  knee = pt(top.x + Math.cos(dir) * d, top.y + Math.sin(dir) * d);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (ch.upper ** 2 + d * d - ch.fore ** 2) / (2 * ch.upper * d))));
  const elbow = pt(top.x + Math.cos(dir + ch.bend * alpha) * ch.upper, top.y + Math.sin(dir + ch.bend * alpha) * ch.upper);
  const fet = pt(knee.x + c.x * ch.cannon, knee.y + c.y * ch.cannon);
  const cor = pt(fet.x + p.x * ch.pastern, fet.y + p.y * ch.pastern);
  const [, r1, rk, rf] = ch.piv as [Pt, Pt, Pt, Pt, Pt];
  const placed: Pt[] = [
    top,
    elbow,
    onBone(pt(ch.rest.joints[2]![0], ch.rest.joints[2]![1]), r1, rk, elbow, knee),
    knee,
    onBone(pt(ch.rest.joints[4]![0], ch.rest.joints[4]![1]), rk, rf, knee, fet),
    onBone(pt(ch.rest.joints[5]![0], ch.rest.joints[5]![1]), rk, rf, knee, fet),
    fet,
    cor,
  ];
  return { joints: placed.map((q, i) => [q.x, q.y, ch.rest.joints[i]![2]] as Joint), tilt: aim.tilt };
}

/** A leg left where it stands: hoof planted, or (lifted) carried with the body; `paw` stirs a lifted one. */
function restAim(ch: Chain, body: Affine, paw: Paw): LegAim {
  const cor = ch.piv[4]!;
  if (cor.y > -3.6) return { hoof: cor, cannon: ch.cannonRest, pastern: ch.pasternRest, tilt: ch.rest.tilt };
  const k = apply(body, ch.piv[2]!);
  return {
    knee: pt(k.x + paw.dx, k.y + paw.dy),
    cannon: ch.cannonRest + paw.fold,
    pastern: ch.pasternRest + paw.fold * 1.3,
    tilt: ch.rest.tilt - paw.fold * 1.3 * RAD,
  };
}

interface Paw {
  readonly dx: number;
  readonly dy: number;
  /** Degrees the cannon swings (negative folds it back). */
  readonly fold: number;
}

/** How a fore or hind leg moves in the gallop. */
interface GaitSpec {
  /** Hoof strikes this far ahead of its rest place, and leaves the ground this far back (`push`). */
  readonly reach: number;
  readonly push: number;
  /** Cannon angle at strike and at lift-off; pastern at strike, mid-stance (fetlock sunk) and lift-off. */
  readonly cannon: readonly [number, number];
  readonly pastern: readonly [number, number, number];
  /** How high the knee (hock) rises in the swing, and how far ahead it carries. */
  readonly lift: number;
  readonly ahead: number;
  /** Cannon and pastern through the swing (0 lift-off .. 1 strike). */
  readonly fold: readonly Key[];
  readonly pfold: readonly Key[];
}

const FORE_GAIT: GaitSpec = {
  reach: 11, push: -13, cannon: [16, -28], pastern: [40, 68, 25], lift: 9, ahead: 4,
  fold: [[0, -28], [0.25, -112], [0.55, -96], [0.8, -6], [1, 16]],
  pfold: [[0, 25], [0.25, -150], [0.55, -128], [0.8, 4], [1, 40]],
};

const HIND_GAIT: GaitSpec = {
  reach: 10, push: -16, cannon: [12, -44], pastern: [40, 62, 22], lift: 6.5, ahead: 1.5,
  fold: [[0, -44], [0.25, -78], [0.55, -26], [0.8, 20], [1, 12]],
  pfold: [[0, 22], [0.25, -92], [0.55, -40], [0.8, 38], [1, 40]],
};

/** One leg in the gallop at stride phase `s` (0 = its hoof strikes the ground). */
function gallopAim(ch: Chain, isFore: boolean, s: number): LegAim {
  const g = isFore ? FORE_GAIT : HIND_GAIT;
  const cor = ch.piv[4]!;
  const hoofAt = (u: number): Pt => pt(cor.x + g.reach + (g.push - g.reach) * u, cor.y);
  const kneeFrom = (h: Pt, cannon: number, pastern: number): Pt => {
    const p = down(pastern);
    const c = down(cannon);
    return pt(h.x - p.x * ch.pastern - c.x * ch.cannon, h.y - p.y * ch.pastern - c.y * ch.cannon);
  };
  const [cTD, cLO] = g.cannon;
  const [pTD, pMid, pLO] = g.pastern;
  if (s < DUTY) {
    const u = s / DUTY;
    const pastern = spline([[0, pTD], [0.5, pMid], [1, pLO]], u);
    const tiltW = smoothstep(0.7, 1, u) * 0.45;
    return { hoof: hoofAt(u), cannon: cTD + (cLO - cTD) * u, pastern, tilt: -tiltW * (pastern - ch.pasternRest) * RAD };
  }
  const v = (s - DUTY) / (1 - DUTY);
  const k0 = kneeFrom(hoofAt(1), cLO, pLO);
  const k1 = kneeFrom(hoofAt(0), cTD, pTD);
  const e = smoothstep(0, 1, v);
  const arc = Math.sin(Math.PI * Math.min(1, v * 1.08));
  const knee = pt(k0.x + (k1.x - k0.x) * e + g.ahead * arc, k0.y + (k1.y - k0.y) * e - g.lift * arc);
  const cannon = spline(g.fold, v);
  const pastern = spline(g.pfold, v);
  const tiltW = v < 0.15 ? 0.45 + 0.55 * smoothstep(0, 0.15, v) : 1 - smoothstep(0.72, 1, v);
  return { knee, cannon, pastern, tilt: -tiltW * (pastern - ch.pasternRest) * RAD };
}

// ─── Motion ────────────────────────────────────────────────────────────────

/** The whole figure's motion at one moment (units and degrees). */
export interface Motion {
  /** Body shift and pitch (positive pitch dips the nose). */
  readonly dx: number;
  readonly dy: number;
  readonly pitch: number;
  /** Neck bend (positive lowers the head) and the head's own nod. */
  readonly neck: number;
  readonly nod: number;
  /** Rider: lean from the hips (positive forward) and the chest's rise (negative up). */
  readonly lean: number;
  readonly breath: number;
  /** Tail: raised (degrees), swung back at the end (units). */
  readonly tailLift: number;
  readonly swish: number;
  /** How hard the air pulls at cloth: 0 standing, 1 at the gallop. */
  readonly wind: number;
  /** A lifted leg's pawing. */
  readonly paw: Paw;
}

/** An attack's motion: each channel keyed at the five baked frames (missing ones stay still). */
export type AttackMotion = Partial<Record<Exclude<keyof Motion, 'paw'> | 'pawDx' | 'pawDy' | 'pawFold', Beat>>;

function idleMotion(t: number): Motion {
  const w = t * Math.PI * 2;
  return {
    dx: 0.7 * Math.sin(w),
    dy: 0.35 * Math.sin(w + 1.6),
    pitch: 0.6 * Math.sin(w + 0.5),
    neck: 2.6 * Math.sin(w - 0.7),
    nod: 2.2 * Math.sin(w + 1.4),
    lean: 0.8 * Math.sin(w - 1),
    breath: -0.45 * (1 - Math.cos(w)),
    tailLift: 2 * Math.sin(w + 2.2),
    swish: 2.6 * Math.sin(w + 2.6),
    wind: 0.15,
    paw: { dx: 1.1 * Math.sin(w), dy: -1.2 * Math.max(0, Math.sin(w)), fold: 9 * Math.sin(w) },
  };
}

function gallopMotion(t: number): Motion {
  const w = t * Math.PI * 2;
  const pitch = spline([[0.05, -0.6], [0.25, -3.4], [0.45, -0.6], [0.65, 3], [0.85, 1]], t, true);
  return {
    dx: 0,
    dy: spline([[0, -1.4], [0.25, 0.9], [0.45, 0.2], [0.63, 1.5], [0.8, 0.2], [0.93, -2.2]], t, true),
    pitch,
    neck: spline([[0.1, -2], [0.3, -4.5], [0.55, 3.4], [0.72, 5.4], [0.9, 0.5]], t, true),
    nod: spline([[0.25, -2.5], [0.7, 3]], t, true),
    lean: 6 - pitch * 0.6,
    breath: spline([[0.27, 0.5], [0.65, 0.7], [0.93, -0.5]], t, true),
    tailLift: 15 + 5 * Math.sin(w - 1.2),
    swish: 2.4 * Math.sin(w - 2),
    wind: 1,
    paw: { dx: 0, dy: 0, fold: 0 },
  };
}

function attackMotion(t: number, a: AttackMotion): Motion {
  const k = (b: Beat | undefined): number => (b ? beat(b, t) : 0);
  return {
    dx: k(a.dx),
    dy: k(a.dy),
    pitch: k(a.pitch),
    neck: k(a.neck),
    nod: k(a.nod),
    lean: k(a.lean),
    breath: k(a.breath),
    tailLift: k(a.tailLift),
    swish: k(a.swish),
    wind: 0.15 + k(a.wind),
    paw: { dx: k(a.pawDx), dy: k(a.pawDy), fold: k(a.pawFold) },
  };
}

// ─── The rig ───────────────────────────────────────────────────────────────

/** Where the body pitches about (the girth), the neck bends from, and the head nods about. */
const GIRTH = pt(-4, -40);
const NECK_BASE = pt(10, -50);
const NECK_TIP = pt(25, -72);
const THROAT = pt(26.5, -69);
/** The rider's hip in body coordinates (crownMountRider's RIDER.hip on the scaled rider). */
const RIDER_HIP = pt(-4.54, -54.39);

export interface MountRig {
  readonly motion: Motion;
  /** Loop phase 0..1 (idle and walk), or the attack's t. */
  readonly t: number;
  readonly kind: Pose['kind'];
  /** Body drawing → figure. */
  readonly body: Affine;
  /** Head drawing → body drawing. */
  readonly head: Affine;
  /** Bends a body-drawing point by the neck. */
  readonly warp: (p: Pt) => Pt;
  /** Rider's upper body (drawn as if sitting still) → body drawing. */
  readonly upper: Affine;
  /** The legs, in figure coordinates. */
  readonly legs: Legs;
}

/** The rig for a horse resting in `stance`, at `pose`; `attack` is the figure's own strike. */
export function mountRig(stance: Stance, pose: Pose, attack: AttackMotion): MountRig {
  const { kind, t } = pose;
  const m = kind === 'walk' ? gallopMotion(t) : kind === 'attack' ? attackMotion(t, attack) : idleMotion(t);
  const body = rotAbout(GIRTH, m.pitch, m.dx, m.dy);
  const axis = v2(NECK_BASE, NECK_TIP);
  const axisLen = len(axis);
  const warp = (p: Pt): Pt => {
    const q = v2(NECK_BASE, p);
    const u = (q.x * axis.x + q.y * axis.y) / (axisLen * axisLen);
    const k = smoothstep(0.2, 0.85, u);
    return k === 0 ? p : apply(rotAbout(NECK_BASE, m.neck * k), p);
  };
  const head = compose(rotAbout(NECK_BASE, m.neck), rotAbout(THROAT, m.nod));
  const upper = rotAbout(RIDER_HIP, m.lean, 0, m.breath);
  const rest = kind === 'walk' ? GALLOP_REST : STANCES[stance];
  const legs = Object.fromEntries(
    LEG_NAMES.map((name) => {
      const isFore = name.endsWith('Fore');
      const ch = chainOf(rest[name], isFore);
      const aim = kind === 'walk' ? gallopAim(ch, isFore, (((t - STRIKE[name]) % 1) + 1) % 1) : restAim(ch, body, m.paw);
      return [name, solveLeg(ch, aim, body)];
    }),
  ) as unknown as Legs;
  return { motion: m, t, kind, body, head, warp, upper, legs };
}
