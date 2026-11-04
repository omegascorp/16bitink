import { LINE, type Pt } from './draw';

/**
 * A very small painter's 3D: a surface is a grid of little quads, each washed
 * in its own colour, far ones first. It's what gives the swordfish real
 * foreshortening and mass in the 3/4 views a flat side-on drawing can't reach.
 * Model axes: x forward, y down, z away from the viewer.
 */

export interface V3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Pose3 {
  /** Where the model's origin lands on screen. */
  readonly x: number;
  readonly y: number;
  /** Pixels per model unit at the origin's depth. */
  readonly k: number;
  /** Heading in the screen's plane (0: right, positive: down). */
  readonly a: number;
  /** The nose turned towards the viewer. */
  readonly yaw: number;
  /** The back tilted towards the viewer. */
  readonly roll: number;
  /** The eye's distance, in model units: smaller is a stronger perspective. */
  readonly persp: number;
}

export interface Shade {
  /** Towards the light, in view space (unit length). */
  readonly light: V3;
  readonly ambient: number;
  readonly diffuse: number;
  /** The colour far parts fade into, and how much at the far end. */
  readonly fog: readonly [number, number, number];
  readonly fogMax: number;
}

export interface Grid {
  readonly nu: number;
  readonly nv: number;
  /** (nu + 1) * (nv + 1) points, row by row along u. */
  readonly at: readonly V3[];
  /** Three numbers (0 .. 255) per point. */
  readonly rgb: Float32Array;
  /** A closed body hides its far side; a fin shows both. */
  readonly closed: boolean;
  readonly gloss: number;
}

interface Cell {
  readonly d: number;
  readonly p: readonly [Pt, Pt, Pt, Pt];
  readonly c: string;
}

export const norm = (v: V3): V3 => {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
};

const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

/** Turns model points into view space: x right, y down, z away. */
export function viewer(p: Pose3): (m: V3) => V3 {
  const [cr, sr, cy, sy, ca, sa] = [Math.cos(p.roll), Math.sin(p.roll), Math.cos(p.yaw), Math.sin(p.yaw), Math.cos(p.a), Math.sin(p.a)];
  return (m) => {
    const y1 = m.y * cr - m.z * sr;
    const z1 = m.y * sr + m.z * cr;
    const x2 = m.x * cy + z1 * sy;
    return { x: x2 * ca - y1 * sa, y: x2 * sa + y1 * ca, z: -m.x * sy + z1 * cy };
  };
}

export function toScreen(p: Pose3, v: V3): Pt {
  const s = (p.persp / (p.persp + v.z)) * p.k;
  return { x: p.x + v.x * s, y: p.y + v.y * s };
}

/** Is the surface with this view-space normal, at this view-space point, turned to the eye? */
export const facing = (p: Pose3, at: V3, n: V3): boolean => dot(n, { x: at.x, y: at.y, z: at.z + p.persp }) < 0;

function shadeCell(g: Grid, i: number, rawN: V3, mid: V3, p: Pose3, s: Shade, far: number): string {
  const n = norm(rawN);
  const view = norm({ x: -mid.x, y: -mid.y, z: -mid.z - p.persp });
  const nl = dot(n, s.light);
  const half = 0.5 + 0.5 * nl;
  const light = s.ambient + s.diffuse * half * half;
  const glint = Math.max(0, dot(n, norm({ x: s.light.x + view.x, y: s.light.y + view.y, z: s.light.z + view.z })));
  const spec = g.gloss * glint ** 32 * 215;
  const rim = (1 - Math.abs(dot(n, view))) ** 3 * 46;
  const at = (c: number, r: number): number => {
    const v = g.rgb[i + c]! * light + spec + r;
    return Math.min(255, Math.round(v + (s.fog[c]! - v) * far));
  };
  return `rgb(${at(0, rim * 0.45)},${at(1, rim * 0.75)},${at(2, rim)})`;
}

/** Paints a grid, cells from `fromU` on, with an ink line of `outline` px round what shows. */
export function paintGrid(ctx: CanvasRenderingContext2D, p: Pose3, g: Grid, warp: (m: V3) => V3, s: Shade, outline: number, fromU = 0): void {
  const view = viewer(p);
  const row = g.nv + 1;
  const vs = g.at.map((m) => view(warp(m)));
  const ps = vs.map((v) => toScreen(p, v));
  const cells: Cell[] = [];
  for (let u = fromU; u < g.nu; u++) {
    for (let v = 0; v < g.nv; v++) {
      const [ia, ib, ic, id] = [u * row + v, (u + 1) * row + v, (u + 1) * row + v + 1, u * row + v + 1];
      const [a, b, c, d] = [vs[ia]!, vs[ib]!, vs[ic]!, vs[id]!];
      const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, z: (a.z + c.z) / 2 };
      const raw = cross(sub(d, a), sub(b, a));
      const n = g.closed || facing(p, mid, raw) ? raw : { x: -raw.x, y: -raw.y, z: -raw.z };
      if (g.closed && !facing(p, mid, n)) continue;
      const far = Math.max(0, Math.min(1, (mid.z + 14) / 60)) * s.fogMax;
      cells.push({ d: mid.z, p: [ps[ia]!, ps[ib]!, ps[ic]!, ps[id]!], c: shadeCell(g, ia * 3, n, mid, p, s, far) });
    }
  }
  cells.sort((x, y) => y.d - x.d);
  ctx.save();
  ctx.lineJoin = 'round';
  if (outline > 0) {
    ctx.beginPath();
    for (const c of cells) quadPath(ctx, c.p);
    ctx.lineWidth = outline * 2;
    ctx.strokeStyle = LINE;
    ctx.stroke();
  }
  ctx.lineWidth = 1.1;
  for (const c of cells) {
    ctx.beginPath();
    quadPath(ctx, c.p);
    ctx.fillStyle = c.c;
    ctx.strokeStyle = c.c;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function quadPath(ctx: CanvasRenderingContext2D, q: readonly [Pt, Pt, Pt, Pt]): void {
  ctx.moveTo(q[0].x, q[0].y);
  ctx.lineTo(q[1].x, q[1].y);
  ctx.lineTo(q[2].x, q[2].y);
  ctx.lineTo(q[3].x, q[3].y);
  ctx.closePath();
}
