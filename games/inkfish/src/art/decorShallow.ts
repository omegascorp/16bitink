import { createRng, type Rng } from '../logic/rng';
import { INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

export type ShallowDecorId =
  | 'starfish' | 'mussels' | 'scallops' | 'sanddollar' | 'pebbles' | 'anemone'
  | 'seapen' | 'braincoral' | 'staghorn' | 'seafan' | 'tubesponge' | 'giantclam';

const S = ART_RES;
const TAU = Math.PI * 2;
const PAPER_FILL = '#fffaf0';

/**
 * Drawing context for one piece: a pen plus a local frame in in-game px with
 * the origin at the bottom centre of the canvas (the sand line); y < 0 is up.
 */
interface Draw {
  readonly pen: Pen;
  readonly rng: Rng;
  readonly w: number;
  readonly h: number;
  readonly P: (x: number, y: number) => Pt;
  readonly L: (pts: readonly Pt[]) => Pt[];
}

function frame(ctx: CanvasRenderingContext2D, seed: number): Draw {
  const w = ctx.canvas.width / S;
  const h = ctx.canvas.height / S;
  const P = (x: number, y: number): Pt => ({ x: (w / 2 + x) * S, y: (h + y) * S });
  return { pen: new Pen(ctx, seed * 13 + 5, 0.5), rng: createRng(seed * 7 + 3), w, h, P, L: (pts) => pts.map((p) => P(p.x, p.y)) };
}

// ---------------------------------------------------------------- local-space helpers

const pt = (x: number, y: number): Pt => ({ x, y });
const lerpPt = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const closeLoop = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;

/** Points on an elliptical arc; a full turn does not repeat the first point. */
function oval(cx: number, cy: number, rx: number, ry: number, n = 20, a0 = 0, a1 = TAU): Pt[] {
  const full = a1 - a0 >= TAU - 1e-6;
  return Array.from({ length: full ? n : n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return pt(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });
}

function qb(p0: Pt, c: Pt, p1: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return pt(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y);
  });
}

/** Offsets a centreline both ways by `half(u)` to make a ribbon polygon. */
function ribbon(center: readonly Pt[], half: (u: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  center.forEach((p, i) => {
    const a = center[Math.max(0, i - 1)]!;
    const b = center[Math.min(center.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const [nx, ny] = [-(b.y - a.y) / len, (b.x - a.x) / len];
    const r = half(i / (center.length - 1));
    left.push(pt(p.x + nx * r, p.y + ny * r));
    right.push(pt(p.x - nx * r, p.y - ny * r));
  });
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

/** Paper base plus a light watercolour wash. */
function wash(d: Draw, pts: readonly Pt[], color: string, alpha: number): void {
  d.pen.fill(d.L(pts), PAPER_FILL, 1);
  d.pen.fill(d.L(pts), color, alpha);
}

function tint(d: Draw, pts: readonly Pt[], color: string, alpha: number): void {
  d.pen.fill(d.L(pts), color, alpha);
}

/** Main contour (closed by default). */
function ink(d: Draw, pts: readonly Pt[], weight = 1, closed = true): void {
  d.pen.stroke(d.L(closed ? closeLoop(pts) : pts), weight * S);
}

function hair(d: Draw, pts: readonly Pt[], weight = 0.45, alpha = 0.75, color = INK): void {
  d.pen.hair(d.L(pts), weight * S, color, alpha);
}

function clip(d: Draw, pts: readonly Pt[], draw: () => void): void {
  d.pen.clipped(d.L(pts), draw);
}

/** Stipple with a density function in local coordinates. */
function stipple(d: Draw, pts: readonly Pt[], count: number, density: (x: number, y: number) => number, r = 0.4, color = INK): void {
  d.pen.stipple(d.L(pts), count, (x, y) => density(x / S - d.w / 2, y / S - d.h), r * S, color);
}

function dot(d: Draw, x: number, y: number, r: number, color = INK, alpha = 1): void {
  const p = d.P(x, y);
  d.pen.dot(p.x, p.y, r * S, color, alpha);
}

/** Soft contact shadow and a few sand strokes where the piece meets the seabed. */
function ground(d: Draw, cx: number, rx: number): void {
  tint(d, oval(cx, -1.6, rx, 2.4, 24), INK, 0.1);
  for (let i = 0; i < 4; i++) {
    const x = cx + (d.rng() - 0.5) * rx * 1.7;
    hair(d, [pt(x - 2.5, -1), pt(x + 2.5, -1.2)], 0.4, 0.35);
  }
}

/** Marching squares: segments where f crosses zero, for cells passing `inside`. */
function contour(f: (x: number, y: number) => number, box: readonly number[], step: number, inside: (x: number, y: number) => boolean): Pt[][] {
  const [x0, y0, x1, y1] = box as [number, number, number, number];
  const segs: Pt[][] = [];
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      if (!inside(x + step / 2, y + step / 2)) continue;
      const cs = [pt(x, y), pt(x + step, y), pt(x + step, y + step), pt(x, y + step)];
      const vs = cs.map((c) => f(c.x, c.y));
      const cross: Pt[] = [];
      for (let e = 0; e < 4; e++) {
        const [a, b] = [vs[e]!, vs[(e + 1) % 4]!];
        if (a > 0 !== b > 0) cross.push(lerpPt(cs[e]!, cs[(e + 1) % 4]!, a / (a - b)));
      }
      if (cross.length >= 2) segs.push([cross[0]!, cross[1]!]);
      if (cross.length === 4) segs.push([cross[2]!, cross[3]!]);
    }
  }
  return segs;
}

// ---------------------------------------------------------------- starfish

function starfish(d: Draw): void {
  const { rng } = d;
  const [cy, sy, R, r] = [-17, 0.5, 29, 8];
  const spin = -Math.PI / 2 + (rng() - 0.5) * 0.6;
  const arms = Array.from({ length: 5 }, () => ({ len: 0.84 + rng() * 0.16, bend: (rng() - 0.5) * 0.3 }));
  const armOf = (a: number) => arms[((Math.round(((a - spin) / TAU) * 5) % 5) + 5) % 5]!;
  // Lying flat, seen from above-front: the disc plane is squashed vertically.
  const at = (a: number, rr: number): Pt => pt(Math.cos(a) * rr, cy + Math.sin(a) * rr * sy);
  const edge = Array.from({ length: 140 }, (_, i) => {
    const a = (i / 140) * TAU;
    const f = ((1 + Math.cos(5 * (a - spin))) / 2) ** 2.4;
    const arm = armOf(a);
    return at(a + arm.bend * f * 0.3, r + (R * arm.len - r) * f);
  });
  ground(d, 0, 27);
  const side = edge.map((p) => pt(p.x, p.y + 1.7));
  wash(d, side, '#9c4f2a', 0.6);
  ink(d, side, 0.9);
  wash(d, edge, '#d0793e', 0.5);
  stipple(d, edge, 2600, (x, y) => 0.1 + Math.max(0, (y - cy) / 14) * 0.5 + Math.max(0, x / 70), 0.35);
  arms.forEach((arm, i) => starArm(d, at, spin + (i * TAU) / 5 + arm.bend * 0.3, R * arm.len, r));
  ink(d, edge, 1);
  dot(d, 3, cy - 1.5, 1.1, '#f0c27a', 0.95);
  dot(d, 3, cy - 1.5, 0.4, INK, 0.6);
}

/** Rows of knobbly spines along one arm, fading to the tip. */
function starArm(d: Draw, at: (a: number, rr: number) => Pt, a: number, len: number, r: number): void {
  hair(d, [at(a, 2), at(a, len * 0.9)], 0.5, 0.35);
  for (let t = 0.14; t < 0.9; t += 0.075) {
    const rr = t * len;
    const half = r * (1 - t) * 0.55 + 0.6;
    const rows = t < 0.6 ? [0, -1, 1] : [0];
    for (const k of rows) {
      const p = at(a + (k * half) / rr, rr);
      dot(d, p.x, p.y, k === 0 ? 0.85 : 0.6, '#f3d3a0', 0.95);
      dot(d, p.x + 0.3, p.y + 0.35, 0.3, INK, 0.75);
    }
  }
}

// ---------------------------------------------------------------- mussels

interface Valve {
  readonly outline: Pt[];
  /** Point at `t` along the axis (0 = umbo, 1 = rounded end) and `s` across it. */
  readonly at: (t: number, s: number) => Pt;
  readonly wid: number;
}

function musselShape(umbo: Pt, len: number, ang: number, wid: number): Valve {
  const [dx, dy] = [Math.cos(ang), Math.sin(ang)];
  const at = (t: number, s: number): Pt => pt(umbo.x + dx * t * len - dy * s, umbo.y + dy * t * len + dx * s);
  // Pointed at the umbo, broad and rounded at the far end; one side flatter.
  const prof = (t: number): number => (t < 0.62 ? (t / 0.62) ** 0.75 : Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2)));
  const n = 14;
  const top = Array.from({ length: n + 1 }, (_, i) => at(i / n, wid * 0.58 * prof(i / n)));
  const bot = Array.from({ length: n - 1 }, (_, i) => at(1 - (i + 1) / n, -wid * 0.42 * prof(1 - (i + 1) / n)));
  return { outline: [...top, ...bot], at, wid };
}

function mussel(d: Draw, m: Valve): void {
  wash(d, m.outline, '#272a3a', 0.9);
  const umbo = m.at(0, 0);
  clip(d, m.outline, () => {
    // Sheen along the ridge, then growth lines echoing the rim.
    hair(d, [m.at(0.12, m.wid * 0.12), m.at(0.5, m.wid * 0.24), m.at(0.88, m.wid * 0.16)], 1.5, 0.3, '#8f8aa8');
    for (const k of [0.45, 0.64, 0.82]) hair(d, m.outline.slice(8, 22).map((p) => lerpPt(umbo, p, k)), 0.4, 0.45, '#c2bdd0');
  });
  hair(d, [m.at(0.04, -m.wid * 0.02), m.at(0.97, -m.wid * 0.12)], 0.4, 0.6, '#0d0d14');
  ink(d, m.outline, 0.85);
}

/** An acorn barnacle: a little volcano of plates with a dark slit on top. */
function barnacle(d: Draw, p: Pt, r: number): void {
  const cone = [pt(p.x - r, p.y + r * 0.4), pt(p.x - r * 0.45, p.y - r * 0.8), pt(p.x + r * 0.45, p.y - r * 0.8), pt(p.x + r, p.y + r * 0.4)];
  wash(d, cone, '#cfc6b0', 0.7);
  hair(d, [pt(p.x - r * 0.3, p.y + r * 0.4), pt(p.x - r * 0.15, p.y - r * 0.75)], 0.35, 0.6);
  hair(d, [pt(p.x + r * 0.35, p.y + r * 0.4), pt(p.x + r * 0.2, p.y - r * 0.75)], 0.35, 0.6);
  ink(d, cone, 0.6);
  tint(d, oval(p.x, p.y - r * 0.8, r * 0.42, r * 0.2, 10), INK, 0.85);
}

function mussels(d: Draw): void {
  const { rng } = d;
  ground(d, 0, 42);
  const n = 7 + Math.floor(rng() * 3);
  const shells = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    const ang = -Math.PI * (0.9 - u * 0.8) + (rng() - 0.5) * 0.25;
    const len = 19 + rng() * 9;
    const umbo = pt((u - 0.5) * 24 + (rng() - 0.5) * 6, -5 - rng() * 3);
    return { m: musselShape(umbo, len, ang, len * 0.46), depth: Math.abs(Math.sin(ang)) + rng() * 0.2 };
  });
  // Byssus threads anchoring the clump.
  for (let i = 0; i < 8; i++) hair(d, qb(pt((rng() - 0.5) * 16, -6), pt((rng() - 0.5) * 30, -1), pt((rng() - 0.5) * 50, -1.5), 6), 0.35, 0.55);
  // Upright shells sit at the back of the clump, lying ones in front.
  shells.sort((a, b) => b.depth - a.depth).forEach((s) => mussel(d, s.m));
  for (let i = 0; i < 4 + Math.floor(rng() * 3); i++) {
    const { m } = pick(rng, shells);
    barnacle(d, m.at(0.45 + rng() * 0.35, (rng() - 0.3) * m.wid * 0.3), 1.6 + rng() * 1.3);
  }
  barnacle(d, pt(-36 + rng() * 8, -2.5), 2.6);
  barnacle(d, pt(30 + rng() * 8, -2.2), 2.2);
}

// ---------------------------------------------------------------- scallops

interface Fan {
  readonly edge: Pt[];
  /** Point at angle `a` from the fan's axis, `rr` from the hinge. */
  readonly map: (a: number, rr: number) => Pt;
  readonly r: number;
  readonly ribs: number;
}

const FAN_SPAN = 1.05;

/** A scallop valve: hinge at `h`, fanning towards `dir` (0 = up), squashed by `sy` on screen. */
function scallopFan(h: Pt, r: number, dir: number, sy: number, ribs: number): Fan {
  const map = (a: number, rr: number): Pt => pt(h.x + Math.sin(dir + a) * rr, h.y - Math.cos(dir + a) * rr * sy);
  const rim = Array.from({ length: 61 }, (_, i) => {
    const a = -FAN_SPAN + (2 * FAN_SPAN * i) / 60;
    const bump = Math.abs(Math.sin(((a + FAN_SPAN) / (2 * FAN_SPAN)) * ribs * Math.PI));
    return map(a, r * (1 - 0.08 * (a / FAN_SPAN) ** 4) * (0.95 + 0.05 * bump));
  });
  // The two "ears" either side of the hinge.
  const edge = [map(-1.57, r * 0.3), map(-1.3, r * 0.4), ...rim, map(1.3, r * 0.4), map(1.57, r * 0.3)];
  return { edge, map, r, ribs };
}

function scallop(d: Draw, f: Fan, color: string, alpha: number, inside: boolean): void {
  wash(d, f.edge, color, alpha);
  clip(d, f.edge, () => {
    for (let k = 0; k <= f.ribs; k++) {
      const a = -FAN_SPAN + (2 * FAN_SPAN * k) / f.ribs;
      hair(d, [f.map(a * 0.6, f.r * 0.14), f.map(a, f.r * 1.02)], inside ? 0.35 : 0.5, inside ? 0.35 : 0.75);
      if (!inside) hair(d, [f.map(a * 0.6 + 0.04, f.r * 0.3), f.map(a + 0.05, f.r)], 0.35, 0.3);
    }
    for (const k of [0.42, 0.62, 0.8]) hair(d, oval(0, 0, 1, 1, 16, -FAN_SPAN, FAN_SPAN).map((p) => f.map(Math.atan2(p.y, p.x), f.r * k)), 0.35, 0.3);
    hair(d, [f.map(-1.45, f.r * 0.33), f.map(-1.3, f.r * 0.15)], 0.35, 0.5);
    hair(d, [f.map(1.45, f.r * 0.33), f.map(1.3, f.r * 0.15)], 0.35, 0.5);
  });
  ink(d, f.edge, 0.9);
}

/** An open scallop: the lower valve lies on the sand, the upper gapes up, both showing their insides. */
function openScallop(d: Draw, h: Pt, r: number): void {
  const upper = scallopFan(h, r, 0, 0.85, 14);
  const lower = scallopFan(h, r, Math.PI, 0.36, 14);
  scallop(d, upper, '#e7b9a0', 0.4, true);
  stipple(d, upper.edge, 500, (x) => 0.15 + Math.max(0, (x - h.x) / r) * 0.4, 0.3);
  scallop(d, lower, '#e7b9a0', 0.45, true);
  // Mantle frill with its row of little dark eyes.
  const fr = Array.from({ length: 23 }, (_, i) => lower.map(-0.95 + (1.9 * i) / 22, r * (0.84 + (i % 2) * 0.04)));
  hair(d, fr, 0.45, 0.7, '#7a4a3a');
  fr.forEach((p, i) => i % 2 === 0 && dot(d, p.x, p.y - 0.5, 0.42, INK, 0.85));
  tint(d, oval(h.x + 1, h.y + 2, 3.4, 1.4, 12), '#c98a6a', 0.6);
}

function scallops(d: Draw): void {
  const { rng } = d;
  ground(d, 0, 36);
  if (rng() < 0.7) scallop(d, scallopFan(pt(1, -5), 11, -0.3, 0.85, 11), '#a7798f', 0.45, false);
  openScallop(d, pt(-16, -8), 16);
  const tilt = 0.2 + rng() * 0.2;
  scallop(d, scallopFan(pt(18, -3), 17, tilt, 0.92, 13), '#c96f4a', 0.5, false);
}

// ---------------------------------------------------------------- sand dollar

/** A flat sand dollar disc with five open petals of pores. */
function dollar(d: Draw, c: Pt, R: number, sy: number, spin: number, tilt: number): void {
  const at = (u: number, v: number): Pt => {
    const x = u * Math.cos(spin) - v * Math.sin(spin);
    return pt(c.x + x, c.y + (u * Math.sin(spin) + v * Math.cos(spin)) * sy + x * tilt);
  };
  const rim = Array.from({ length: 44 }, (_, i) => at(Math.cos((i / 44) * TAU) * R, Math.sin((i / 44) * TAU) * R));
  const side = rim.map((p) => pt(p.x, p.y + R * 0.09));
  wash(d, side, '#8f7c5a', 0.55);
  ink(d, side, 0.8);
  wash(d, rim, '#cdb894', 0.55);
  stipple(d, rim, R * R * 5, (x, y) => 0.1 + Math.max(0, (y - c.y) / (R * sy)) * 0.35 + Math.max(0, (x - c.x) / R) * 0.2, 0.3);
  for (let k = 0; k < 5; k++) {
    const th = (k * TAU) / 5;
    for (const s of [-1, 1]) {
      for (let t = 0.17; t < 0.66; t += 0.042) {
        const w = 0.32 * Math.sin((Math.PI * (t - 0.12)) / 0.58);
        const p = at(Math.cos(th + s * w) * t * R, Math.sin(th + s * w) * t * R);
        dot(d, p.x, p.y, R > 12 ? 0.4 : 0.3, '#4a3a28', 0.85);
      }
      // The petal's outline, open at its tip.
      const side = Array.from({ length: 9 }, (_, i) => {
        const t = 0.14 + i * 0.065;
        const w = 0.4 * Math.sin((Math.PI * (t - 0.1)) / 0.62);
        return at(Math.cos(th + s * w) * t * R, Math.sin(th + s * w) * t * R);
      });
      hair(d, side, 0.4, 0.75, '#4a3a28');
    }
  }
  dot(d, c.x, c.y, 0.6, '#4a3a28', 0.8);
  ink(d, rim, 0.9);
}

function sanddollar(d: Draw): void {
  const { rng } = d;
  ground(d, -2, 24);
  dollar(d, pt(-5, -9), 17, 0.36, rng() * TAU, -0.06);
  // A drift of sand half burying the big one.
  const drift = [pt(-27, -0.5), pt(-25, -3), pt(-21, -6), pt(-16, -7), pt(-12, -4.5), pt(-8, -2), pt(-3, -0.6), pt(-3, 0), pt(-27, 0)];
  wash(d, drift, '#d9c79f', 0.55);
  stipple(d, drift, 260, () => 0.5, 0.3, '#6b5a3c');
  hair(d, drift.slice(0, 7), 0.5, 0.6);
  dollar(d, pt(17, -5.5), 8.5, 0.42, rng() * TAU, 0.08);
}

// ---------------------------------------------------------------- pebbles

const PEBBLE_WASH = ['#8a8478', '#a39276', '#6f7268', '#b5a58a', '#7d6d62', '#9a8f86'];

function pebble(d: Draw, cx: number, rx: number, ry: number, color: string): void {
  const { rng } = d;
  const cy = -ry - 0.5;
  const [h1, h2] = [rng() * TAU, rng() * TAU];
  const shape = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * TAU;
    const k = 1 + 0.06 * Math.sin(a * 2 + h1) + 0.03 * Math.sin(a * 3 + h2);
    return pt(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
  });
  wash(d, shape, color, 0.6);
  stipple(d, shape, rx * ry * 9, (x, y) => Math.min(1, Math.max(0.05, ((x - cx) / rx) * 0.45 + ((y - cy) / ry) * 0.6)), 0.35);
  clip(d, shape, () => {
    // Form lines hugging the shadow side, a highlight on the lit one.
    hair(d, shape.slice(0, 13).map((p) => lerpPt(pt(cx, cy), p, 0.8)), 0.4, 0.45);
    tint(d, oval(cx - rx * 0.35, cy - ry * 0.4, rx * 0.3, ry * 0.18, 12), PAPER_FILL, 0.6);
    if (rng() < 0.3) hair(d, [pt(cx - rx, cy + ry * 0.3), pt(cx, cy - ry * 0.1), pt(cx + rx, cy - ry * 0.5)], 1, 0.75, PAPER_FILL);
  });
  ink(d, shape, rx > 8 ? 0.95 : 0.75);
}

/** A broken bit of cockle: ribbed fan with a jagged snapped edge. */
function shellFragment(d: Draw, cx: number, size: number): void {
  const r = Math.max(size, 5.5) * 1.7;
  const h = pt(cx - r * 0.45, -0.3 * r * 0.55 - 1.2);
  const { map } = scallopFan(h, r, Math.PI / 2, 0.55, 9);
  const rim = Array.from({ length: 21 }, (_, i) => map(-1.05 + (1.4 * i) / 20, r * (0.96 + 0.04 * Math.abs(Math.sin(i * 1.6)))));
  const end = rim[rim.length - 1]!;
  const jag = [0.25, 0.5, 0.75].map((t, i) => { const p = lerpPt(end, h, t); return pt(p.x + (i % 2 ? 1.2 : -1), p.y + (i % 2 ? -0.8 : 0.8)); });
  const shape = [h, ...rim, ...jag];
  wash(d, shape, '#e7c7ae', 0.55);
  clip(d, shape, () => {
    for (let k = 0; k < 7; k++) hair(d, [map(-1 + k * 0.2, r * 0.1), map(-1 + k * 0.2, r)], 0.4, 0.6);
  });
  ink(d, shape, 0.75);
}

function pebbles(d: Draw): void {
  const { rng } = d;
  ground(d, 0, 56);
  const items: { x: number; rx: number; ry: number; color: string; shell: boolean }[] = [];
  const shellAt = 1 + Math.floor(rng() * 4);
  let x = -57 + rng() * 3;
  for (let i = 0; x < 50; i++) {
    const rx = Math.min(4 + rng() ** 1.4 * 11, (57 - x) / 2);
    if (rx < 3) break;
    items.push({ x: x + rx, rx, ry: rx * (0.5 + rng() * 0.2), color: pick(rng, PEBBLE_WASH), shell: i === shellAt });
    x += rx * 2 * (0.7 + rng() * 0.3) + 0.5;
  }
  // Big stones at the back, small ones (and the shell) in front.
  items.sort((a, b) => b.rx - a.rx).forEach((p) => (p.shell ? shellFragment(d, p.x, p.rx) : pebble(d, p.x, p.rx, p.ry, p.color)));
  for (let i = 0; i < 10; i++) dot(d, (rng() - 0.5) * 108, -0.8 - rng() * 1.2, 0.35 + rng() * 0.3, '#6b5a3c', 0.7);
}

// ---------------------------------------------------------------- anemone

interface Tentacle { a: number; len: number; curl: number }

function tentacle(d: Draw, t: Tentacle, top: number, rx: number, ry: number): void {
  const [ox, oz] = [Math.cos(t.a), Math.sin(t.a)];
  const b = pt(ox * rx * 0.9, top + oz * ry * 0.9);
  // Back ones rise straight up; side ones splay out; front ones lean towards us.
  const tip = pt(b.x + ox * t.len * 0.62 + t.curl * 4, b.y - t.len * (0.95 - Math.abs(ox) * 0.45) + Math.max(0, oz) * t.len * 0.25);
  const ctrl = pt(b.x + ox * t.len * 0.15, b.y - t.len * 0.65);
  const c = qb(b, ctrl, tip, 10);
  const { left, right, shape } = ribbon(c, (u) => 1.7 - u * 0.9);
  wash(d, shape, '#df917c', 0.55);
  hair(d, c.slice(2), 0.35, 0.35, '#8a3a40');
  hair(d, left, 0.5, 0.9);
  hair(d, right, 0.5, 0.9);
  dot(d, tip.x, tip.y, 0.9, '#f6d8c4', 1);
  hair(d, oval(tip.x, tip.y, 0.9, 0.9, 8), 0.4, 0.8);
}

function anemoneColumn(d: Draw, top: number, rx: number): void {
  const left = qb(pt(-16, -1), pt(-8, (top - 1) * 0.5), pt(-rx, top), 12);
  const right = qb(pt(rx, top), pt(8, (top - 1) * 0.5), pt(16, -1), 12);
  const col = [...left, ...right];
  wash(d, col, '#a5485f', 0.55);
  clip(d, col, () => {
    // Faint vertical stripes, shading on the right.
    for (let k = -3; k <= 3; k++) hair(d, qb(pt(k * 4.2, -1), pt(k * 2.6, top * 0.5), pt(k * 3.6, top), 6), 0.4, 0.3, '#5a1f30');
    d.pen.hatch(d.L(col.map((p) => pt(p.x + 9, p.y))), 1.3 * S, 1.2, 0.4 * S, { alpha: 0.45 });
  });
  stipple(d, col, 1600, (x) => 0.1 + Math.max(0, x / 16) * 0.5, 0.35);
  ink(d, col, 1, false);
}

function anemone(d: Draw): void {
  const { rng } = d;
  const [top, rx, ry] = [-46, 14, 4.5];
  const tents: Tentacle[] = Array.from({ length: 36 }, (_, i) => ({ a: (i / 36) * TAU + rng() * 0.1, len: 15 + rng() * 9, curl: (rng() - 0.5) * 0.8 }));
  ground(d, 0, 22);
  tents.filter((t) => Math.sin(t.a) < 0).forEach((t) => tentacle(d, t, top, rx, ry));
  anemoneColumn(d, top, rx);
  const disc = oval(0, top, rx, ry, 28);
  wash(d, disc, '#e8a690', 0.6);
  for (let k = 0; k < 12; k++) hair(d, [pt(0, top), pt(Math.cos((k / 12) * TAU) * rx * 0.85, top + Math.sin((k / 12) * TAU) * ry * 0.85)], 0.35, 0.4);
  tint(d, oval(0, top, 2.4, 0.9, 10), '#5a1f30', 0.85);
  ink(d, disc, 0.6);
  tents.filter((t) => Math.sin(t.a) >= 0).forEach((t) => tentacle(d, { ...t, len: t.len * 0.8 }, top, rx, ry));
}

// ---------------------------------------------------------------- sea pen

function seapenLeaf(d: Draw, p: Pt, side: number, len: number): void {
  const tip = pt(p.x + side * len * 0.9, p.y - len * 0.6);
  const base2 = pt(p.x, p.y + 2.4);
  const upper = qb(p, pt(p.x + side * len * 0.35, p.y - len * 0.55), tip, 8);
  const lower = qb(tip, pt(p.x + side * len * 0.65, p.y - len * 0.05), base2, 8);
  const leaf = [...upper, ...lower];
  wash(d, leaf, '#e08f4c', 0.55);
  for (let k = 1; k < 4; k++) hair(d, [lerpPt(p, base2, 0.5), lower[8 - k * 2]!], 0.3, 0.45);
  // Polyps: tiny pale dots along the leaf's outer edge.
  for (let k = 2; k < 9; k += 2) dot(d, lower[k]!.x, lower[k]!.y, 0.45, '#fff2dc', 1);
  hair(d, leaf, 0.5, 0.9);
}

function seapen(d: Draw): void {
  const { rng } = d;
  const lean = (rng() - 0.5) * 8;
  const axis = qb(pt(0, -1), pt(lean * 0.2, -50), pt(lean, -104), 30);
  ground(d, 0, 9);
  const stalk = ribbon(axis.slice(0, 10), (u) => 2 + Math.sin(u * Math.PI) * 1.3);
  wash(d, stalk.shape, '#e8c79c', 0.6);
  hair(d, stalk.right, 0.4, 0.5);
  for (const side of [stalk.left, stalk.right]) ink(d, side, 0.8, false);
  // Leaves in pairs up the rachis, largest in the middle of the feather.
  for (let i = 9; i < axis.length - 1; i++) {
    const u = (i - 9) / (axis.length - 10);
    const len = 3 + 12 * Math.sin(Math.PI * (0.15 + u * 0.85)) ** 0.7 * (0.9 + rng() * 0.2);
    for (const side of i % 2 ? [-1, 1] : [1, -1]) seapenLeaf(d, axis[i]!, side, len);
  }
  const rachis = ribbon(axis.slice(9), (u) => 1.6 - u * 0.8);
  wash(d, rachis.shape, '#c56a35', 0.65);
  for (const side of [rachis.left, rachis.right]) ink(d, side, 0.7, false);
}

// ---------------------------------------------------------------- brain coral

function braincoral(d: Draw): void {
  const { rng } = d;
  const [rx, ry, base] = [64, 78, -3];
  const ph = [rng() * 6, rng() * 6];
  const waves = Array.from({ length: 14 }, (_, i) => {
    // Directions kept in a band: fingerprint-like parallel meanders, not blobs.
    const a = ph[0]! * 0.1 + ((i + rng() * 0.8) / 14 - 0.5) * 1.7;
    return { kx: Math.cos(a) * 30, ky: Math.sin(a) * 30, ph: rng() * TAU };
  });
  const dome = Array.from({ length: 49 }, (_, i) => {
    const a = Math.PI + (i / 48) * Math.PI;
    const k = 1 + 0.03 * Math.sin(a * 5 + ph[0]!) + 0.015 * Math.sin(a * 11 + ph[1]!);
    return pt(Math.cos(a) * rx * k, base + Math.sin(a) * ry * k);
  });
  const shape = [...dome, pt(rx - 4, -0.5), pt(-rx + 4, -0.5)];
  // Grooves live on the sphere so they crowd together towards the rim.
  const field = (x: number, y: number): number => {
    const X = x / rx;
    const Y = Math.min(1, Math.max(0, (base - y) / ry));
    const lon = Math.atan2(X, Math.sqrt(Math.max(0.0001, 1 - X * X - Y * Y)));
    const lat = Math.asin(Y);
    // A sum of equal-wavelength waves in random directions: a meandering maze.
    return waves.reduce((sum, w) => sum + Math.cos(w.kx * lon + w.ky * lat + w.ph), 0) / 3.7;
  };
  ground(d, 0, 66);
  wash(d, shape, '#c9a46a', 0.5);
  stipple(d, shape, 9000, (x, y) => (field(x, y) < -0.3 ? 0.5 : 0.02) + Math.max(0, x / rx) * 0.2 + Math.max(0, (y - base + ry * 0.3) / ry) * 0.25, 0.35, '#3a2a1a');
  const inside = (x: number, y: number): boolean => (x / rx) ** 2 + ((y - base) / ry) ** 2 < 0.985;
  clip(d, shape, () => {
    for (const s of contour(field, [-rx, base - ry, rx, base], 1.2, inside)) hair(d, s, 0.55, 0.85);
    // Septa: fine ticks across every valley, along the field's gradient.
    for (let y = base - ry; y < base; y += 1.6) {
      for (let x = -rx; x < rx; x += 1.6) {
        if (!inside(x, y) || field(x, y) > -0.45) continue;
        const [gx, gy] = [field(x + 0.3, y) - field(x - 0.3, y), field(x, y + 0.3) - field(x, y - 0.3)];
        const g = Math.hypot(gx, gy) || 1;
        hair(d, [pt(x - (gx / g) * 0.9, y - (gy / g) * 0.9), pt(x + (gx / g) * 0.9, y + (gy / g) * 0.9)], 0.3, 0.5);
      }
    }
  });
  ink(d, dome, 1.1, false);
  hair(d, [pt(-rx + 2, -1.2), pt(rx - 2, -1.2)], 0.6, 0.6);
}

// ---------------------------------------------------------------- staghorn

interface Branch { pts: Pt[]; w0: number; w1: number; tip: boolean }

/** Grows one staghorn branch and its forks into `out` (parents before children). */
function growStag(rng: Rng, from: Pt, ang: number, len: number, wid: number, depth: number, out: Branch[]): void {
  const a = Math.max(-Math.PI + 0.3, Math.min(-0.3, ang));
  let l = len;
  const end = (): Pt => pt(from.x + Math.cos(a) * l, from.y + Math.sin(a) * l);
  while (l > 6 && (Math.abs(end().x) > 60 - wid || end().y < -112 + wid)) l *= 0.85;
  const e = end();
  const mid = lerpPt(from, e, 0.5);
  const bend = (rng() - 0.5) * l * 0.25;
  const start = pt(from.x - Math.cos(a) * 1.5, from.y - Math.sin(a) * 1.5);
  const tip = depth === 0;
  out.push({ pts: qb(start, pt(mid.x - Math.sin(a) * bend, mid.y + Math.cos(a) * bend), e, 8), w0: wid, w1: wid * 0.82, tip });
  if (tip) return;
  const forks = rng() < 0.75 ? 2 : 3;
  for (let k = 0; k < forks; k++) {
    const spread = forks === 2 ? (k ? 1 : -1) * (0.3 + rng() * 0.25) : (k - 1) * 0.45;
    growStag(rng, e, a + spread, l * (0.72 + rng() * 0.18), wid * 0.82, depth - 1, out);
  }
}

function stagBranch(d: Draw, b: Branch): void {
  const { left, right, shape } = ribbon(b.pts, (u) => (b.w0 + (b.w1 - b.w0) * u) / 2);
  wash(d, shape, '#c79b6e', 0.55);
  clip(d, shape, () => hair(d, right.map((p, i) => lerpPt(p, b.pts[i]!, 0.35)), 0.8, 0.3));
  // Corallites: little cups poking out along the sides.
  for (let i = 2; i < left.length - 1; i += 2) {
    for (const [side, edge] of [[-1, left], [1, right]] as const) {
      const p = edge[i]!;
      const c = b.pts[i]!;
      hair(d, [p, pt(p.x + (p.x - c.x) * 0.35, p.y + (p.y - c.y) * 0.35 - 0.8)], 0.45, side > 0 ? 0.8 : 0.6);
    }
  }
  ink(d, left, 0.75, false);
  ink(d, right, 0.75, false);
  if (!b.tip) return;
  const e = b.pts[b.pts.length - 1]!;
  const cap = oval(e.x, e.y, b.w1 / 2, b.w1 / 2, 10);
  wash(d, cap, '#f2e6cf', 0.6);
  ink(d, [left[left.length - 1]!, ...oval(e.x, e.y, b.w1 / 2, b.w1 / 2, 6, Math.PI, TAU), right[right.length - 1]!], 0.7, false);
}

function staghorn(d: Draw): void {
  const { rng } = d;
  ground(d, 0, 46);
  const out: Branch[] = [];
  const trunks = 6;
  for (let i = 0; i < trunks; i++) {
    const u = i / (trunks - 1) - 0.5;
    growStag(rng, pt(u * 44 + (rng() - 0.5) * 6, -2), -Math.PI / 2 + u * 1.5 + (rng() - 0.5) * 0.3, 22 + rng() * 7, 7.5, 3, out);
  }
  // Tips first so each parent overlaps the base of its forks.
  [...out].reverse().forEach((b) => stagBranch(d, b));
}

// ---------------------------------------------------------------- sea fan

interface Twig { a: Pt; b: Pt; depth: number }

function growFan(rng: Rng, p: Pt, ang: number, depth: number, root: Pt, out: Twig[]): void {
  let [q, a] = [p, ang];
  const inFan = (v: Pt): boolean => (v.x / 56) ** 2 + ((v.y + 84) / 61) ** 2 < 1 && v.y < root.y - 1;
  for (let step = 0; step < 40; step++) {
    // Each twig drifts towards the radial direction so the colony fans out.
    const radial = Math.atan2(q.y - root.y, q.x - root.x);
    a += (radial - a) * 0.15 + (rng() - 0.5) * 0.35;
    const next = pt(q.x + Math.cos(a) * 3.6, q.y + Math.sin(a) * 3.6);
    if (!inFan(next)) return;
    out.push({ a: q, b: next, depth });
    q = next;
    if (depth < 6 && rng() < 0.24) {
      growFan(rng, q, a - 0.4 - rng() * 0.2, depth + 1, root, out);
      a += 0.3 + rng() * 0.2;
      depth += 1;
    }
  }
}

function seafan(d: Draw): void {
  const { rng } = d;
  const root = pt(0, -22);
  const twigs: Twig[] = [];
  for (let k = 0; k < 6; k++) growFan(rng, root, -2.45 + k * 0.36 + (rng() - 0.5) * 0.12, 1, root, twigs);
  ground(d, 0, 18);
  // Colour along every twig, under the ink.
  for (const t of twigs) hair(d, [t.a, t.b], 2 - t.depth * 0.22, 0.3, '#a0526e');
  // Cross-links between neighbouring twigs make the lattice.
  const nodes = twigs.filter((_, i) => i % 2 === 0).map((t) => t.b);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i]!.x - nodes[j]!.x, nodes[i]!.y - nodes[j]!.y);
      if (dist > 1.8 && dist < 6 && rng() < 0.6) hair(d, [nodes[i]!, nodes[j]!], 0.4, 0.5, '#5a2a40');
    }
  }
  for (const t of twigs) hair(d, [t.a, t.b], Math.max(0.3, 1.1 - t.depth * 0.18), t.depth < 3 ? 0.9 : 0.7, t.depth < 3 ? INK : '#5a2a40');
  const stem = ribbon(qb(pt(0, -1), pt(1, -12), root, 8), (u) => 2.2 - u * 0.9);
  wash(d, stem.shape, '#7d3c55', 0.6);
  for (const side of [stem.left, stem.right]) ink(d, side, 0.85, false);
  const hold = [pt(-6, -0.5), pt(-4, -3), pt(0, -4), pt(4, -3), pt(6, -0.5)];
  wash(d, hold, '#7d3c55', 0.5);
  ink(d, hold, 0.8, false);
}

// ---------------------------------------------------------------- tube sponges

const SPONGE_WASH = ['#c79a45', '#b4795a', '#9b7590', '#a88f4e'];

function spongeTube(d: Draw, x: number, hgt: number, r: number, lean: number, color: string): void {
  const c = qb(pt(x, -1), pt(x + lean * 0.2, -hgt * 0.5), pt(x + lean, -hgt), 16);
  const rad = (u: number): number => r * (0.85 + 0.3 * u * u);
  const { left, right, shape } = ribbon(c, rad);
  const top = c[c.length - 1]!;
  const [mx, my] = [rad(1), rad(1) * 0.36];
  wash(d, shape, color, 0.55);
  clip(d, shape, () => {
    for (const k of [-0.5, 0, 0.45, 0.75, 0.9]) hair(d, ribbon(c, (u) => rad(u) * k).left, 0.4, k > 0.4 ? 0.55 : 0.25);
  });
  stipple(d, shape, hgt * r * 5, (px, py) => 0.12 + Math.max(0, (px - x - lean * ((-py) / hgt)) / r) * 0.6, 0.35);
  // Oscula and pores dotted over the wall.
  for (let i = 0; i < hgt / 6; i++) {
    const p = c[1 + Math.floor(d.rng() * (c.length - 3))]!;
    hair(d, oval(p.x + (d.rng() - 0.5) * r * 1.1, p.y, 0.6, 0.45, 6).concat([pt(p.x, p.y)]).slice(0, 7), 0.35, 0.6);
  }
  ink(d, left, 0.9, false);
  ink(d, right, 0.9, false);
  const lip = oval(top.x, top.y, mx, my, 24);
  wash(d, lip, color, 0.45);
  tint(d, oval(top.x, top.y + my * 0.15, mx * 0.78, my * 0.66, 20), '#2b2228', 0.85);
  hair(d, oval(top.x, top.y + my * 0.15, mx * 0.78, my * 0.66, 20, Math.PI, TAU), 0.4, 0.8);
  ink(d, lip, 0.85);
}

function tubesponge(d: Draw): void {
  const { rng } = d;
  ground(d, 0, 34);
  const tubes = [
    { x: 8, hgt: 118, r: 9.5 },
    { x: -17, hgt: 92, r: 9 },
    { x: 24, hgt: 74, r: 8 },
    { x: -30, hgt: 56, r: 7 },
    { x: -3, hgt: 62, r: 8.5 },
  ];
  // Tallest at the back, stubby ones in front.
  for (const t of tubes) {
    const lean = Math.sign(t.x || 1) * (2 + rng() * 5);
    spongeTube(d, t.x + (rng() - 0.5) * 3, t.hgt * (0.88 + rng() * 0.12), t.r, lean, pick(rng, SPONGE_WASH));
  }
  const foot = oval(-4, -1, 34, 3.5, 24, Math.PI, TAU);
  wash(d, foot, '#a88f4e', 0.5);
  ink(d, foot, 0.8, false);
}

// ---------------------------------------------------------------- giant clam

const CLAM_HALF = 68;
const CLAM_WAVES = 5;

/** A valve's wavy lip: rises to `height` in the middle, with `CLAM_WAVES` rounded folds. */
function clamLip(base: number, height: number, amp: number, phase: number): Pt[] {
  return Array.from({ length: 91 }, (_, i) => {
    const x = -CLAM_HALF + (2 * CLAM_HALF * i) / 90;
    const env = Math.sqrt(Math.max(0, 1 - (x / CLAM_HALF) ** 2));
    const crest = (0.5 + 0.5 * Math.cos(((x + CLAM_HALF) / (2 * CLAM_HALF)) * CLAM_WAVES * TAU + phase)) ** 0.7;
    return pt(x, base - env ** 0.8 * (height + amp * crest));
  });
}

const CLAM_FOOT = [pt(CLAM_HALF, -6), pt(CLAM_HALF * 0.75, -2), pt(0, -1), pt(-CLAM_HALF * 0.75, -2)];

function clamValve(d: Draw, lip: Pt[], color: string, front: boolean): void {
  const shape = [...lip, ...CLAM_FOOT];
  const hinge = pt(0, 6);
  wash(d, shape, color, 0.6);
  clip(d, shape, () => {
    // Growth lines echo the lip; folds radiate from the hinge.
    for (const k of [0.35, 0.55, 0.72, 0.86]) hair(d, lip.map((p) => lerpPt(hinge, p, k)), 0.4, 0.35);
    // Each trough between folds is a shaded crease.
    for (let i = 1; i < CLAM_WAVES * 2; i += 2) {
      const at = (k: number): Pt => lip[Math.round(((i + k) / (CLAM_WAVES * 2)) * 90)]!;
      const crease = [lerpPt(hinge, at(0), 0.25), at(-0.45), at(0), at(0.45)];
      d.pen.hatch(d.L(crease), 1.1 * S, -1.2 + (at(0).x / CLAM_HALF) * 0.6, 0.4 * S, { alpha: 0.55 });
      hair(d, [lerpPt(hinge, at(0), 0.25), at(0)], 0.6, 0.6);
    }
  });
  stipple(d, shape, 5000, (_x, y) => 0.06 + Math.max(0, (y + 30) / 30) * 0.45, 0.35);
  if (front) clamScutes(d, lip, hinge);
  ink(d, lip, 1.2, false);
  ink(d, CLAM_FOOT, 1, false);
}

/** Frilly scales stacked up each fold of the front valve. */
function clamScutes(d: Draw, lip: Pt[], hinge: Pt): void {
  for (let i = 2; i < CLAM_WAVES * 2; i += 2) {
    const p = lip[Math.round((i / (CLAM_WAVES * 2)) * 90)]!;
    for (const k of [0.42, 0.56, 0.69, 0.81, 0.92]) {
      const c = lerpPt(hinge, p, k);
      const scute = oval(c.x, c.y - 1, 1.4 + k * 2.6, 0.9 + k * 1.6, 10, 0, Math.PI);
      wash(d, scute, '#e9dfc6', 0.5);
      hair(d, scute, 0.55, 0.9);
    }
  }
}

function clamMantle(d: Draw, back: Pt[], frontLip: Pt[]): void {
  const { rng } = d;
  const top = back.map((p, i) => pt(p.x, p.y + 3.5 + Math.sin(i * 1.3) * 0.6));
  const shape = [...top, ...[...frontLip].reverse().map((p) => pt(p.x, p.y + 6))];
  wash(d, shape, '#7a7c46', 0.6);
  clip(d, shape, () => {
    const spots = ['#5d6b3c', '#a07a3e', '#3f7468', '#c9b26a', '#6b4f3a', '#3f6f62'];
    for (let i = 0; i < 90; i++) {
      const p = lerpPt(pick(rng, top), pt((rng() - 0.5) * 100, -50), rng() * 0.6);
      tint(d, oval(p.x, p.y, 1.2 + rng() * 3, 0.8 + rng() * 1.6, 10), pick(rng, spots), 0.55);
    }
    for (let i = 0; i < 80; i++) {
      const p = lerpPt(pick(rng, top), pt(0, -55), rng() * 0.5);
      dot(d, p.x, p.y + 1, 0.4, '#f2ead0', 0.9);
    }
    for (let i = 0; i < 14; i++) {
      const p = lerpPt(pick(rng, top), pt(0, -55), rng() * 0.4);
      hair(d, qb(p, pt(p.x + 3, p.y - 2), pt(p.x + 6, p.y + 1), 5), 0.45, 0.6, '#2c2a18');
    }
  });
  stipple(d, shape, 2500, (_x, y) => Math.max(0, (y + 62) / 20) * 0.6, 0.35);
  // The incurrent siphon: a frilled pale-rimmed slit.
  const sx = (rng() - 0.5) * 20;
  const sy = top[Math.round(45 + sx * 0.66)]!.y + 9;
  wash(d, oval(sx, sy, 5, 2.4, 16), '#d7c48e', 0.6);
  tint(d, oval(sx, sy, 3, 1, 12), INK, 0.85);
  for (let k = 0; k < 10; k++) hair(d, [pt(sx + Math.cos((k / 10) * TAU) * 3.4, sy + Math.sin((k / 10) * TAU) * 1.4), pt(sx + Math.cos((k / 10) * TAU) * 5.4, sy + Math.sin((k / 10) * TAU) * 2.6)], 0.35, 0.7);
  hair(d, top, 0.6, 0.85);
}

function giantclam(d: Draw): void {
  const { rng } = d;
  ground(d, 0, 70);
  const phase = (rng() - 0.5) * 0.4;
  const back = clamLip(-6, 66, 11, phase + Math.PI);
  const front = clamLip(-6, 40, 14, phase);
  clamValve(d, back, '#cbbd9c', false);
  clamMantle(d, back, front);
  clamValve(d, front, '#ddd0b2', true);
}

// ---------------------------------------------------------------- dispatch

const PIECES: Readonly<Record<ShallowDecorId, (d: Draw) => void>> = {
  starfish, mussels, scallops, sanddollar, pebbles, anemone, seapen, braincoral, staghorn, seafan, tubesponge, giantclam,
};

/** Draws a shallow-water decor piece; returns false if `kind` isn't one of this file's. */
export function drawShallowDecor(ctx: CanvasRenderingContext2D, kind: ShallowDecorId, seed: number): boolean {
  if (!Object.hasOwn(PIECES, kind)) return false;
  PIECES[kind](frame(ctx, seed));
  return true;
}
