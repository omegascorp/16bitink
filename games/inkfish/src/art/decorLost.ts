import { createRng } from '../logic/rng';
import { INK, type Pt } from './pen';
import { along, barnacle, clip, closed, dots, type Draw, drift, frame, hair, hull, ink, IRON, iron, lerp, oval, paint, PAPER_FILL, pt, puff, qb, resample, ribbon, ring, rotOval, S, SHADOW, TAU, TERRACOTTA, unit, WOOD } from './decorKit';

/**
 * Lost human-made things on the seabed: an anchor, amphorae, a lobster pot
 * and a cannon, a bit rusty and encrusted. Each piece stands on the canvas's
 * bottom edge, centred; see the drawing contract in decorArt.ts.
 */
export type LostDecorId = 'anchor' | 'amphora' | 'lobsterpot' | 'cannon';
// ---------------------------------------------------------------- anchor

function anchor(d: Draw): void {
  const { rng } = d;
  puff(d, 4, -4, 56, 6, SHADOW, 0.4);
  const C = pt(-14, -9);
  const T = pt(18 + rng() * 4, -124);
  const len = Math.hypot(T.x - C.x, T.y - C.y);
  const dir = unit(T.x - C.x, T.y - C.y);
  const nrm = pt(-dir.y, dir.x);
  for (const s of [-1, 1]) anchorArm(d, C, dir, nrm, s);
  const shank = ribbon([C, T], (u) => 3.6 - u * 0.9);
  iron(d, shank.shape, 1.2);
  hair(d, [along(C, nrm, -1.6), along(T, nrm, -1.2)], 0.6, 0.55, PAPER_FILL);
  anchorStock(d, along(C, dir, len * 0.83));
  const R = along(T, dir, 4.5);
  d.pen.stroke(d.L(closed(oval(R.x, R.y, 6.5, 6.5, 18))), 3 * S, IRON, 1, false);
  ring(d, oval(R.x, R.y, 8, 8, 18), 0.8);
  ring(d, oval(R.x, R.y, 5, 5, 16), 0.7);
  chain(d, pt(R.x + 5, R.y + 5));
  drift(d, -36, 38, -1, 9);
  for (let i = 0; i < 5; i++) {
    const p = along(C, dir, 22 + rng() * (len - 40));
    barnacle(d, p.x + (rng() - 0.5) * 3, p.y, 1.1 + rng() * 0.6);
  }
}

/** A curved arm with its spade-shaped fluke. */
function anchorArm(d: Draw, C: Pt, dir: Pt, nrm: Pt, s: number): void {
  const tip = along(along(C, nrm, s * 33), dir, 16);
  const arm = qb(C, along(along(C, nrm, s * 20), dir, -1), tip, 12);
  iron(d, ribbon(arm, (u) => 3.4 - u * 1.2).shape, 1.1);
  const prev = arm[arm.length - 3]!;
  const t = unit(tip.x - prev.x, tip.y - prev.y);
  const n = pt(-t.y, t.x);
  const fluke = [along(tip, t, 7), along(along(tip, n, 5.5), t, -2), along(along(tip, n, 1.5), t, -7), along(along(tip, n, -1.5), t, -7), along(along(tip, n, -5.5), t, -2)];
  iron(d, fluke, 1.1);
}

/** The stock: a tapered crossbar with ball ends, square to the arms. */
function anchorStock(d: Draw, Q: Pt): void {
  const s = unit(1, d.rng() < 0.5 ? 0.36 : -0.3);
  const bar = ribbon([along(Q, s, -28), Q, along(Q, s, 28)], (u) => 1.6 + 1.3 * Math.sin(Math.PI * u));
  iron(d, bar.shape, 1.1);
  for (const k of [-29, 29]) {
    const e = along(Q, s, k);
    iron(d, oval(e.x, e.y, 2.6, 2.6, 12), 0.9);
  }
  const collar = ribbon([along(Q, s, -2.5), along(Q, s, 2.5)], () => 4.4);
  iron(d, collar.shape, 0.9);
}

/** Chain hanging from the ring and lying on the sand: open and edge-on links. */
function chain(d: Draw, start: Pt): void {
  const path = [...qb(start, pt(start.x + 34, start.y + 50), pt(48, -5), 40), ...qb(pt(48, -5), pt(54, -3), pt(57, -6), 8).slice(1)];
  const links = resample(path, 5.2);
  links.forEach((p, i) => {
    const q = links[i + 1];
    if (!q) return;
    const m = pt((p.x + q.x) / 2, (p.y + q.y) / 2);
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    if (i % 2 === 0) {
      d.pen.stroke(d.L(rotOval(m.x, m.y, 3.4, 2.1, ang, 12)), 1.5 * S, IRON, 1, false);
      ring(d, rotOval(m.x, m.y, 4.1, 2.8, ang, 12), 0.55);
    } else {
      ink(d, [along(m, pt(Math.cos(ang), Math.sin(ang)), -3.6), along(m, pt(Math.cos(ang), Math.sin(ang)), 3.6)], 1.3);
    }
  });
}

// ---------------------------------------------------------------- amphorae

/** Amphora profile: [distance from the mouth, radius]. */
const AMPHORA: readonly (readonly [number, number])[] = [
  [0, 4.8], [2.5, 4.8], [3, 3.4], [11, 3.6], [15, 7], [19, 10.5], [26, 12.2], [34, 11.8], [42, 9.5], [50, 5.5], [56, 2.6], [59, 2.2], [62, 1.4],
];

function amphoraRadius(x: number): number {
  const i = AMPHORA.findIndex(([px]) => px >= x);
  if (i <= 0) return AMPHORA[Math.max(0, i)]![1];
  const [x0, r0] = AMPHORA[i - 1]!;
  const [x1, r1] = AMPHORA[i]!;
  return lerp(r0, r1, (x - x0) / (x1 - x0));
}

interface Pose { readonly x: number; readonly y: number; readonly ang: number; readonly sc: number; readonly flip: number }

function place(p: Pt, pose: Pose): Pt {
  const lx = (p.x - 31) * pose.flip * pose.sc;
  const ly = p.y * pose.sc;
  const [c, s] = [Math.cos(pose.ang), Math.sin(pose.ang)];
  return pt(pose.x + lx * c - ly * s, pose.y + lx * s + ly * c);
}

function amphora(d: Draw): void {
  const { rng } = d;
  puff(d, 0, -5, 62, 6, SHADOW, 0.35);
  const f = rng() < 0.5 ? 1 : -1;
  amphoraJar(d, { x: 24, y: -26, ang: 0.22 * f + (rng() - 0.5) * 0.1, sc: 0.85, flip: f }, 62);
  drift(d, 8, 54, -12, 5);
  amphoraJar(d, { x: -22, y: -16, ang: -0.1 + (rng() - 0.5) * 0.08, sc: 1, flip: -f }, 62);
  drift(d, -56, 12, -1, 6);
  amphoraJar(d, { x: 36, y: -10, ang: 0.08, sc: 0.8, flip: -1 }, 30 + rng() * 6);
  drift(d, 22, 60, -1, 4);
  for (let i = 0; i < 3; i++) {
    const [x, y] = [12 + i * 5.5 + rng() * 2, -2.5 - rng() * 1.5];
    const shard = [pt(x, y), pt(x + 2.5, y - 2), pt(x + 5, y - 1.2), pt(x + 3.5, y + 0.8)];
    paint(d, shard, TERRACOTTA, 0.6);
    ring(d, shard, 0.6);
  }
}

/** One amphora lying on its side; `keep` < 62 breaks it off with a jagged edge. */
function amphoraJar(d: Draw, pose: Pose, keep: number): void {
  const { rng } = d;
  const top = Array.from({ length: Math.floor(keep / 2) + 1 }, (_, i) => pt(Math.min(i * 2, keep), -amphoraRadius(i * 2)));
  const rk = amphoraRadius(keep);
  const jag = keep < 62 ? [0.6, 0.2, -0.2, -0.6].map((t) => pt(keep + (rng() - 0.5) * 5, t * rk * 2)) : [];
  const body = [...top, ...jag.reverse(), ...[...top].reverse().map((p) => pt(p.x, -p.y))].map((p) => place(p, pose));
  const handle = ribbon(qb(pt(5, -3.4), pt(7, -14), pt(17, -9), 10).map((p) => place(p, pose)), () => 1.3 * pose.sc);
  paint(d, handle.shape, TERRACOTTA, 0.6);
  ring(d, handle.shape, 0.7);
  paint(d, body, TERRACOTTA, 0.55);
  clip(d, body, () => {
    for (let y = 4; y < 13; y += 1.5) hair(d, [place(pt(-2, y), pose), place(pt(keep + 3, y), pose)], 0.4, 0.5);
    for (const x of [14, 15.5]) hair(d, [place(pt(x, -8), pose), place(pt(x, 8), pose)], 0.4, 0.6);
    for (let i = 0; i < 4; i++) {
      const p = place(pt(8 + rng() * (keep - 10), (rng() - 0.6) * 10), pose);
      d.pen.fill(d.L(rotOval(p.x, p.y, 2 + rng() * 4, 1.2 + rng() * 2, rng() * 3, 10)), '#7a4a2e', 0.25);
    }
  });
  dots(d, body, keep * 10 * pose.sc, () => 0.35, 0.4);
  ring(d, body, 1);
  for (let i = 0; i < 3; i++) {
    const p = place(pt(20 + rng() * (keep - 24), -4 - rng() * 6), pose);
    barnacle(d, p.x, p.y, 1.1 * pose.sc);
  }
  const mouth = oval(0, 0, 1.8, 4.8, 14).map((p) => place(p, pose));
  d.pen.fill(d.L(mouth), '#2b201b', 0.85);
  ring(d, mouth, 0.8);
  if (keep >= 62) return;
  const hole = oval(keep - 1.5, 0, 2.5, rk * 0.8, 12).map((p) => place(p, pose));
  d.pen.fill(d.L(hole), '#2b201b', 0.8);
  hair(d, hole, 0.5, 0.8);
}

// ---------------------------------------------------------------- lobster pot

/** The creel in a three-quarter view: X along it, Y up, Z away from the viewer. */
const CREEL = { R: 19, H: 46, X: 38 };
const creelProj = (X: number, Y: number, Z: number): Pt => pt(X * 0.92 + Z * 0.55, -11 - Y - Z * 0.34);
const creelSurf = (X: number, th: number): Pt => creelProj(X, CREEL.H * Math.sin(th), CREEL.R * Math.cos(th));
const thetas = (a0: number, a1: number, n = 20): number[] => Array.from({ length: n + 1 }, (_, i) => lerp(a0, a1, i / n));

function lobsterpot(d: Draw): void {
  const { X } = CREEL;
  puff(d, 0, -9, 54, 8, SHADOW, 0.4);
  const outline = hull([-X, X].flatMap((x) => thetas(0, Math.PI).map((th) => creelSurf(x, th))));
  d.pen.fill(d.L(outline), PAPER_FILL, 0.55);
  d.pen.fill(d.L(outline), '#a08a64', 0.16);
  creelBase(d);
  creelMesh(d, 0, Math.PI / 2, 0.3);
  for (const x of [-X, 0, X]) hoop(d, x);
  for (const th of [0.55, Math.PI / 2, Math.PI - 0.55]) hair(d, [creelSurf(-X, th), creelSurf(X, th)], 0.6, 0.85);
  creelMesh(d, Math.PI / 2, Math.PI, 0.6);
  creelEye(d, creelSurf(-17, Math.PI * 0.7));
  creelRope(d, creelSurf(X, Math.PI / 2));
  for (const [x, th] of [[-X, 2.6], [X, 2.9], [0, 2.2]] as const) {
    const p = creelSurf(x, th);
    barnacle(d, p.x, p.y, 1.2);
  }
}

/** Wooden base board, slats and a brick weight. */
function creelBase(d: Draw): void {
  const { R, X } = CREEL;
  const board = [creelProj(-X, 0, -R), creelProj(X, 0, -R), creelProj(X, 0, R), creelProj(-X, 0, R)];
  paint(d, board, WOOD, 0.5);
  for (let k = 1; k < 5; k++) hair(d, [creelProj(-X, 0, -R + (k * 2 * R) / 5), creelProj(X, 0, -R + (k * 2 * R) / 5)], 0.45, 0.7);
  ring(d, board, 0.8);
  const top = [creelProj(4, 6, -2), creelProj(20, 6, -2), creelProj(20, 6, 10), creelProj(4, 6, 10)];
  const front = [creelProj(4, 0, -2), creelProj(20, 0, -2), creelProj(20, 6, -2), creelProj(4, 6, -2)];
  paint(d, top, '#8a4a38', 0.55);
  paint(d, front, '#6b3328', 0.75);
  ring(d, top, 0.7);
  ring(d, front, 0.7);
  ink(d, [board[0]!, board[1]!], 1.8);
  hair(d, [board[0]!, board[1]!], 0.8, 0.8, '#9a7a52');
}

/** Diamond netting over part of the half-cylinder (back half faint, front half firm). */
function creelMesh(d: Draw, th0: number, th1: number, alpha: number): void {
  const { X } = CREEL;
  const k = 16;
  for (const dir of [1, -1]) {
    for (let c = -X - k * Math.PI; c < X + k * Math.PI; c += 6) {
      let run: Pt[] = [];
      for (const th of thetas(th0, th1, 24)) {
        const x = c + dir * k * th;
        if (Math.abs(x) <= X) run.push(creelSurf(x, th));
        else if (run.length) break;
      }
      if (run.length > 1) hair(d, run, 0.35, alpha);
    }
  }
  // End nets: the half-ellipses closing each end.
  for (const x of [-X, X]) {
    for (let z = -CREEL.R + 5; z < CREEL.R; z += 5) {
      const y = CREEL.H * Math.sqrt(1 - (z / CREEL.R) ** 2);
      hair(d, [creelProj(x, 0, z), creelProj(x, y, z)], 0.3, alpha * 0.6);
    }
  }
}

function hoop(d: Draw, x: number): void {
  const arc = thetas(0, Math.PI).map((th) => creelSurf(x, th));
  ink(d, arc, 1.9);
  d.pen.stroke(d.L(arc), 0.9 * S, '#9a7a52', 1, false);
}

/** The funnel entrance: a ring with netting drawn in towards it. */
function creelEye(d: Draw, c: Pt): void {
  const eye = oval(c.x, c.y, 7, 5, 20);
  d.pen.fill(d.L(eye), '#2a221d', 0.55);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    hair(d, [pt(c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 5), pt(c.x + Math.cos(a) * 13, c.y + Math.sin(a) * 9)], 0.35, 0.6);
  }
  ink(d, closed(eye), 1.6);
  d.pen.stroke(d.L(closed(eye)), 0.7 * S, '#9a7a52', 1, false);
}

/** A two-strand rope floating up from the pot, snapped and frayed. */
function creelRope(d: Draw, start: Pt): void {
  const { rng } = d;
  const end = pt(start.x + 16, start.y - 20 - rng() * 3);
  const rope = qb(start, pt(start.x + 4, start.y - 22), end, 16);
  const { left, right, shape } = ribbon(rope, () => 1.1);
  paint(d, shape, '#a88f63', 0.7);
  // Twist: short diagonal ticks across the strands.
  for (let i = 1; i < rope.length - 1; i++) hair(d, [left[i]!, right[i + 1]!], 0.4, 0.75);
  ink(d, left, 0.6);
  ink(d, right, 0.6);
  for (let i = 0; i < 4; i++) hair(d, [end, pt(end.x + 1 + rng() * 3, end.y - 2 - rng() * 3)], 0.35, 0.8);
}

// ---------------------------------------------------------------- cannon

/** Barrel profile: [x along the axis, radius]; the bumps are the reinforcing rings. */
const CANNON: readonly (readonly [number, number])[] = [
  [-66, 12.8], [-62, 13.6], [-60, 12.2], [-30, 11.8], [-28, 12.8], [-26, 11.2], [8, 10.2], [10, 10.9], [12, 9.8], [58, 8.4], [61, 9.8], [66, 9.8],
];

function cannon(d: Draw): void {
  const { rng } = d;
  const pose: Pose = { x: 4, y: -16, ang: (rng() - 0.5) * 0.08, sc: 1, flip: 1 };
  const Q = (pts: readonly Pt[]): Pt[] => pts.map((p) => place(pt(p.x + 31, p.y), pose));
  puff(d, 2, -4, 80, 6, SHADOW, 0.45);
  const knob = Q([...oval(-75, 0, 4.4, 4.4, 14)]);
  iron(d, Q([pt(-72, -2.6), pt(-65, -3.4), pt(-65, 3.4), pt(-72, 2.6)]), 0.9);
  iron(d, knob, 1);
  const top = CANNON.map(([x, r]) => pt(x, -r));
  const barrel = Q([...top, ...oval(66, 0, 3.6, 9.8, 12, -Math.PI / 2, Math.PI / 2), ...[...top].reverse().map((p) => pt(p.x, -p.y)), ...oval(-66, 0, 3, 12.8, 12, Math.PI / 2, Math.PI * 1.5)]);
  iron(d, barrel, 1.3);
  clip(d, barrel, () => {
    for (let y = 4; y < 14; y += 1.6) hair(d, Q([pt(-70, y), pt(70, y)]), 0.45, 0.55);
  });
  for (const [x, r] of [[-62, 13.6], [-28, 12.8], [10, 10.9], [61, 9.8]] as const) ink(d, Q(oval(x, 0, 2.4, r, 12, -Math.PI / 2, Math.PI / 2)), 0.7);
  hair(d, Q([pt(-58, -10), pt(-30, -9.4), pt(8, -7.8), pt(56, -6.4)]), 0.8, 0.6, PAPER_FILL);
  const tr = Q(oval(-14, 3, 4.4, 4.4, 14));
  iron(d, tr, 1);
  hair(d, Q(oval(-14, 3, 2.4, 2.4, 10)), 0.45, 0.7);
  const face = Q(oval(66, 0, 3.6, 9.8, 20));
  paint(d, face, '#6b6058', 0.8);
  ring(d, face, 1);
  d.pen.fill(d.L(Q(oval(66.6, 0, 2.2, 5.4, 14))), INK, 0.9);
  for (let i = 0; i < 7; i++) {
    const p = Q([pt(-60 + rng() * 112, -6 - rng() * 5)])[0]!;
    const crust = rotOval(p.x, p.y, 1.8 + rng() * 2.4, 1.3 + rng() * 1.2, rng(), 12);
    paint(d, crust, '#e7dcc6', 0.4);
    dots(d, crust, 20, () => 0.6, 0.35);
    ring(d, crust, 0.5);
  }
  drift(d, -70, 62, -1, 5);
  cannonball(d, -60 + rng() * 6, -5.5);
}

function cannonball(d: Draw, x: number, y: number): void {
  const ball = oval(x, y, 5, 5, 16);
  iron(d, ball, 1);
  hair(d, oval(x - 1.4, y - 1.6, 2, 1.6, 8, Math.PI, Math.PI * 1.7), 0.6, 0.7, PAPER_FILL);
  drift(d, x - 8, x + 8, -1, 2.5);
}

// ---------------------------------------------------------------- dispatch

const DRAW: Readonly<Record<LostDecorId, (d: Draw) => void>> = {
  anchor, amphora, lobsterpot, cannon,
};

/** Pieces that may be drawn mirrored so repeats don't all face the same way. */
const MIRRORS: ReadonlySet<LostDecorId> = new Set<LostDecorId>(['anchor', 'amphora', 'lobsterpot', 'cannon']);

/** Draws a lost human-made object; returns false if `kind` isn't one of this file's. */
export function drawLostDecor(ctx: CanvasRenderingContext2D, kind: LostDecorId, seed: number): boolean {
  if (!Object.prototype.hasOwnProperty.call(DRAW, kind)) return false;
  const mirror = MIRRORS.has(kind) && createRng(seed * 13 + 1)() < 0.5;
  DRAW[kind](frame(ctx, seed, mirror));
  return true;
}
