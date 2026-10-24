import { bezier, cub, type Draw, makeDraw, pt, ribbon, TAU } from '../kit';
import type { Pt } from '../pen';
import { withScratch } from '../pen';
import { ellipseAt } from '../propsKit';

/**
 * The Great Chameleon's geometry, shared by its skin and its lines so the
 * two register exactly: seen from above facing +x, a helmeted head with
 * turret eyes, a deep crested trunk, four gripping legs, and the tail
 * rolled into a tight spiral behind. Board units, centred on the frame.
 */
export type ChamPose = 'walk0' | 'walk1' | 'hurt';

export interface ChamFoot {
  /** The two opposed toe bundles (zygodactyl mittens). */
  readonly lobes: readonly Pt[][];
  /** Each bundle's tip and heading, for the claws. */
  readonly tips: readonly { p: Pt; ang: number; claws: number }[];
}

export interface ChamLeg {
  readonly upper: Pt[];
  readonly lower: Pt[];
  readonly joint: Pt;
  readonly wrist: Pt;
  readonly foot: ChamFoot;
}

export interface ChamEye {
  readonly c: Pt;
  readonly r: number;
  readonly side: 1 | -1;
  readonly shape: Pt[];
}

export interface Cham {
  /** Trunk and tail as one shape along a spine from the neck to the tail's tip. */
  readonly body: { shape: Pt[]; spine: Pt[]; top: Pt[]; bot: Pt[] };
  /** Index of the spine where the trunk ends and the tail begins. */
  readonly tailFrom: number;
  readonly head: Pt[];
  readonly casque: Pt[];
  readonly eyes: readonly ChamEye[];
  readonly legs: readonly ChamLeg[];
}

const flipY = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its lower half (traced from the back of the midline to the front of it). */
export const bilateralY = (half: readonly Pt[]): Pt[] => [...half, ...flipY(half).reverse().slice(1, -1)];

/** Smooth keyed values along a parameter. */
function keyed(keys: readonly (readonly [number, number])[], s: number): number {
  if (s <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [s1, w1] = keys[i]!;
    const [s0, w0] = keys[i - 1]!;
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      return w0 + (w1 - w0) * t * t * (3 - 2 * t);
    }
  }
  return keys[keys.length - 1]![1];
}

/** Neck, trunk and tail along one spine: straight back from the neck, then the tail rolls up. */
function trunk(pose: ChamPose): { body: Cham['body']; tailFrom: number } {
  const back = Array.from({ length: 32 }, (_, i) => pt(32 - i * 2, 0));
  const lift = pose === 'walk1' ? -2.5 : pose === 'hurt' ? 1.5 : 0;
  const C = pt(-50 + (pose === 'walk1' ? 1 : 0), 4 + lift);
  const r0 = 12;
  const E = pt(C.x, C.y - r0);
  const reach = cub(pt(-30, 0), pt(-37, 0.4), pt(E.x + 7, E.y + lift * 0.3), E, 10).slice(1);
  const turns = pose === 'hurt' ? 1.3 : 1.45;
  const coil = Array.from({ length: 44 }, (_, i) => {
    const t = (i + 1) / 44;
    const a = -Math.PI / 2 - TAU * turns * t;
    const r = r0 - 9 * t ** 0.85;
    return pt(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r);
  });
  const spine = [...back, ...reach, ...coil];
  const arc = [0];
  for (let i = 1; i < spine.length; i++) arc.push(arc[i - 1]! + Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y));
  const total = arc[arc.length - 1]!;
  const keys = [[0, 14], [10, 22], [26, 31], [40, 33], [52, 27], [62, 15], [70, 10.5]] as const;
  const width = (s: number): number => (s > 70 ? 1.8 + 8.7 * (1 - (s - 70) / (total - 70)) ** 0.8 : keyed(keys, s));
  const body = ribbon(spine, (u) => width(arc[Math.round(u * (spine.length - 1))]!));
  return { body: { ...body, spine }, tailFrom: back.length };
}

/** The head from above: a broad wedge, flaring at the jaw angles, the casque's point lying back over the neck. */
function headShape(): Pt[] {
  return bilateralY([
    ...cub(pt(13, 0), pt(15.5, 5), pt(20, 9.6), pt(26, 12.6), 6),
    ...cub(pt(26, 12.6), pt(31, 15.6), pt(41, 15.2), pt(47, 11), 8).slice(1),
    ...cub(pt(47, 11), pt(52, 7.8), pt(57.5, 5), pt(59.6, 2.4), 6).slice(1),
    pt(60.4, 0),
  ]);
}

/** The casque: a raised helmet, its point lying back over the neck, its rims running forward over the eyes to the snout. */
function casqueShape(): Pt[] {
  return bilateralY([
    ...cub(pt(12, 0), pt(16, 3), pt(21, 5.2), pt(27, 5.6), 6),
    ...cub(pt(27, 5.6), pt(34, 6), pt(44, 3.6), pt(52, 1.3), 7).slice(1),
    pt(55, 0),
  ]);
}

/** Where each leg roots, bends and grips, per pose: forward, back or splayed (hurt). */
interface LegSpec {
  readonly root: Pt;
  readonly joint: Pt;
  readonly wrist: Pt;
}

const FORE: Readonly<Record<'fwd' | 'back' | 'splay', LegSpec>> = {
  fwd: { root: pt(17, 6), joint: pt(13.5, 25), wrist: pt(29, 32) },
  back: { root: pt(15, 6), joint: pt(6, 24.5), wrist: pt(14, 34) },
  splay: { root: pt(17, 6), joint: pt(21, 26), wrist: pt(31, 39) },
};
const HIND: Readonly<Record<'fwd' | 'back' | 'splay', LegSpec>> = {
  fwd: { root: pt(-18, 6), joint: pt(-6.5, 24.5), wrist: pt(-15, 34) },
  back: { root: pt(-20, 6), joint: pt(-15, 26), wrist: pt(-32, 32) },
  splay: { root: pt(-20, 6), joint: pt(-23, 26.5), wrist: pt(-34, 38) },
};

/** A limb segment from a to b: a muscled tube, `w0` across at a and `w1` at b, swelling by `bulge`, round at both ends. */
function segment(a: Pt, b: Pt, w0: number, w1: number, bulge: number): Pt[] {
  const spine = Array.from({ length: 9 }, (_, i) => pt(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8));
  const { top, bot } = ribbon(spine, (u) => w0 + (w1 - w0) * u + bulge * Math.sin(Math.PI * u));
  const phi = Math.atan2(b.y - a.y, b.x - a.x);
  // Half-discs round each end: the far one sweeping forward from the top edge to the bottom, the near one back.
  const cap = (c: Pt, from: number, r: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => {
      const t = from + (Math.PI * (i + 1)) / 8;
      return pt(c.x + Math.cos(t) * r, c.y + Math.sin(t) * r);
    });
  return [...top, ...cap(b, phi - Math.PI / 2, w1 / 2), ...[...bot].reverse(), ...cap(a, phi + Math.PI / 2, w0 / 2)];
}

/** A two-part leg ending in two opposed toe bundles that grip the ground. */
function leg(spec: LegSpec, side: 1 | -1, fore: boolean, open: boolean): ChamLeg {
  const s = (p: Pt): Pt => pt(p.x, p.y * side);
  const root = s(spec.root);
  const joint = s(spec.joint);
  const wrist = s(spec.wrist);
  const ang = Math.atan2(wrist.y - joint.y, wrist.x - joint.x);
  const spread = open ? 1.05 : 0.6;
  const lobes: Pt[][] = [];
  const tips: { p: Pt; ang: number; claws: number }[] = [];
  for (const [k, len, claws] of [[1, fore ? 6.6 : 5.8, fore ? 2 : 3], [-1, fore ? 6 : 6.8, fore ? 3 : 2]] as const) {
    const a = ang + k * spread;
    const tip = pt(wrist.x + Math.cos(a) * len, wrist.y + Math.sin(a) * len);
    lobes.push(segment(wrist, tip, 6, 4.4, 0.8));
    tips.push({ p: tip, ang: a, claws });
  }
  return {
    upper: segment(root, joint, 9.6, 6.6, 1.6),
    lower: segment(joint, wrist, 6.8, 5, 0.9),
    joint,
    wrist,
    foot: { lobes, tips },
  };
}

/** The chameleon's whole geometry for a pose: identical in the skin and the lines. */
export function chameleon(pose: ChamPose): Cham {
  const { body, tailFrom } = trunk(pose);
  const hurt = pose === 'hurt';
  const a = pose === 'walk0';
  const pick = (fwd: boolean): 'fwd' | 'back' | 'splay' => (hurt ? 'splay' : fwd ? 'fwd' : 'back');
  const legs = [
    leg(HIND[pick(!a)], 1, false, hurt),
    leg(HIND[pick(a)], -1, false, hurt),
    leg(FORE[pick(a)], 1, true, hurt),
    leg(FORE[pick(!a)], -1, true, hurt),
  ];
  const eyes = ([1, -1] as const).map((side) => {
    const c = pt(37, side * 14.6);
    return { c, r: 7.6, side, shape: ellipseAt(c.x, c.y, 7.6, 7.2, 0, 30) };
  });
  return { body, tailFrom, head: headShape(), casque: casqueShape(), eyes, legs };
}

/** Every closed shape of the silhouette, back to front. */
export function silhouette(c: Cham): Pt[][] {
  return [...c.legs.flatMap((l) => [...l.foot.lobes, l.lower, l.upper]), c.body.shape, c.head, ...c.eyes.map((e) => e.shape)];
}

/** A small curved arc, as a scale's lower rim. */
export const scaleArc = (x: number, y: number, r: number): Pt[] => bezier(pt(x - r, y), pt(x, y + r * 0.9), pt(x + r, y), 3);

/**
 * Paints on a clear layer of the canvas's size, then lays it over the
 * canvas: lines that erase what lies under a part (as the gecko's do) then
 * only clear their own layer, never the ground beneath the boss.
 */
export function onLayer(d: Draw, paint: (layer: Draw) => void, alpha = 1, blur = 0): void {
  const { ctx } = d.pen;
  const seed = Math.floor(d.pen.rng() * 1e9);
  const res = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
  withScratch(ctx.canvas.width, ctx.canvas.height, (lctx, canvas) => {
    lctx.setTransform(ctx.getTransform());
    paint(makeDraw(lctx, seed, d.f, d.g, d.ink));
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    if (blur > 0) ctx.filter = `blur(${blur * res}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
}
