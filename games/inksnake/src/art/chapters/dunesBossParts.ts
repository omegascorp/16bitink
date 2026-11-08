import { pt, TAU } from '../kit';
import type { Pt } from '../pen';

/**
 * The Roadrunner's geometry, seen from above facing +x: a slim streaky
 * body, a long neck running to a crested head and a long heavy bill, a long
 * graduated tail, long blue-grey legs on X-shaped feet. Board px, centred
 * near the body (the drawing shifts it to fit the frame).
 */
export type RunnerPose = 'walk0' | 'walk1' | 'aim' | 'dash0' | 'dash1' | 'skid' | 'startle';
export const RUNNER_POSES: readonly RunnerPose[] = ['walk0', 'walk1', 'aim', 'dash0', 'dash1', 'skid', 'startle'];

/** The crest: laid flat back, sleek (running), or raised in a shaggy fan. */
export type Crest = 'down' | 'sleek' | 'up';
/** The wings: folded on the flanks, thrown out to brake, or flared high in a fright. */
export type Wings = 'folded' | 'brake' | 'flare';

export interface Foot {
  readonly at: Pt;
  readonly ang: number;
  /** Lifted off the ground (a hop): no contact, a fainter shadow. */
  readonly up?: boolean;
}

export interface Tail {
  readonly root: Pt;
  readonly ang: number;
  readonly len: number;
  /** Half the fan's spread, radians. */
  readonly spread: number;
  readonly w: number;
  /** Cocked straight up at the sky: seen end-on, short, its long shadow thrown on the ground. */
  readonly up: boolean;
}

export interface Runner {
  readonly pose: RunnerPose;
  readonly body: Pt[];
  readonly bodyC: Pt;
  readonly bodyR: Pt;
  readonly tilt: number;
  readonly head: Pt;
  readonly headR: number;
  readonly bill: number;
  readonly crest: Crest;
  readonly neck: Pt[];
  readonly neckW: readonly [number, number];
  readonly tail: Tail;
  readonly wings: Wings;
  readonly feet: readonly Foot[];
  /** The legs are a blur of running. */
  readonly blur: 0 | 1 | null;
  /** How high it is off the ground, for its shadow (0 on the ground). */
  readonly lift: number;
  readonly shift: Pt;
}

interface Spec {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  readonly tilt?: number;
  readonly head: Pt;
  readonly headR?: number;
  readonly bill?: number;
  readonly crest: Crest;
  readonly neckW?: readonly [number, number];
  readonly tail: Tail;
  readonly wings?: Wings;
  readonly feet: readonly Foot[];
  readonly blur?: 0 | 1;
  readonly lift?: number;
  readonly shift: Pt;
}

const tail = (root: Pt, ang: number, len: number, spread: number, w: number, up = false): Tail => ({ root, ang, len, spread, w, up });
const foot = (x: number, y: number, ang = 0, up = false): Foot => ({ at: pt(x, y), ang, up });

function walk(k: 1 | -1): Spec {
  return {
    c: pt(0, 0), rx: 13, ry: 7, head: pt(24, 0.7 * k), crest: 'down',
    tail: tail(pt(-10, 0), Math.PI + 0.05 * k, 34, 0.16, 5.4),
    feet: [foot(13, 5.6 * k, 0.15 * k), foot(-4, -7.6 * k, -0.1 * k)], shift: pt(3, 0),
  };
}

function dash(k: 0 | 1): Spec {
  return {
    c: pt(-3, k ? 0.4 : -0.4), rx: 14.5, ry: 6.2, head: pt(28, 0), headR: 4.3, bill: 11, crest: 'sleek', neckW: [6, 3.6],
    tail: tail(pt(-15, 0), Math.PI, 33, 0.07, 5), feet: [], blur: k, shift: pt(5, 0),
  };
}

const SPECS: Readonly<Record<RunnerPose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  aim: {
    c: pt(-2, 0), rx: 12.5, ry: 7.6, head: pt(26, 0), headR: 4.3, bill: 11, crest: 'sleek', neckW: [6.4, 3.8],
    tail: tail(pt(-12, 0), Math.PI, 12, 0.95, 4.6, true),
    feet: [foot(7, 7.2, 0.1), foot(5, -7.2, -0.1)], shift: pt(2, 0),
  },
  dash0: dash(0),
  dash1: dash(1),
  skid: {
    c: pt(-1, 0), rx: 12, ry: 8, tilt: 0.1, head: pt(17, -1.5), headR: 4.7, crest: 'up', wings: 'brake',
    tail: tail(pt(-8, 0), 0.25, 13, 0.85, 4.6, true),
    feet: [foot(17, 5.5, 0.15), foot(16, -5, -0.1)], shift: pt(-2, 0),
  },
  startle: {
    c: pt(-4, 0), rx: 12, ry: 8.2, head: pt(16, 0), headR: 5, crest: 'up', wings: 'flare',
    tail: tail(pt(-13, 0), Math.PI, 13, 1.2, 4.6, true),
    feet: [foot(9, 6.5, 0.4, true), foot(9, -6.5, -0.4, true)], lift: 1, shift: pt(2, 0),
  },
};

/** A slim egg of a body, rounder at the breast, drawn out to a point at the rump, turned by `tilt`. */
function bodyShape(c: Pt, rx: number, ry: number, tilt: number): Pt[] {
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const x = Math.cos(a) * rx * (Math.cos(a) < 0 ? 1.08 : 1);
    const y = Math.sin(a) * ry * (1 - 0.32 * Math.max(0, -Math.cos(a)) ** 1.6 - 0.08 * Math.max(0, Math.cos(a)) ** 2);
    return pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  });
}

/** The Roadrunner's whole geometry for a pose. */
export function runner(pose: RunnerPose): Runner {
  const s = SPECS[pose];
  const tilt = s.tilt ?? 0;
  const body = bodyShape(s.c, s.rx, s.ry, tilt);
  const from = pt(s.c.x + s.rx * 0.55 * Math.cos(tilt), s.c.y + s.rx * 0.55 * Math.sin(tilt));
  const n = 10;
  const neck = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return pt(from.x + (s.head.x - from.x) * t, from.y + (s.head.y - from.y) * t + Math.sin(Math.PI * t) * 0.4);
  });
  return {
    pose, body, bodyC: s.c, bodyR: pt(s.rx, s.ry), tilt, head: s.head, headR: s.headR ?? 4.6, bill: s.bill ?? 10, crest: s.crest,
    neck, neckW: s.neckW ?? [7, 4.4], tail: s.tail, wings: s.wings ?? 'folded', feet: s.feet, blur: s.blur ?? null, lift: s.lift ?? 0, shift: s.shift,
  };
}
