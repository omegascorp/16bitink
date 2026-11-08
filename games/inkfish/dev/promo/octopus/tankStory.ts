import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import type { Swim } from './dogfish';
import { blend, curlArm, type Pt } from './geom';
import { type Body, rootOf } from './octoArt';
import {
  BIG_AT, DOGFISH_AT, EATING_AT, GIANT_AT, OCTOPUSES_AT, SEATTLE_AT, SHARKS2_AT, STARTED_AT, THE_AT,
} from './story';
import { type Camera, type TankState, TANK } from './tank';

/**
 * The tank's choreography: the slow look round ("The Seattle Aquarium once
 * kept giant octopuses in a big tank with dogfish sharks") and the lunge
 * ("the octopuses started EATING the sharks!"). Pure functions of video time.
 */

/** The octopus's den on the rocks, world px. */
const DEN = { x: 330, y: 1098 } as const;
const SCALE = 0.62;

// ---------------------------------------------------------------- the cameras

const keysOf = (rows: readonly (readonly [number, number, number, number])[]): { x: Key[]; y: Key[]; z: Key[] } => ({
  x: rows.map(([t, x]) => ({ t, at: x, rate: 0 })),
  y: rows.map(([t, , y]) => ({ t, at: y, rate: 0 })),
  z: rows.map(([t, , , z]) => ({ t, at: Math.log(z), rate: 0 })),
});

/** The look round: wide on the tank and its sign, in on the octopus, back out to the big tank, drifting with the passing shark. */
const LOOK = keysOf([
  [THE_AT - 0.1, 540, 830, 1.0],
  [GIANT_AT - 0.15, 540, 830, 1.0],
  [OCTOPUSES_AT + 0.5, 380, 1010, 1.55],
  [BIG_AT - 0.05, 385, 1005, 1.55],
  [BIG_AT + 0.6, 540, 860, 1.04],
  [DOGFISH_AT + 1.4, 560, 870, 1.1],
]);
/** The lunge: close on the den, a push in as it strikes. */
const LUNGE = keysOf([
  [STARTED_AT - 0.9, 400, 960, 1.65],
  [EATING_AT - 0.1, 440, 940, 1.8],
  [EATING_AT + 0.3, 545, 880, 1.8],
  [SHARKS2_AT + 1.0, 550, 870, 2.0],
]);

const cam = (k: ReturnType<typeof keysOf>, t: number): Camera => ({ x: curveAt(k.x, t).at, y: curveAt(k.y, t).at, zoom: Math.exp(curveAt(k.z, t).at) });

// ---------------------------------------------------------------- the octopus at rest

const REST_HEADING = [0.35, 1.05, 2.05, 2.8, 3.4, -2.35, -0.75, -0.15] as const;
const REST_CURL = [2.0, 1.4, -1.4, -2.0, -2.2, -1.8, 1.8, 2.2] as const;
const REST_LEN = [300, 270, 270, 300, 260, 230, 230, 280] as const;

function restBody(t: number, gazeAt: Pt): Body {
  const dx = gazeAt.x - DEN.x;
  const dy = gazeAt.y - (DEN.y - 60);
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: DEN.x,
    y: DEN.y,
    angle: -0.08,
    scale: SCALE,
    lean: -0.12 + 0.03 * Math.sin(t * 1.3),
    breathe: 1 + 0.03 * Math.sin(t * 2.6),
    gaze: { x: Math.max(-1, Math.min(1, (dx / len) * 1.2)), y: Math.max(-1, Math.min(1, (dy / len) * 1.2)) },
    lid: 0.28,
    brow: 0,
    flush: 0,
    lineK: 1,
  };
}

function restArms(body: Body, t: number, tight = 0): Pt[][] {
  return REST_HEADING.map((h, i) => curlArm(rootOf(body, i), h + 0.1 * Math.sin(t * 0.9 + i), REST_LEN[i]! * (1 - 0.2 * tight), REST_CURL[i]! * (1 + 0.5 * tight), 0.25, t * 1.6 + i, 26));
}

// ---------------------------------------------------------------- the sharks

interface Cruiser {
  readonly y: number;
  readonly len: number;
  /** World px a second (+ swims right). */
  readonly v: number;
  /** Where it is at THE_AT. */
  readonly x0: number;
  readonly front: boolean;
}

const CRUISERS: readonly Cruiser[] = [
  { y: 520, len: 210, v: 95, x0: 220, front: false },
  { y: 760, len: 240, v: -120, x0: 900, front: false },
  { y: 930, len: 190, v: 80, x0: 640, front: false },
  // The close one, passing in front on "dogfish sharks".
  { y: 880, len: 400, v: -250, x0: 540 + 250 * (DOGFISH_AT + 0.45 - THE_AT), front: true },
];

function cruiserAt(c: Cruiser, t: number): Swim {
  const span = TANK.x1 - TANK.x0 + 2 * c.len;
  const raw = c.x0 + c.v * (t - THE_AT) - (TANK.x0 - c.len);
  const x = TANK.x0 - c.len + (((raw % span) + span) % span);
  return { x, y: c.y + 14 * Math.sin(t * 0.9 + c.y), length: c.len, facing: c.v > 0 ? 1 : -1, tilt: 0.04 * Math.sin(t * 1.1 + c.len), beat: t * 2 * Math.PI * 1.3, effort: 0.4 };
}

/** The close shark on "dogfish sharks", for its label. */
export const closeShark = (t: number): Swim => cruiserAt(CRUISERS[3]!, t);

// ---------------------------------------------------------------- the look round

export function lookAt(t: number): TankState {
  const close = closeShark(t);
  const body = restBody(t, t > DOGFISH_AT - 0.6 ? close : { x: 700, y: 760 });
  return {
    cam: cam(LOOK, t),
    body,
    arms: restArms(body, t),
    web: 0.14,
    back: CRUISERS.filter((c) => !c.front).map((c) => cruiserAt(c, t)),
    front: [close],
    caught: [],
    visitors: 1 - ramp(cam(LOOK, t).zoom, 1.06, 1.3),
    sign: window01(t, SEATTLE_AT - 0.12, GIANT_AT, 0.15),
  };
}

// ---------------------------------------------------------------- the lunge

const STRIKE = EATING_AT - 0.05;
/** Where the victim is caught, world px: cruising low over the rocks. */
export const GRAB = { x: 560, y: 895 } as const;
/** Where the octopus lands, on top of it. */
const LAND = { x: 556, y: 838 } as const;

/** The victim: cruising in from the left over the den, pounced on, wrapped up and gone. */
function victimAt(t: number): (Swim & { alpha: number }) | null {
  const caught = t >= STRIKE + 0.14;
  if (!caught) {
    const x = GRAB.x - 300 * (STRIKE + 0.14 - t);
    return { x, y: GRAB.y - 6 + 6 * Math.sin(t * 1.4), length: 270, facing: 1, tilt: 0.03, beat: t * 2 * Math.PI * 1.4, effort: 0.5, alpha: 1 };
  }
  const s = t - STRIKE - 0.14;
  const gone = smooth((t - (SHARKS2_AT + 0.05)) / 0.45);
  if (gone >= 1) return null;
  return {
    x: GRAB.x + 7 * Math.sin(s * 23),
    y: GRAB.y + 5 * Math.cos(s * 19) - 20 * gone,
    length: 270 * (1 - 0.5 * gone),
    facing: 1,
    tilt: 0.22 * Math.sin(s * 17) * (1 - gone),
    beat: s * 2 * Math.PI * 4,
    effort: 1,
    alpha: 1 - gone,
  };
}

const TENT_HEADING = [0.55, 1.25, 1.9, 2.6, 3.05, 2.35, 0.8, 0.1] as const;
const TENT_CURL = [1.6, 1.0, -1.0, -1.6, -1.9, -1.2, 1.2, 1.9] as const;

/** Arm i thrown over the shark like a net (a tent of web and arms), then coiled tight under it (a ball). */
function netArm(body: Body, i: number, t: number, coil: number): Pt[] {
  const k = 1 + 0.9 * coil;
  return curlArm(rootOf(body, i), TENT_HEADING[i]! + 0.06 * Math.sin(t * 11 + i), (210 - 70 * coil) * (body.scale / 0.75), TENT_CURL[i]! * k, 0.25 * (1 - coil), t * 12 + i, 26);
}

export function lungeAt(t: number): TankState {
  const crouch = ramp(t, STARTED_AT - 0.8, STRIKE - 0.05);
  const leap = smooth((t - (STRIKE - 0.1)) / 0.32);
  const coil = smooth((t - (STRIKE + 0.3)) / 0.55);
  const victim = victimAt(t);
  const base = restBody(t, victim ?? GRAB);
  // Up off the den in an arc and down onto the shark, growing as it comes at us.
  const at = { x: lerp(DEN.x, LAND.x, leap), y: lerp(DEN.y + 14 * crouch, LAND.y, leap) - 90 * Math.sin(Math.PI * leap) };
  const pulse = 0.04 * Math.sin(t * 14) * coil;
  const body: Body = {
    ...base,
    x: at.x,
    y: at.y,
    angle: lerp(-0.08, 0.06, leap) + 0.25 * Math.sin(Math.PI * leap) + 0.04 * Math.sin(t * 9) * coil,
    scale: lerp(SCALE, 0.75, leap),
    lean: base.lean - 0.1 * leap,
    breathe: 1 - 0.05 * crouch + 0.06 * leap + pulse,
    gaze: leap > 0.5 ? { x: 0.1, y: 0.9 } : base.gaze,
    lid: lerp(0.28, 0.1, crouch) + 0.3 * coil,
    brow: Math.max(crouch, leap) * 0.9 - 0.3 * coil,
    flush: Math.max(0.7 * leap, 0.25 * crouch),
  };
  const rest = restArms(body, t, crouch);
  const arms = rest.map((r, i) => (leap > 0 ? blend(r, netArm(body, i, t, coil), leap, 60) : r));
  return {
    cam: cam(LUNGE, t),
    body,
    arms,
    web: 0.14 + 0.3 * leap + 0.06 * coil,
    back: CRUISERS.filter((c) => !c.front).slice(0, 2).map((c) => cruiserAt(c, t)),
    front: victim && leap < 0.5 ? [victim] : [],
    caught: victim && leap >= 0.5 ? [victim] : [],
    visitors: 0,
    sign: 0,
  };
}
