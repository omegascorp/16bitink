import { createRng } from '../../../src/logic/rng';
import { profile, type V3, v3 } from './space';

/**
 * The common fangtooth (Anoplogaster cornuta) as a 3D model, centimetres:
 * 16 cm from snout to tail tip, the largest they grow. A short deep body,
 * a huge bony head, a small eye, a mouth that opens wide on a hinge below
 * and behind the eye, and the two enormous fangs at the front of the lower
 * jaw that, with the mouth shut, sit in two sockets beside the brain.
 *
 * The body is lofted from cross-sections (superellipses) along x. The head
 * is split along the mouth line into the skull and the lower jaw, which
 * turns about HINGE. Each section is a ring: the skin (top, sides, bottom)
 * and, where the mouth is, a chord across it (the roof or floor of the
 * mouth).
 */

export const SNOUT_X = 6.5;
export const TAIL_X = -9.5;
export const LENGTH = SNOUT_X - TAIL_X;
/** The end of the body proper, where the tail fin begins. */
const PEDUNCLE_X = -5.7;

/** Top and bottom of the body in profile, and its half-width. */
export const TOP = profile([
  [-5.7, 0.62], [-4.0, 1.1], [-2.5, 1.65], [-1.0, 2.2], [0.5, 2.65], [1.8, 2.95], [3.0, 3.05], [4.0, 2.95], [4.8, 2.65], [5.5, 2.15], [6.0, 1.55], [6.3, 1.0], [6.5, 0.45],
]);
export const BOTTOM = profile([
  [-5.7, -0.58], [-4.5, -0.85], [-3.0, -1.35], [-1.5, -1.95], [0.0, -2.45], [1.2, -2.7], [2.4, -2.75], [3.4, -2.6], [4.4, -2.25], [5.3, -1.7], [6.0, -0.95], [6.35, -0.25], [6.5, 0.45],
]);
const WIDTH = profile([
  [-5.7, 0.25], [-5.0, 0.33], [-3.5, 0.55], [-1.5, 0.85], [0.5, 1.15], [2.0, 1.3], [3.0, 1.3], [4.0, 1.2], [5.0, 1.05], [6.0, 0.72], [6.5, 0.3],
]);

/** The jaw joint: the lower jaw turns about a line across the head through here. */
export const HINGE = v3(2.0, -1.1, 0);
/** Where the back edge of the lower jaw meets the belly. */
const JAW_BACK_X = 1.3;
/** The lips: from the hinge to the snout. */
const MOUTH = profile([[2.0, -1.1], [3.0, -0.75], [4.2, -0.35], [5.3, 0.05], [6.0, 0.28], [6.5, 0.45]]);
/** How far the jaw drops at full gape, radians. */
export const JAW_MAX = 0.95;

const EXP = 2.4;
const spow = (v: number, p: number): number => Math.sign(v) * Math.abs(v) ** p;

/** Where the lower jaw parts from the skull at x (the mouth line, and the jaw's back edge). */
export function splitY(x: number): number {
  if (x >= HINGE.x) return MOUTH(x);
  const u = Math.max(0, Math.min(1, (x - JAW_BACK_X) / (HINGE.x - JAW_BACK_X)));
  const e = u * u * (3 - 2 * u);
  return BOTTOM(x) + (HINGE.y - BOTTOM(x)) * e;
}

interface Section {
  readonly yc: number;
  readonly hy: number;
  readonly w: number;
  /** The angle (0 top, π bottom) of the lips on this section; π where there is no jaw. */
  readonly rim: number;
}

export function sectionAt(x: number): Section {
  const top = TOP(x);
  const bottom = BOTTOM(x);
  const yc = (top + bottom) / 2;
  const hy = Math.max(1e-4, (top - bottom) / 2);
  const w = WIDTH(x);
  if (x <= JAW_BACK_X) return { yc, hy, w, rim: Math.PI };
  const c = Math.max(-1, Math.min(1, (splitY(x) - yc) / hy));
  return { yc, hy, w, rim: Math.acos(spow(c, EXP / 2)) };
}

/** The skin at x, angle θ round the section (0 top, π/2 left side, π bottom). */
export function skinAt(x: number, theta: number): V3 {
  const s = sectionAt(x);
  return v3(x, s.yc + s.hy * spow(Math.cos(theta), 2 / EXP), s.w * spow(Math.sin(theta), 2 / EXP));
}

/** The skin's outward normal at (x, θ), from the loft itself. */
export function skinNormal(x: number, theta: number): V3 {
  const d = 1e-3;
  const a = skinAt(x - d, theta);
  const b = skinAt(x + d, theta);
  const c = skinAt(x, theta - d);
  const e = skinAt(x, theta + d);
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const uz = b.z - a.z;
  const tx = e.x - c.x;
  const ty = e.y - c.y;
  const tz = e.z - c.z;
  // Round the section, then along it: outward.
  const n = v3(ty * uz - tz * uy, tz * ux - tx * uz, tx * uy - ty * ux);
  const len = Math.hypot(n.x, n.y, n.z) || 1;
  return v3(n.x / len, n.y / len, n.z / len);
}

// ---------------------------------------------------------------- the two meshes

export type FaceKind = 'skin' | 'mouth';

export interface Mesh {
  /** rings[i][j]: section i, point j round it. */
  readonly rings: readonly (readonly V3[])[];
  /** The kind of face between points j and j+1 of each section and the next. */
  readonly kinds: readonly FaceKind[];
  /** True for the lower jaw, which turns about the hinge. */
  readonly jaw: boolean;
}

const range = (from: number, to: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

const ARCH = 26;
const ROOF = 7;
const CUP = 20;
const FLOOR = 7;

/** The chord across the mouth at x, from one lip to the other, bowed by `bow` cm (up for the roof). */
function chord(x: number, rimZ: number, y: number, bow: number, count: number, fromLeft: boolean): V3[] {
  return Array.from({ length: count }, (_, k) => {
    const u = (k + 1) / (count + 1);
    const z = (fromLeft ? 1 : -1) * rimZ * (1 - 2 * u);
    return v3(x, y + bow * (1 - (z / (rimZ || 1)) ** 2), z);
  });
}

/** Skull and body: the skin over the top from lip to lip, then the roof of the mouth back across. */
export const SKULL: Mesh = (() => {
  const xs = range(PEDUNCLE_X, SNOUT_X, 54);
  const rings = xs.map((x) => {
    const s = sectionAt(x);
    const arch = range(-s.rim, s.rim, ARCH).map((th) => skinAt(x, th));
    const lip = arch[arch.length - 1]!;
    return [...arch, ...chord(x, lip.z, lip.y, Math.min(0.35, s.hy * 0.25), ROOF, true)];
  });
  const kinds = Array.from({ length: ARCH + ROOF }, (_, j): FaceKind => (j < ARCH - 1 ? 'skin' : 'mouth'));
  return { rings, kinds, jaw: false };
})();

/** The lower jaw, shut: the skin from lip round under the chin to lip, then the floor of the mouth. */
export const JAW: Mesh = (() => {
  const xs = range(JAW_BACK_X, SNOUT_X, 26);
  const rings = xs.map((x) => {
    const s = sectionAt(x);
    const cup = range(s.rim, 2 * Math.PI - s.rim, CUP).map((th) => skinAt(x, th));
    const lip = cup[cup.length - 1]!;
    return [...cup, ...chord(x, -lip.z, lip.y, -Math.min(0.3, s.hy * 0.2), FLOOR, false)];
  });
  const kinds = Array.from({ length: CUP + FLOOR }, (_, j): FaceKind => (j < CUP - 1 ? 'skin' : 'mouth'));
  return { rings, kinds, jaw: true };
})();

/** A point of the shut lower jaw, with the jaw `open` (0 .. 1) of the way to JAW_MAX. */
export function jawPoint(v: V3, open: number): V3 {
  const a = -open * JAW_MAX;
  const dx = v.x - HINGE.x;
  const dy = v.y - HINGE.y;
  return v3(HINGE.x + dx * Math.cos(a) - dy * Math.sin(a), HINGE.y + dx * Math.sin(a) + dy * Math.cos(a), v.z);
}

/** The tail's sideways sway, cm, at x: nothing at the head, `size` at the tail tip. */
export function swayAt(x: number, beat: number, size: number): number {
  const u = Math.max(0, (-1 - x) / (-1 - TAIL_X));
  return size * u * u * Math.sin(beat - 1.6 * u);
}

// ---------------------------------------------------------------- teeth

export interface Tooth {
  /** The centre line, base to tip, in the model (the lower jaw's shut). */
  readonly line: readonly V3[];
  /** Radius at the base, cm. */
  readonly r: number;
  readonly jaw: boolean;
  /** One of the two great lower fangs. */
  readonly fang: boolean;
}

/** The two great fangs: arcs about the hinge, so as the jaw shuts each slides along its own curve into its socket. */
const FANG_BASE_X = 5.85;
const FANG_Z = 0.56;
const FANG_LEN = 2.15;
export const FANG_R = 0.17;
const fangArc = (() => {
  const by = splitY(FANG_BASE_X) - 0.05;
  const dx = FANG_BASE_X - HINGE.x;
  const dy = by - HINGE.y;
  return { radius: Math.hypot(dx, dy), from: Math.atan2(dy, dx) };
})();

/** A point on a fang's arc, `u` of its length from the base (beyond 1: past the tip, for the socket). */
export function fangPoint(u: number, side: 1 | -1): V3 {
  const a = fangArc.from + (u * FANG_LEN) / fangArc.radius;
  return v3(HINGE.x + fangArc.radius * Math.cos(a), HINGE.y + fangArc.radius * Math.sin(a), side * FANG_Z);
}

function straightTooth(base: V3, dx: number, dy: number, dz: number, length: number, r: number, jaw: boolean): Tooth {
  const len = Math.hypot(dx, dy, dz);
  const line = range(0, 1, 5).map((u) => {
    // A slight backward hook towards the tip.
    const hook = 0.12 * length * u * u;
    return v3(base.x + (dx / len) * length * u - hook, base.y + (dy / len) * length * u, base.z + (dz / len) * length * u);
  });
  return { line, r, jaw, fang: false };
}

const lipAt = (x: number, side: 1 | -1, inset: number): V3 => {
  const s = sectionAt(x);
  const p = skinAt(x, s.rim);
  return v3(x, p.y, side * p.z * inset);
};

export const TEETH: readonly Tooth[] = (() => {
  const teeth: Tooth[] = [];
  for (const side of [1, -1] as const) {
    teeth.push({ line: range(0, 1, 9).map((u) => fangPoint(u, side)), r: FANG_R, jaw: true, fang: true });
    [[6.2, 0.62], [5.65, 0.55], [5.1, 0.46], [4.5, 0.4], [3.9, 0.33], [3.3, 0.27]].forEach(([x, len]) => {
      teeth.push(straightTooth(lipAt(x!, side, 0.88), 0.05, -1, -side * 0.15, len!, 0.07 + len! * 0.04, false));
    });
    [[5.3, 0.55], [4.75, 0.48], [4.2, 0.4], [3.6, 0.34], [3.0, 0.28]].forEach(([x, len]) => {
      teeth.push(straightTooth(lipAt(x!, side, 0.86), -0.1, 1, -side * 0.12, len!, 0.06 + len! * 0.04, true));
    });
  }
  return teeth;
})();

// ---------------------------------------------------------------- skull, brain and sockets (the X-ray)

/** The brain: three lobes between the eyes, centre and radii. */
export const BRAIN: readonly { readonly c: V3; readonly r: V3 }[] = [
  { c: v3(4.95, 1.75, 0), r: v3(0.3, 0.26, 0.22) },
  { c: v3(4.4, 1.85, 0), r: v3(0.5, 0.4, 0.3) },
  { c: v3(3.8, 1.75, 0), r: v3(0.4, 0.34, 0.27) },
];

/** Each socket: the fang's own arc from the roof of the mouth up past its tip, a little wider than the fang. */
export const SOCKET_R = FANG_R + 0.06;
export function socketLine(side: 1 | -1): V3[] {
  return range(0.02, 1.08, 10).map((u) => fangPoint(u, side));
}

/** The backbone, head to tail: vertebra centres. */
export const SPINE: readonly V3[] = range(1.3, -5.5, 15).map((x) => v3(x, (TOP(x) + BOTTOM(x)) / 2 + 0.25, 0));

// ---------------------------------------------------------------- eye, grooves, lateral line, fins

/** The small eye, high on the head (its radius in cm). */
export const EYE = { x: 3.85, y: 1.45, r: 0.3 } as const;

/** A point on the skin at height y on the left (side 1) or right, at x: the skin's angle there. */
export function skinThetaAt(x: number, y: number): number {
  const s = sectionAt(x);
  const c = Math.max(-1, Math.min(1, (y - s.yc) / s.hy));
  return Math.acos(spow(c, EXP / 2));
}

/**
 * The deep sensory grooves and bony ridges of the head (lateral-line canals
 * and the gill cover), as (x, y) on its left side: mirrored for the right.
 */
export const GROOVES: readonly (readonly (readonly [number, number])[])[] = ([
  // Over the eye.
  [[5.6, 1.85], [5.0, 2.3], [4.2, 2.2], [3.4, 2.35], [2.6, 2.75]],
  // Under and behind the eye.
  [[5.55, 0.95], [4.9, 0.75], [4.1, 0.75], [3.35, 1.05], [3.0, 1.7], [2.9, 2.55]],
  // Down the cheek in front of the gill cover, and forward along the jaw.
  [[2.5, 2.85], [2.4, 1.7], [2.3, 0.5], [2.4, -0.3], [3.0, -0.4]],
  // The lower jaw's canal.
  [[2.3, -1.55], [3.2, -1.25], [4.2, -0.95], [5.1, -0.6], [5.85, -0.2]],
  // Cheek ridges between them: the cavernous head.
  [[3.4, 0.3], [3.8, 0.05], [4.3, 0.15], [4.75, 0.45]],
  [[3.0, 0.55], [2.85, 0.1]],
  [[4.6, 1.7], [4.65, 2.15]],
  [[3.45, 1.85], [3.6, 2.2]],
  // The gill cover's edge.
  [[1.75, 2.85], [1.35, 1.9], [1.15, 0.7], [1.2, -0.7], [1.45, -2.0]],
] as (readonly [number, number])[][]).map((g) => smoothLine(g));

/** A line through a few points, smoothed (Catmull-Rom) into many. */
function smoothLine(pts: readonly (readonly [number, number])[]): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  const at = (i: number): readonly [number, number] => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      const c = (a: number, b: number, c2: number, d: number): number =>
        0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])] as const);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** The lateral line along the flank, gill to tail: its pores sense the faintest movement of the water. */
export const LATERAL: readonly (readonly [number, number])[] = range(1.7, -5.5, 24).map((x) => {
  const s = sectionAt(x);
  return [x, s.yc + s.hy * 0.42] as const;
});

export interface Fin {
  /** The outline, in the model. */
  readonly outline: readonly V3[];
  /** Rays: base to tip. */
  readonly rays: readonly (readonly [V3, V3])[];
}

function midFin(base: readonly (readonly [number, number])[], edge: readonly (readonly [number, number])[], rays: number): Fin {
  const outline = [...base, ...[...edge].reverse()].map(([x, y]) => v3(x, y, 0));
  const pick = (pts: readonly (readonly [number, number])[], u: number): V3 => {
    const f = u * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const k = f - i;
    return v3(pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * k, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * k, 0);
  };
  return { outline, rays: range(0.05, 0.95, rays).map((u) => [pick(base, u), pick(edge, u)] as const) };
}

const along = (from: number, to: number, n: number, y: (x: number) => number): (readonly [number, number])[] => range(from, to, n).map((x) => [x, y(x)] as const);

export const DORSAL = midFin(
  along(0.4, -3.4, 8, (x) => TOP(x) - 0.25),
  [[0.4, TOP(0.4) + 0.1], [-0.3, TOP(-0.3) + 1.25], [-1.2, TOP(-1.2) + 1.35], [-2.2, TOP(-2.2) + 1.05], [-3.0, TOP(-3.0) + 0.75], [-3.4, TOP(-3.4) - 0.1]],
  11,
);
export const ANAL = midFin(
  along(-2.3, -4.3, 6, (x) => BOTTOM(x) + 0.25),
  [[-2.3, BOTTOM(-2.3) - 0.1], [-2.8, BOTTOM(-2.8) - 1.05], [-3.5, BOTTOM(-3.5) - 0.95], [-4.1, BOTTOM(-4.1) - 0.6], [-4.3, BOTTOM(-4.3) + 0.1]],
  7,
);
/** The forked tail: upper and lower lobes. */
export const TAIL: readonly Fin[] = [
  midFin([[-5.3, 0.1], [-5.3, 0.75]], [[-7.0, 0.35], [-9.5, 2.55]], 5),
  midFin([[-5.3, -0.65], [-5.3, 0.1]], [[-9.4, -2.35], [-7.0, -0.15]], 5),
].map((f) => ({ ...f, outline: tailOutline(f) }));

function tailOutline(f: Fin): V3[] {
  // A lobe: from the stalk out to its tip and back in to the fork.
  const [a, b] = [f.outline[0]!, f.outline[1]!];
  const [c, d] = [f.outline[2]!, f.outline[3]!];
  return [a, b, c, v3((c.x + d.x) / 2 - 0.4, (c.y + d.y) / 2, 0), d];
}

/** A pectoral fin on one side, fluttering (`flap` radians about its base). */
export function pectoral(side: 1 | -1, flap: number): Fin {
  const x0 = 1.1;
  const y0 = -0.9;
  const z0 = side * (skinAt(x0, skinThetaAt(x0, y0)).z + 0.05);
  const spread = 0.35 + 0.18 * Math.sin(flap);
  const tip = (len: number, drop: number): V3 => v3(x0 - len, y0 - drop, z0 + side * len * spread);
  const edge = [tip(1.5, 0.3), tip(1.75, 0.75), tip(1.55, 1.2), tip(1.0, 1.35)];
  const top = v3(x0, y0 + 0.25, z0);
  const bottom = v3(x0 + 0.05, y0 - 0.45, z0);
  const baseAt = (u: number): V3 => v3(top.x + (bottom.x - top.x) * u, top.y + (bottom.y - top.y) * u, z0);
  return { outline: [top, ...edge, bottom], rays: edge.map((e, i) => [baseAt(i / (edge.length - 1)), e] as const) };
}

/** The pelvic fins, small, on the belly. */
export function pelvic(side: 1 | -1): Fin {
  const x0 = -0.6;
  const y0 = BOTTOM(x0) + 0.15;
  const z0 = side * 0.35;
  const edge = [v3(x0 - 1.2, y0 - 0.7, z0 * 1.6), v3(x0 - 0.7, y0 - 0.9, z0 * 1.5)];
  return { outline: [v3(x0, y0, z0), ...edge, v3(x0 - 0.2, y0, z0)], rays: edge.map((e) => [v3(x0, y0, z0), e] as const) };
}

// ---------------------------------------------------------------- texture

export interface Mark {
  readonly x: number;
  readonly theta: number;
  readonly kind: 'scale' | 'dot';
  readonly size: number;
}

/** Rough little scales on the body in rows, stipple on the bony head: fixed points on the skin. */
export const MARKS: readonly Mark[] = (() => {
  const rng = createRng(5151);
  const marks: Mark[] = [];
  const cols = 24;
  const rows = 30;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = PEDUNCLE_X + 0.25 + (c / (cols - 1)) * (JAW_BACK_X - 0.2 - PEDUNCLE_X - 0.25) + (rng() - 0.5) * 0.06;
      const theta = -Math.PI + ((r + (c % 2) * 0.5) / rows) * 2 * Math.PI;
      marks.push({ x, theta, kind: 'scale', size: 0.26 + rng() * 0.05 });
    }
  }
  for (let k = 0; k < 260; k++) {
    const x = JAW_BACK_X + rng() * (SNOUT_X - 0.3 - JAW_BACK_X);
    marks.push({ x, theta: (rng() * 2 - 1) * Math.PI, kind: 'dot', size: 0.025 + rng() * 0.035 });
  }
  return marks;
})();

/** Whether a skin angle at x is on the lower jaw (below the lips). */
export function onJaw(x: number, theta: number): boolean {
  const rim = sectionAt(x).rim;
  const a = Math.abs(((theta + Math.PI) % (2 * Math.PI)) - Math.PI);
  return x > JAW_BACK_X && a > rim;
}
