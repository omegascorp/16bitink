import { capsule, closed, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { ellipseAt, glaze, skinWash } from '../critters/preyKit';

/**
 * A gecko's body seen from above facing +x, shared by the Rainforest's
 * geckos (the flying gecko and the tokay): a spine from the snout (s = 0)
 * to the tail tip, a width at each s, a bend for the pose, sprawling legs
 * and broad padded toes. Board px, light from the upper left.
 */

/** Where things sit along a gecko's spine, and its full width there (knots of s, width, eased between). */
export interface GeckoBuild {
  readonly len: number;
  /** The snout's x in the frame. */
  readonly snout: number;
  readonly shoulder: number;
  readonly hip: number;
  /** Where the trunk's swing ends and the tail's curve takes over. */
  readonly tailFrom: number;
  readonly width: readonly (readonly [number, number])[];
  /** Leg sizes: upper and lower lengths and widths (fore, hind), toe length and width. */
  readonly arm: readonly [number, number, number];
  readonly thigh: readonly [number, number, number];
  readonly toe: readonly [number, number];
}

/** How a pose bends it: the trunk's swing, the tail's curve and whip, each leg's phase (+1 forward), how far the legs splay, and a squash across (pressed flat). */
export interface GeckoBend {
  readonly trunk: number;
  readonly tail: number;
  readonly whip: number;
  /** Fore −y, fore +y, hind −y, hind +y. */
  readonly legs: readonly [number, number, number, number];
  readonly splay?: number;
  readonly flat?: number;
  /** Curls the tail round on itself (radians turned over its length, + towards +y): a sleeper's coil. */
  readonly curl?: number;
}

export interface Gecko {
  readonly spine: Pt[];
  readonly shape: Pt[];
  readonly at: (s: number, v: number) => Pt;
  readonly frame: (s: number) => { f: Pt; n: Pt };
  readonly widthAt: (s: number) => number;
}

export function widthOf(b: GeckoBuild): (s: number) => number {
  return (s) => {
    const w = b.width;
    for (let i = 1; i < w.length; i++) {
      const [s1, w1] = w[i]!;
      const [s0, w0] = w[i - 1]!;
      if (s <= s1) {
        const t = (s - s0) / (s1 - s0);
        return w0 + (w1 - w0) * (1 - Math.cos(Math.PI * t)) * 0.5;
      }
    }
    return w[w.length - 1]![1];
  };
}

/** The spine with its tail turned steadily by `curl` over its length (sampled, then read off by s). */
function curled(bent: (s: number) => Pt, b: GeckoBuild, curl: number): (s: number) => Pt {
  const step = 0.25;
  const table: Pt[] = [];
  let p = bent(b.tailFrom);
  const q = bent(b.tailFrom - 0.5);
  let heading = Math.atan2(p.y - q.y, p.x - q.x);
  for (let s = b.tailFrom; s <= b.len + step; s += step) {
    table.push(p);
    const u = (s - b.tailFrom) / (b.len - b.tailFrom);
    heading += (curl / (b.len - b.tailFrom)) * step * (0.6 + 0.8 * u);
    p = pt(p.x + Math.cos(heading) * step, p.y + Math.sin(heading) * step);
  }
  return (s) => {
    if (s <= b.tailFrom) return bent(s);
    const k = (s - b.tailFrom) / step;
    const i = Math.min(table.length - 2, Math.floor(k));
    const a = table[i]!;
    const c = table[i + 1]!;
    const t = k - i;
    return pt(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t);
  };
}

export function gecko(b: GeckoBuild, bend: GeckoBend): Gecko {
  const flat = 1 + (bend.flat ?? 0);
  const base = widthOf(b);
  const widthAt = (s: number): number => base(s) * (s > b.shoulder - 2 && s < b.tailFrom + 2 ? flat : 1 + (flat - 1) * 0.5);
  const bent = (s: number): Pt => {
    const trunk = bend.trunk * Math.sin((Math.PI * Math.min(s, b.tailFrom + 4)) / (b.tailFrom + 4));
    const u = Math.max(0, (s - b.tailFrom) / (b.len - b.tailFrom));
    return pt(b.snout - s, trunk + bend.tail * u ** 1.5 + bend.whip * Math.sin(Math.PI * u) * u);
  };
  const spineAt = bend.curl ? curled(bent, b, bend.curl) : bent;
  const n = 70;
  const spine = Array.from({ length: n + 1 }, (_, i) => spineAt((i / n) * b.len));
  const { shape } = ribbon(spine, (u) => widthAt(u * b.len));
  const frame = (s: number): { f: Pt; n: Pt } => {
    const a = spineAt(Math.max(0, s - 0.5));
    const c = spineAt(Math.min(b.len, s + 0.5));
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const f = pt((a.x - c.x) / l, (a.y - c.y) / l);
    return { f, n: pt(-f.y, f.x) };
  };
  const at = (s: number, v: number): Pt => {
    const p = spineAt(s);
    const { n: nn } = frame(s);
    const half = widthAt(s) / 2;
    return pt(p.x + nn.x * v * half, p.y + nn.y * v * half);
  };
  return { spine, shape, at, frame, widthAt };
}

/** Colours a gecko's limbs and toes are painted in. */
export interface LimbPaint {
  readonly wash: string;
  readonly deep: string;
  readonly mark: string;
  readonly pad: string;
}

/** A limb segment: washed, rounded, a soft mark across it, a lit top line, inked. */
export function limb(d: Draw, a: Pt, b: Pt, w0: number, w1: number, p: LimbPaint, line = 0.3): Pt[] {
  const { pen } = d;
  const shape = capsule(a, b, w0, w1);
  skinWash(d, shape, p.wash, p.deep);
  pen.clipped(shape, () => {
    const m = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
    glaze(d, m.x, m.y, Math.max(w0, w1) * 0.7, Math.max(w0, w1) * 0.5, Math.atan2(b.y - a.y, b.x - a.x), p.mark, 0.45);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    pen.hair([pt(a.x - nx * w0 * 0.2, a.y - ny * w0 * 0.2), pt(b.x - nx * w1 * 0.2, b.y - ny * w1 * 0.2)], Math.min(w0, w1) * 0.22, PAPER_FILL, 0.3);
  });
  pen.stroke(closed(shape), line, d.ink, 0.95, false);
  return shape;
}

/**
 * Broad gecko toes fanned round `ang` from `base`: each slim at its root and
 * spreading into a flat pad with fine lamellae across it, a hint of web
 * between them when `web` > 0.
 */
export function padToes(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[], w: number, p: LimbPaint, web = 0): void {
  const { pen } = d;
  const n = lens.length;
  const tips = lens.map((l, i) => {
    const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
    return { a, end: pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l), l };
  });
  if (web > 0) {
    const fan = [base, ...tips.map((t) => pt(base.x + (t.end.x - base.x) * web, base.y + (t.end.y - base.y) * web))];
    pen.fill(fan, mix(p.wash, PAPER_FILL, 0.25), 0.75);
    pen.hair(fan.slice(1), 0.18, d.ink, 0.5);
  }
  for (const { a, end, l } of tips) {
    const mid = pt(base.x + Math.cos(a) * l * 0.62, base.y + Math.sin(a) * l * 0.62);
    const toe = capsule(base, mid, w * 0.5, w * 0.5);
    skinWash(d, toe, p.wash, p.deep);
    pen.stroke(closed(toe), 0.2, d.ink, 0.8, false);
    const padC = pt(mid.x * 0.45 + end.x * 0.55, mid.y * 0.45 + end.y * 0.55);
    const pad = ellipseAt(padC.x, padC.y, l * 0.22, w * 0.52, a, 12);
    skinWash(d, pad, p.pad, p.deep, undefined, 0.35);
    pen.clipped(pad, () => {
      for (let k = -1; k <= 1; k++) {
        const c = pt(padC.x + Math.cos(a) * k * l * 0.1, padC.y + Math.sin(a) * k * l * 0.1);
        pen.hair([pt(c.x - Math.sin(a) * w, c.y + Math.cos(a) * w), pt(c.x + Math.sin(a) * w, c.y - Math.cos(a) * w)], 0.12, p.deep, 0.6);
      }
    });
    pen.stroke(closed(pad), 0.16, d.ink, 0.85, false);
  }
}

/** Where a pose puts one leg (side ±1) and its toes. */
export interface LegAt {
  readonly root: Pt;
  readonly joint: Pt;
  readonly end: Pt;
  readonly toeAng: number;
}

/** The four legs' joints for a bend: forelegs out and forward, hind legs out and back; splay pushes them out flatter. */
export function legJoints(b: GeckoBuild, z: Gecko, bend: GeckoBend): LegAt[] {
  const splay = bend.splay ?? 1;
  const out: LegAt[] = [];
  for (const [i, side] of [[0, -1], [1, 1]] as const) {
    const p = bend.legs[i]!;
    const { f, n } = z.frame(b.shoulder);
    const root = z.at(b.shoulder, side * 0.55);
    const o = pt(n.x * side, n.y * side);
    const [u, l] = b.arm;
    const joint = pt(root.x + o.x * u * splay + f.x * u * 0.4 * p, root.y + o.y * u * splay + f.y * u * 0.4 * p);
    const end = pt(joint.x + o.x * l * 0.35 * splay + f.x * l * (0.3 + 0.55 * p), joint.y + o.y * l * 0.35 * splay + f.y * l * (0.3 + 0.55 * p));
    out.push({ root, joint, end, toeAng: Math.atan2(f.y * (0.5 + 0.4 * p) + o.y * 0.8, f.x * (0.5 + 0.4 * p) + o.x * 0.8) });
  }
  for (const [i, side] of [[2, -1], [3, 1]] as const) {
    const p = bend.legs[i]!;
    const { f, n } = z.frame(b.hip);
    const root = z.at(b.hip, side * 0.55);
    const o = pt(n.x * side, n.y * side);
    const [u, l] = b.thigh;
    const joint = pt(root.x + o.x * u * splay + f.x * u * (0.15 + 0.45 * p), root.y + o.y * u * splay + f.y * u * (0.15 + 0.45 * p));
    const end = pt(joint.x + o.x * l * 0.3 * splay - f.x * l * (0.75 - 0.3 * p), joint.y + o.y * l * 0.3 * splay - f.y * l * (0.75 - 0.3 * p));
    out.push({ root, joint, end, toeAng: Math.atan2(-f.y * (0.7 - 0.3 * p) + o.y * 0.75, -f.x * (0.7 - 0.3 * p) + o.x * 0.75) });
  }
  return out;
}

/** The legs, hind pair first: two segments each and a fan of padded toes. */
export function geckoLegs(d: Draw, b: GeckoBuild, legs: readonly LegAt[], paint: LimbPaint, web = 0): void {
  const [, , w0] = b.arm;
  const [, , h0] = b.thigh;
  const [toeLen, toeW] = b.toe;
  for (const i of [2, 3, 0, 1]) {
    const L = legs[i]!;
    const hind = i >= 2;
    const lens = hind ? [0.6, 0.85, 1, 0.95, 0.7] : [0.55, 0.8, 0.95, 0.85, 0.6];
    padToes(d, L.end, L.toeAng, hind ? 1.9 : 2, lens.map((k) => k * toeLen * (hind ? 1.08 : 1)), toeW, paint, web);
    limb(d, L.joint, L.end, (hind ? h0 : w0) * 0.7, (hind ? h0 : w0) * 0.52, paint);
    limb(d, L.root, L.joint, hind ? h0 : w0, (hind ? h0 : w0) * 0.72, paint);
  }
}

/**
 * Granular scales over a shape: tiny rounded beads in loose rows, each a
 * fine arc on its shadow side and a speck of light, the gecko's velvet skin.
 */
export function granules(d: Draw, z: Gecko, from: number, to: number, step: number, deep: string, alpha = 0.45): void {
  const { pen } = d;
  for (let s = from, row = 0; s < to; s += step, row++) {
    const half = z.widthAt(s) / 2;
    const across = Math.max(1, Math.round((half * 2) / step));
    for (let j = 0; j <= across; j++) {
      const v = -1 + ((j + (row % 2) * 0.5) / across) * 2;
      if (Math.abs(v) > 0.94) continue;
      const c = z.at(s, v);
      const r = step * 0.42;
      pen.hair([pt(c.x + r * 0.7, c.y - r * 0.2), pt(c.x + r * 0.3, c.y + r * 0.6), pt(c.x - r * 0.5, c.y + r * 0.5)], 0.13, deep, alpha);
      pen.dot(c.x - r * 0.3, c.y - r * 0.3, 0.1, PAPER_FILL, alpha * 0.5);
    }
  }
}

/**
 * A gecko's big lidless eye bulging at the side of the head: a scaly rim,
 * a coloured iris veined darker, a slit pupil (wavy-edged, as a gecko's is)
 * and a wet glint.
 */
export function slitEye(d: Draw, c: Pt, r: number, iris: string, irisDeep: string, rim: string, side: number): void {
  const { pen } = d;
  const lid = ellipseAt(c.x, c.y, r * 1.22, r * 1.08, 0, 18);
  pen.fill(lid.map((p) => pt(p.x + 0.3, p.y + 0.45)), d.ink, 0.25);
  skinWash(d, lid, rim, mix(rim, '#1a1712', 0.5));
  pen.stroke(closed(lid), 0.3, d.ink, 0.9, false);
  const ball = ellipseAt(c.x + r * 0.05, c.y + side * r * 0.08, r * 0.9, r * 0.82, 0, 18);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, iris, 0.95);
  pen.clipped(ball, () => {
    pen.crescent(ball, pt(-r * 0.25, -r * 0.3), () => pen.fill(ball, irisDeep, 0.55));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.3, c.y + Math.sin(a) * r * 0.3), pt(c.x + Math.cos(a) * r * 0.8, c.y + Math.sin(a) * r * 0.75)], 0.1, irisDeep, 0.55);
    }
  });
  const slit = [pt(c.x + r * 0.05, c.y - r * 0.72), pt(c.x + r * 0.16, c.y - r * 0.3), pt(c.x - r * 0.02, c.y), pt(c.x + r * 0.16, c.y + r * 0.3), pt(c.x + r * 0.05, c.y + r * 0.72)];
  pen.hair(slit, r * 0.2, '#121015', 0.95);
  pen.stroke(closed(ball), 0.26, d.ink, 0.95, false);
  pen.dot(c.x - r * 0.3, c.y - r * 0.36, Math.max(0.28, r * 0.2), PAPER_FILL, 0.95);
}
