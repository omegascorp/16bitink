import { createRng } from '../../logic/rng';
import { capsule, closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { beadEye, castShadow, type Coat, ellipseAt, furEdge, glaze, hairs, sizeOf } from './preyKit';
import { paintTail, rodentFoot, rodentHand } from './preyRodentParts';

/**
 * A rodent seen from directly above, facing +x: a teardrop body, broad at
 * the haunches and tapering to the snout, washed and modelled by light from
 * the upper left, its coat brushed in short pen hairs lying back from the
 * nose; round ears, bead eyes, a pink nose and whiskers, pink paws peeping
 * out at the sides and a long tail. The mouse and the rat are two looks of
 * it (see mouse.ts and rat.ts).
 */
export interface RodentLook {
  /** Body length and width, board px (the tail is extra). */
  readonly len: number;
  readonly wide: number;
  readonly fur: string;
  /** A warm glaze over the upper back (agouti). */
  readonly warm: string;
  readonly back: string;
  readonly pale: string;
  readonly deep: string;
  readonly pink: string;
  readonly pinkDeep: string;
  readonly tail: string;
  readonly tailDeep: string;
  /** Ear radius, board px. */
  readonly earR: number;
  readonly eyeR: number;
  /** 0 (pointed, a mouse) .. 1 (blunt, a rat). */
  readonly snout: number;
  readonly tailLen: number;
  readonly tailW: number;
  /** Scale rings on the tail: their spacing and strength. */
  readonly ring: number;
  readonly ringAlpha: number;
  readonly hairLen: number;
  readonly hairN: number;
  /** Long dark guard hairs over the coat (a rough rat has many). */
  readonly guard: number;
  readonly tuft: number;
  readonly line: number;
  readonly whisker: number;
  readonly seed: number;
}

/** How a pose holds the body: stretch, a slight sideways bend, paw shifts (−y side, +y side) and the tail's path. */
export interface RodentPose {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly fore: readonly [number, number];
  readonly hind: readonly [number, number];
  readonly sit: boolean;
  /** The tail's spine from the rump, built on the body frame. */
  readonly tail: (b: BodyFrame, look: RodentLook) => Pt[];
}

/** Points on the body: `at(u, v)`, u from rump (0) to nose (1), v across (−1..1 edge to edge). */
export interface BodyFrame {
  readonly at: (u: number, v: number) => Pt;
  readonly half: (u: number) => number;
  readonly rump: Pt;
  readonly nose: Pt;
}

/**
 * The body's half width along it (0..1 of the widest): an elliptical rump,
 * haunches narrowing to the shoulders, then the head's round cheeks running
 * out to the snout (blunter as `snout` rises). The two are blended smoothly.
 */
function profile(u: number, snout: number): number {
  if (u < 0.3) {
    const k = (0.3 - u) / 0.3;
    return Math.sqrt(Math.max(0, 1 - k * k));
  }
  const x = (u - 0.3) / 0.4;
  const trunk = (1 - 0.3 * x * x) * (1 - smooth(0.68, 0.84, u));
  const hc = 0.67 - snout * 0.02;
  const hr = 1 - hc;
  const head = (0.74 + snout * 0.04) * Math.pow(Math.max(0, 1 - ((u - hc) / hr) ** 2), 0.78 - snout * 0.2) * (u > 0.36 ? 1 : 0);
  const k = 28;
  const blend = Math.log(Math.exp(k * trunk) + Math.exp(k * head)) / k - Math.log(2) / k * Math.exp(-k * Math.abs(trunk - head));
  const waist = 1 - 0.06 * Math.exp(-(((u - 0.61) / 0.06) ** 2));
  return u >= 1 ? 0 : Math.max(0, blend) * waist;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function bodyFrame(look: RodentLook, pose: RodentPose): BodyFrame {
  const L = look.len * pose.sx;
  const half = (u: number): number => (look.wide / 2) * pose.sy * profile(u, look.snout);
  const mid = (u: number): number => pose.bend * (2 * u - 1) ** 2;
  const at = (u: number, v: number): Pt => pt(-L / 2 + u * L, mid(u) + v * half(u));
  return { at, half, rump: at(0, 0), nose: at(1, 0) };
}

/** The outline: nose round the +y side to the rump and back along the −y side. */
function outline(b: BodyFrame, n = 30): Pt[] {
  const us = Array.from({ length: n + 1 }, (_, i) => (1 - Math.cos((Math.PI * i) / n)) / 2);
  const top = [...us].reverse().map((u) => b.at(u, 1));
  const bot = us.slice(1, -1).map((u) => b.at(u, -1));
  return [...top, ...bot];
}

/** The coat: hairs lie back from the nose and fan out to the flanks; dark along the spine, pale at the edges. */
function coatOf(look: RodentLook, b: BodyFrame): Coat {
  const L = b.nose.x - b.rump.x;
  const across = (p: Pt): number => {
    const u = Math.max(0.02, Math.min(0.98, (p.x - b.rump.x) / L));
    return (p.y - b.at(u, 0).y) / Math.max(0.5, b.half(u));
  };
  return {
    dir: (p) => Math.atan2(across(p) * 0.55, -1),
    color: (p, r) => {
      const v = Math.abs(across(p));
      if (r < 0.06) return mix(look.deep, '#26316a', 0.3);
      if (v > 0.72) return r < 0.6 ? look.pale : mix(look.pale, PAPER_FILL, 0.5);
      if (v < 0.4) return r < 0.45 ? look.back : r < 0.8 ? look.fur : mix(look.fur, look.pale, 0.6);
      return r < 0.5 ? look.fur : mix(look.fur, look.pale, 0.5);
    },
  };
}

/** The furred body: pale flanks, the darker back laid over, modelled, haired and contoured. */
function paintBody(d: Draw, look: RodentLook, b: BodyFrame, shape: readonly Pt[]): void {
  const { pen } = d;
  const size = sizeOf(shape);
  const L = b.nose.x - b.rump.x;
  const backShape = outline({ ...b, at: (u, v) => b.at(u, v * 0.66) }, 24);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, look.pale, 0.9);
  pen.clipped(shape, () => {
    pen.fill(backShape, look.fur, 0.8);
    glaze(d, b.at(0.42, 0).x, b.at(0.42, 0).y, L * 0.42, b.half(0.42) * 0.62, 0, look.back, 0.7);
    glaze(d, b.at(0.64, 0).x, b.at(0.64, 0).y, L * 0.12, b.half(0.64) * 0.5, 0, look.back, 0.55);
    glaze(d, b.at(0.5, -0.3).x, b.at(0.5, -0.3).y, L * 0.25, b.half(0.5) * 0.4, 0, look.warm, 0.35);
    // The muzzle is paler, a little pink at the tip.
    glaze(d, b.at(0.92, 0).x, b.at(0.92, 0).y, L * 0.12, b.half(0.86) * 0.9, 0, mix(look.pale, PAPER_FILL, 0.3), 0.6);
  });
  hairs(d, shape, coatOf(look, b), look.hairN, look.seed, look.hairLen, Math.max(0.2, look.wide * 0.016), 0.6);
  if (look.guard > 0) hairs(d, shape, coatOf(look, b), look.guard, look.seed + 7, look.hairLen * 1.7, Math.max(0.3, look.wide * 0.014), 0.55);
  pen.clipped(shape, () => {
    glaze(d, b.at(0.42, -0.35).x, b.at(0.42, -0.35).y, L * 0.3, b.half(0.42) * 0.42, -0.25, PAPER_FILL, 0.3);
    glaze(d, b.at(0.74, -0.3).x, b.at(0.74, -0.3).y, L * 0.12, b.half(0.74) * 0.38, -0.25, PAPER_FILL, 0.25);
    glaze(d, b.at(0.8, -0.15).x, b.at(0.8, -0.15).y, L * 0.09, b.half(0.8) * 0.4, -0.2, PAPER_FILL, 0.28);
    for (const s of [-1, 1]) glaze(d, b.at(0.6, s * 0.75).x, b.at(0.6, s * 0.75).y, L * 0.07, b.half(0.6) * 0.35, 0, look.deep, 0.3);
    pen.crescent(shape, pt(-size * 0.06, -size * 0.12), () => pen.fill(shape, look.deep, 0.34));
    pen.crescent(shape, pt(-size * 0.025, -size * 0.05), () => pen.fill(shape, look.deep, 0.22));
  });
  const inkCoat: Coat = { dir: coatOf(look, b).dir, color: () => d.ink };
  pen.crescent(shape, pt(-size * 0.07, -size * 0.13), () => hairs(d, shape, inkCoat, Math.round(look.hairN * 0.45), look.seed + 5, look.hairLen * 1.1, Math.max(0.18, look.wide * 0.014), 0.45));
  furEdge(d, shape, look.line, look.seed + 3, 1, look.tuft, 0.95 - look.tuft * 0.12);
  fringe(d, look, b, shape);
}

/**
 * The coat's fringe: hairs in the coat's own colours crossing the contour,
 * lying back along the body, so the silhouette reads soft (shaggy on a rat).
 * The face is left clean.
 */
function fringe(d: Draw, look: RodentLook, b: BodyFrame, shape: readonly Pt[]): void {
  const rng = createRng(look.seed + 9);
  const coat = coatOf(look, b);
  const L = b.nose.x - b.rump.x;
  const n = shape.length;
  const c = shape.reduce((s, p) => pt(s.x + p.x / n, s.y + p.y / n), pt(0, 0));
  for (let i = 0; i < n; i++) {
    const p = shape[i]!;
    if ((p.x - b.rump.x) / L > 0.8 || rng() > 0.85) continue;
    for (let j = 0; j < look.tuft; j++) {
      const r = Math.hypot(p.x - c.x, p.y - c.y) || 1;
      const o = pt((p.x - c.x) / r, (p.y - c.y) / r);
      const a = coat.dir(p) + (rng() - 0.5) * 0.5;
      const l = look.hairLen * (0.5 + rng() * 0.7);
      const from = pt(p.x - o.x * l * 0.5 + (rng() - 0.5), p.y - o.y * l * 0.5 + (rng() - 0.5));
      const to = pt(from.x + Math.cos(a) * l + o.x * l * 0.8, from.y + Math.sin(a) * l + o.y * l * 0.8);
      d.pen.hair([from, to], Math.max(0.24, look.wide * 0.028), coat.color(p, rng()), 0.9);
    }
  }
}

/** An ear standing up at the back of the head: a furred rim round a pink, translucent hollow. */
function ear(d: Draw, look: RodentLook, c: Pt, s: number): void {
  const { pen } = d;
  const r = look.earR;
  const rot = s * 0.5;
  const rim = ellipseAt(c.x, c.y, r * 0.82, r, rot, 22);
  castShadow(d, rim, pt(r * 0.25, r * 0.38), 0.22);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, look.fur, 0.85);
  const inner = ellipseAt(c.x + r * 0.06, c.y + s * r * 0.1, r * 0.56, r * 0.7, rot, 20);
  pen.fill(inner, look.pink, 0.75);
  pen.clipped(inner, () => {
    glaze(d, c.x - r * 0.15, c.y + s * r * 0.05, r * 0.5, r * 0.35, rot, PAPER_FILL, 0.45);
    pen.crescent(inner, pt(-r * 0.22, -r * 0.3), () => pen.fill(inner, look.pinkDeep, 0.55));
    pen.hair([pt(c.x - r * 0.25, c.y + s * r * 0.1), pt(c.x + r * 0.05, c.y + s * r * 0.35), pt(c.x + r * 0.3, c.y + s * r * 0.45)], 0.3, look.pinkDeep, 0.6);
  });
  pen.clipped(rim, () => pen.crescent(rim, pt(-r * 0.25, -r * 0.35), () => pen.fill(rim, look.deep, 0.35)));
  pen.hair(closed(inner), 0.3, look.pinkDeep, 0.7);
  pen.stroke(closed(rim), look.line * 0.75, d.ink, 0.9);
}

/** The face: eyes, the nose, whisker pads and whiskers. */
function face(d: Draw, look: RodentLook, b: BodyFrame): void {
  const { pen } = d;
  const k = look.wide / 13;
  const tip = b.nose;
  for (const s of [-1, 1]) {
    const e = b.at(0.8, s * 0.62);
    glaze(d, e.x, e.y, look.eyeR * 2, look.eyeR * 1.5, 0, look.deep, 0.45);
    beadEye(d, e, look.eyeR);
    pen.hair([pt(e.x - look.eyeR * 0.9, e.y - s * look.eyeR * 0.55), pt(e.x + look.eyeR * 0.2, e.y - s * look.eyeR * 0.95), pt(e.x + look.eyeR, e.y - s * look.eyeR * 0.5)], 0.3, d.ink, 0.6);
    for (const [u, v] of [[0.9, 0.42], [0.92, 0.3], [0.88, 0.3]] as const) {
      const p = b.at(u, s * v);
      pen.dot(p.x, p.y, 0.16 * k, look.deep, 0.45);
    }
  }
  const nose = ellipseAt(tip.x - 0.55 * k, tip.y, 0.95 * k, 1.1 * k, 0, 14);
  pen.fill(nose, look.pink, 1);
  pen.clipped(nose, () => pen.crescent(nose, pt(-0.4 * k, -0.5 * k), () => pen.fill(nose, look.pinkDeep, 0.6)));
  pen.dot(tip.x - 0.75 * k, tip.y - 0.45 * k, 0.28 * k, PAPER_FILL, 0.9);
  pen.hair(closed(nose), 0.35, d.ink, 0.85);
  whiskers(d, look, b);
}

/** Fine whiskers fanning out from the snout, curving back a little at their tips. */
function whiskers(d: Draw, look: RodentLook, b: BodyFrame): void {
  const { pen } = d;
  const w = look.whisker;
  for (const s of [-1, 1]) {
    const root = b.at(0.9, s * 0.45);
    for (const [a, l] of [[0.25, 1], [0.65, 0.95], [1.05, 0.85], [1.45, 0.7]] as const) {
      const ang = s * a;
      const end = pt(root.x + Math.cos(ang) * w * l, root.y + Math.sin(ang) * w * l);
      const mid = pt(root.x + Math.cos(ang - s * 0.18) * w * l * 0.55, root.y + Math.sin(ang - s * 0.18) * w * l * 0.55);
      pen.hair([root, mid, end], Math.max(0.16, look.wide * 0.016), d.ink, 0.5);
    }
  }
}

/** Legs and paws at the sides, under the body: forepaws by the shoulders, long hind feet by the haunches. */
function limbs(d: Draw, look: RodentLook, b: BodyFrame, pose: RodentPose): void {
  const { pen } = d;
  const k = look.wide / 13;
  [-1, 1].forEach((s, i) => {
    const fore = pose.fore[i]!;
    const hind = pose.hind[i]!;
    const wrist = pose.sit ? b.at(0.88, s * 0.62) : b.at(0.72 + fore, s * (1 + Math.max(0, fore) * 0.9));
    const heel = pose.sit ? b.at(0.2, s * 0.84) : b.at(0.22 + hind, s * (0.94 + Math.max(0, -hind) * 1.1));
    if (!pose.sit && fore > 0.08) {
      // The reaching foreleg shows between the shoulder and the paw.
      const leg = capsule(b.at(0.66, s * 0.7), wrist, 2.2 * k, 1.4 * k);
      pen.fill(leg, PAPER_FILL, 1);
      pen.fill(leg, mix(look.fur, look.pale, 0.35), 0.9);
      pen.clipped(leg, () => pen.crescent(leg, pt(-0.4 * k, -0.7 * k), () => pen.fill(leg, look.deep, 0.35)));
      pen.hair(closed(leg), look.line * 0.6, d.ink, 0.55);
    }
    rodentFoot(d, look, heel, s, pose.sit ? 0.35 * s : (hind < 0 ? 0.65 : 0.3) * s);
    rodentHand(d, look, wrist, s, pose.sit ? 0.1 * s : (fore > 0 ? 0.25 : 0.55) * s);
  });
}

/** One pose of a rodent: its shadow, the tail, legs and paws, the body, ears and face. */
export function drawRodent(d: Draw, look: RodentLook, pose: RodentPose): void {
  const b = bodyFrame(look, pose);
  const shape = outline(b);
  const spine = pose.tail(b, look);
  const size = look.wide;
  castShadow(d, shape.map((p) => pt(p.x * 1.03, p.y * 1.08)), pt(size * 0.1, size * 0.16), 0.17);
  paintTail(d, look, spine);
  limbs(d, look, b, pose);
  paintBody(d, look, b, shape);
  for (const s of [-1, 1]) {
    const base = b.at(0.64, s * 0.72);
    ear(d, look, pt(base.x - look.earR * 0.1, base.y + s * look.earR * 0.3), s);
  }
  face(d, look, b);
}

/** Tail paths shared by the rodents, scaled by the tail's length T from the rump. */
export const TAILS = {
  /** Curled round the +y flank and forward, as it sits. */
  curl: (b: BodyFrame, look: RodentLook): Pt[] => {
    const T = look.tailLen;
    const r = pt(b.rump.x + look.len * 0.03, b.rump.y);
    const side = look.wide * 0.5;
    const a = cub(r, pt(r.x - T * 0.3, r.y + T * 0.02), pt(r.x - T * 0.24, side + T * 0.2), pt(r.x + T * 0.12, side + T * 0.13), 14);
    const c = cub(a[a.length - 1]!, pt(r.x + T * 0.34, side + T * 0.08), pt(r.x + T * 0.5, side + T * 0.12), pt(r.x + T * 0.55, side + T * 0.2), 8);
    return [...a, ...c.slice(1)];
  },
  /** Trailing behind and swept to one side (`s`), its tip flicking back. */
  swing: (s: number) => (b: BodyFrame, look: RodentLook): Pt[] => {
    const T = look.tailLen;
    const r = pt(b.rump.x + look.len * 0.03, b.rump.y);
    return cub(r, pt(r.x - T * 0.34, r.y - s * T * 0.08), pt(r.x - T * 0.36, r.y + s * T * 0.38), pt(r.x - T * 0.56, r.y + s * T * 0.54), 22);
  },
} as const;
