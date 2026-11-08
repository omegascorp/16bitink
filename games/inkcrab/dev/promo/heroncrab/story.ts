import type { Pt } from '../../../src/art/pen';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { CTA as CRABBIRD_CTA } from '../crabbird/story';
import { type CrabClaw, type CrabPose, restingClaws } from './art/crab';
import { BILL_TIP, billHalfAt, EYE, HEAD_SCALE, type HeronHead, type HeronPose, type HeronWings } from './art/heron';
import { inVoice, WORDS, type Word } from './words';

/**
 * "This heron picked the wrong crab", narrated: every beat as a pure function
 * of time, timed from the voice's words (words.ts). From Phil Lanoue's 2012
 * photos in a salt marsh at low tide: a juvenile night heron went for a crab
 * in shallow water; the crab bit its face and poked it in the eye with a
 * claw; the heron jumped back, wings up, and the crab raised its claws; on the
 * second try the crab sank both claws into its bill; the heron twisted its
 * head to shake it off, gave up and flew away; the crab stayed, claws raised.
 * The crab's species isn't known, so it is never named.
 *
 * The hook (frame 1) is the clamp itself, close up; the story rewinds to the
 * stalk, comes back to the same close-up on "bill!", and the last ink wash
 * lands on it again.
 */
export const LOOP_S = 16.5;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`The script has no "${text}" (${nth})`);
  return inVoice(w.start);
}

/** The beats, seconds into the loop, each on its word. */
export const AT = {
  hookOut: said('A') - 0.3,
  spots: said('spots'),
  aim: said('It'),
  strike: said('strikes,'),
  bite: said('crab', 2) - 0.1,
  poke: said('pokes'),
  eye: said('EYE!'),
  standoff: said('Second'),
  strike2: said('The') - 0.12,
  close: said('crab', 3),
  clamp1: said('clamps'),
  clamp2: said('BOTH'),
  lift: said('claws'),
  bill: said('bill!'),
  shake: said('The', 2),
  drop: said('and', 2) - 0.08,
  after: said('and', 2) + 0.02,
  one: said('one.'),
  zero: said('zero.'),
  ctaStart: LOOP_S - 2.6,
  ctaGone: LOOP_S - 0.6,
  wash: LOOP_S - 0.6,
} as const;

// ---------------------------------------------------------------- the marsh (wide), world px = screen px at the rest camera

/** The water line where the heron wades. */
export const WADE_Y = 1150;
export const MARSH_K = 1.85;
const CRAB_HOME: Pt = { x: 800, y: 1112 };
export const MARSH_CRAB_K = 0.95;

export interface Cam {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const FOLDED: HeronWings = { open: 0, angle: -1.95, far: -1.62 };

const neutralHead = (x: number, y: number, a: number): HeronHead => ({ x, y, a, alarm: 0, gape: 0, wince: 0 });

/** Head local position that puts the bill tip on a world point, for a body pose and bill angle. */
function headReaching(body: Omit<HeronPose, 'head'>, tip: Pt, a: number): Pt {
  const reach = (BILL_TIP - 6) * HEAD_SCALE;
  const local = { x: (tip.x - body.x) / (body.face * body.k), y: (tip.y - body.y) / body.k };
  return { x: local.x - Math.cos(a) * reach, y: local.y - Math.sin(a) * reach };
}

/** The bill's tip target on the crab. */
const BITE_AT: Pt = { x: CRAB_HOME.x - 30, y: CRAB_HOME.y - 52 };

/** The heron in the wide marsh shot, from the stalk to the second strike. */
export function marshHeron(t: number): HeronPose {
  const walk = 1 - ramp(t, AT.spots - 0.4, AT.spots + 0.1);
  const x0 = lerp(320, 400, ramp(t, AT.hookOut, AT.spots + 0.1));
  // The hop back after the poke, and the step in again for the second try.
  const hop = ramp(t, AT.poke + 0.12, AT.eye + 0.1);
  const back = hop * (1 - ramp(t, AT.strike2 - 0.3, AT.strike2 + 0.05) * 0.6);
  const hopY = -70 * Math.sin(Math.PI * clamp01((t - AT.poke - 0.12) / 0.62));
  const x = x0 - 60 * back;
  const strikeLean = ramp(t, AT.strike - 0.02, AT.strike + 0.1) * (1 - ramp(t, AT.poke + 0.1, AT.poke + 0.4));
  const strike2Lean = ramp(t, AT.strike2, AT.strike2 + 0.12);
  const lean = -0.12 + 0.34 * Math.max(strikeLean, strike2Lean) - 0.16 * window01(t, AT.poke + 0.15, AT.strike2, 0.3);
  const body = {
    x, y: WADE_Y + hopY, k: MARSH_K, face: 1, lean, wings: FOLDED, tuck: 0, step: (t - AT.hookOut) * 5.2, walk: walk * 0.9,
  };
  // Stalking: neck in, bill tipped down at the crab; cocked back to aim; then the stab.
  const stalk = neutralHead(124, -226 + 10 * ramp(t, AT.spots, AT.spots + 0.4), 0.18 + 0.2 * ramp(t, AT.spots, AT.spots + 0.4));
  const cocked = neutralHead(104, -238, 0.48);
  const aimU = ramp(t, AT.aim - 0.1, AT.strike - 0.05);
  const strikeU = ramp(t, AT.strike - 0.03, AT.strike + 0.09);
  const out = headReaching(body, BITE_AT, 0.72);
  const recoilU = ramp(t, AT.poke + 0.06, AT.poke + 0.3);
  const high = { x: 92, y: -262 };
  const cock2 = ramp(t, AT.strike2 - 0.32, AT.strike2 - 0.05);
  const strike2U = ramp(t, AT.strike2, AT.strike2 + 0.12);
  const out2 = headReaching(body, { x: BITE_AT.x + 6, y: BITE_AT.y - 8 }, 0.62);
  let hx = lerp(lerp(stalk.x, cocked.x, aimU), out.x, strikeU);
  let hy = lerp(lerp(stalk.y, cocked.y, aimU), out.y, strikeU);
  let a = lerp(lerp(stalk.a, cocked.a, aimU), 0.72, strikeU);
  // Jolted up and back by the poke.
  hx = lerp(hx, high.x, recoilU);
  hy = lerp(hy, high.y, recoilU);
  a = lerp(a, -0.42, recoilU);
  hx = lerp(lerp(hx, cocked.x, cock2), out2.x, strike2U);
  hy = lerp(lerp(hy, cocked.y, cock2), out2.y, strike2U);
  a = lerp(lerp(a, 0.4, cock2), 0.62, strike2U);
  // A quick shudder of pain right after the poke.
  const ouch = window01(t, AT.poke + 0.05, AT.eye + 0.5, 0.1);
  a += 0.08 * ouch * Math.sin(t * 46);
  const wince = window01(t, AT.poke + 0.05, AT.eye + 0.55, 0.05) > 0.5 ? 1 : 0;
  const alarm = Math.max(ramp(t, AT.spots, AT.spots + 0.3) * 0.25, ramp(t, AT.eye + 0.4, AT.eye + 0.6));
  const gape = window01(t, AT.eye - 0.05, AT.eye + 0.5, 0.06) * (0.85 + 0.15 * Math.sin(t * 38));
  // Wings thrown up in the hop, held for the stand-off, folded for the second try.
  const open = window01(t, AT.poke + 0.12, AT.strike2 - 0.02, 0.32);
  const flutter = 0.12 * Math.sin(t * 15) * open;
  const wings: HeronWings = { open, angle: -2.05 + flutter, far: -1.7 + flutter * 0.8 };
  return { ...body, wings, head: { x: hx, y: hy, a, alarm, gape, wince } };
}

/** The crab in the marsh shot: waiting, biting the face, the jab at the eye, the stand-off. */
export function marshCrab(t: number, heronEye: Pt, billTip: Pt): CrabPose {
  const { x, y } = CRAB_HOME;
  const k = MARSH_CRAB_K;
  const sway = 0.03 * Math.sin(t * 1.7);
  const rot = -0.08 + sway;
  const raise = Math.max(ramp(t, AT.strike + 0.02, AT.strike + 0.2) * 0.5, ramp(t, AT.poke + 0.25, AT.standoff - 0.2));
  const rest = restingClaws(x, y, k, rot, raise, 0.4 + 0.3 * raise);
  // The left claw takes hold near the bill's root as it arrives ("bit its face").
  const grab = window01(t, AT.strike + 0.1, AT.poke + 0.2, 0.12);
  const left: CrabClaw = mixClaw(rest[0], { tip: { x: billTip.x - 40, y: billTip.y - 18 }, angle: -2.4, open: 0.05 }, grab);
  // The right claw draws back, then jabs the eye.
  const wind = ramp(t, AT.bite, AT.poke - 0.04) * (1 - ramp(t, AT.poke - 0.04, AT.poke + 0.04));
  const jab = window01(t, AT.poke - 0.04, AT.poke + 0.32, 0.06);
  const wound = { tip: { x: x + 40, y: y - 120 }, angle: -1.2, open: 0.1 };
  const right = mixClaw(mixClaw(rest[1], wound, wind), { tip: heronEye, angle: -2.1, open: 0 }, jab);
  return { x, y, k, rot, claws: [left, right], dangle: 0, kick: t * 2, glare: ramp(t, AT.poke, AT.poke + 0.3) };
}

export function mixClaw(a: CrabClaw, b: CrabClaw, u: number): CrabClaw {
  return { tip: { x: lerp(a.tip.x, b.tip.x, u), y: lerp(a.tip.y, b.tip.y, u) }, angle: lerp(a.angle, b.angle, u), open: lerp(a.open, b.open, u) };
}

const marshKeys = (pick: (c: Cam) => number): readonly Key[] => {
  const CAMS: readonly (readonly [number, Cam])[] = [
    [AT.hookOut, { x: 540, y: 940, zoom: 1 }],
    [AT.aim, { x: 560, y: 950, zoom: 1.08 }],
    [AT.strike + 0.15, { x: 600, y: 960, zoom: 1.3 }],
    [AT.poke - 0.1, { x: 640, y: 980, zoom: 1.65 }],
    [AT.eye + 0.1, { x: 610, y: 960, zoom: 1.5 }],
    [AT.standoff - 0.1, { x: 500, y: 920, zoom: 1.04 }],
    [AT.strike2, { x: 540, y: 940, zoom: 1.06 }],
    [AT.close, { x: 640, y: 1000, zoom: 1.45 }],
  ];
  return CAMS.map(([t, c]) => ({ t, at: pick(c), rate: 0 }));
};
const [MX, MY, MZ] = [marshKeys((c) => c.x), marshKeys((c) => c.y), marshKeys((c) => c.zoom)];

export function marshCam(t: number): Cam {
  const since = t - AT.poke;
  const shake = since >= 0 && since < 0.35 ? 18 * (1 - since / 0.35) : 0;
  return { x: curveAt(MX, t).at + shake * Math.sin(since * 90), y: curveAt(MY, t).at + shake * Math.cos(since * 70), zoom: curveAt(MZ, t).at };
}

// ---------------------------------------------------------------- the close-up (and the hook)

/** The close-up's body: big, bottom-left, only the breast, wing and head in the frame. */
const CLOSE_BODY = { x: -150, y: 1540, k: 3.7, face: 1, lean: -0.1, wings: FOLDED, tuck: 0, step: 0, walk: 0, legs: false } as const;
/** Where the head is and how the bill points in the hook. */
const HOOK_HEAD: Pt = { x: 280, y: 760 };
const HOOK_A = 0.24;
/** The crab's size in the close-up, screen px per unit. */
export const CLOSE_CRAB_K = 2.0;
/** Where along the bill each claw holds (0 root .. 1 tip). */
export const CLAMP_U = [0.4, 0.7] as const;

function closeBody(head: Pt, a: number, h: Omit<HeronHead, 'x' | 'y' | 'a'>): HeronPose {
  const b = CLOSE_BODY;
  return { ...b, head: { ...h, x: (head.x - b.x) / b.k, y: (head.y - b.y) / b.k, a } };
}

/** A point on the bill a share `u` from root to tip, `v` of its half-thickness above (−) or below (+) its middle, in world px. */
export function billPoint(p: HeronPose, u: number, v = 0): Pt {
  const lx = 22 + u * (BILL_TIP - 22);
  const ly = 4 + v * billHalfAt(u);
  const [c, s] = [Math.cos(p.head.a), Math.sin(p.head.a)];
  const q = { x: lx * HEAD_SCALE, y: ly * HEAD_SCALE };
  return { x: p.x + (p.head.x + q.x * c - q.y * s) * p.face * p.k, y: p.y + (p.head.y + q.x * s + q.y * c) * p.k };
}

/** The eye, in world px. */
export function eyeOf(p: HeronPose): Pt {
  const [c, s] = [Math.cos(p.head.a), Math.sin(p.head.a)];
  const q = { x: EYE.x * HEAD_SCALE, y: EYE.y * HEAD_SCALE };
  return { x: p.x + (p.head.x + q.x * c - q.y * s) * p.face * p.k, y: p.y + (p.head.y + q.x * s + q.y * c) * p.k };
}

/** The heron with the crab on its bill: a tremble of the head, eyes wide (frame 1, and back on "bill!"). */
export function holdHeron(t: number): HeronPose {
  const a = HOOK_A + 0.035 * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 12.1);
  return closeBody({ x: HOOK_HEAD.x + 5 * Math.sin(t * 5.1), y: HOOK_HEAD.y + 4 * Math.sin(t * 6.7) }, a, { alarm: 1, gape: 0, wince: 0 });
}

/** The crab hanging from the bill by both claws: kicking, swinging a little, glaring. */
export function hangingCrab(heron: HeronPose, t: number, swing: number): CrabPose {
  const [a, b] = [billPoint(heron, CLAMP_U[0], -0.2), billPoint(heron, CLAMP_U[1], -0.2)];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const rot = swing + 0.03 * Math.sin(t * 3.3);
  const drop = 172 * CLOSE_CRAB_K;
  const centre = { x: mid.x - Math.sin(rot) * drop, y: mid.y + Math.cos(rot) * drop };
  const bill = Math.atan2(b.y - a.y, b.x - a.x);
  const claw = (tip: Pt): CrabClaw => ({ tip: { x: tip.x + Math.sin(bill) * 14, y: tip.y - Math.cos(bill) * 14 }, angle: bill - Math.PI / 2, open: 0.08 });
  return { x: centre.x, y: centre.y, k: CLOSE_CRAB_K, rot, claws: [claw(a), claw(b)], dangle: 1, kick: t * 9, glare: 1 };
}

/** The crab in the water under the lowered bill, before it takes hold. */
const WATER_CRAB: Pt = { x: 660, y: 1560 };

/** The close-up, from the second stab to the drop. */
export function closeHeron(t: number): HeronPose {
  if (t >= AT.bill) {
    const hold = holdHeron(t);
    const s = clamp01((t - AT.shake) / (AT.drop - AT.shake));
    if (s <= 0) return hold;
    // Twisting the head to throw the crab off.
    const env = Math.sin(Math.PI * Math.min(1, s * 1.15));
    const wag = Math.sin(s * Math.PI * 2 * 3.1);
    const fling = ramp(t, AT.drop - 0.05, AT.drop + 0.15);
    return closeBody(
      { x: HOOK_HEAD.x + 46 * wag * env, y: HOOK_HEAD.y - 20 * env - 70 * fling },
      HOOK_A + 0.42 * wag * env - 0.4 * fling,
      // The bill stays clamped shut until the crab lets go.
      { alarm: 1, gape: 0.6 * fling, wince: 0 },
    );
  }
  // Lowered to the crab in the water, then lifting it clear.
  const lift = ramp(t, AT.lift - 0.15, AT.bill);
  const low = { x: HOOK_HEAD.x + 40, y: HOOK_HEAD.y + 330 };
  const head = { x: lerp(low.x, HOOK_HEAD.x, lift), y: lerp(low.y, HOOK_HEAD.y, lift) };
  const a = lerp(0.62, HOOK_A, lift);
  const jolt = ramp(t, AT.clamp1, AT.clamp1 + 0.08) * (1 - ramp(t, AT.clamp1 + 0.08, AT.clamp1 + 0.3));
  const jolt2 = ramp(t, AT.clamp2, AT.clamp2 + 0.08) * (1 - ramp(t, AT.clamp2 + 0.08, AT.clamp2 + 0.3));
  return closeBody({ x: head.x - 16 * (jolt + jolt2), y: head.y - 22 * (jolt + jolt2) }, a - 0.08 * (jolt + jolt2), {
    alarm: ramp(t, AT.clamp1, AT.clamp1 + 0.15), gape: 0, wince: 0,
  });
}

/** The crab in the close-up: clamping one claw then both, lifted, shaken, then let go. */
export function closeCrab(t: number): CrabPose {
  const heron = closeHeron(t);
  if (t >= AT.bill) {
    const s = clamp01((t - AT.shake) / (AT.drop - AT.shake));
    // The swing lags the head's twist.
    const wag = Math.sin(s * Math.PI * 2 * 3.1 - 1.1) * Math.sin(Math.PI * Math.min(1, s * 1.15));
    const hang = hangingCrab(heron, t, 0.06 * Math.sin(t * 2.4) - 0.5 * wag);
    const fall = Math.max(0, t - AT.drop);
    if (fall <= 0) return hang;
    // Let go: it drops away, claws flung open.
    return {
      ...hang,
      x: hang.x + 60 * fall,
      y: hang.y + 2600 * fall * fall,
      rot: hang.rot + 2.2 * fall,
      claws: [{ ...hang.claws[0], tip: { x: hang.claws[0].tip.x + 60 * fall - 40 * fall, y: hang.claws[0].tip.y + 2600 * fall * fall + 30 * fall }, open: 0.7 }, { ...hang.claws[1], tip: { x: hang.claws[1].tip.x + 60 * fall + 40 * fall, y: hang.claws[1].tip.y + 2600 * fall * fall + 30 * fall }, open: 0.7 }],
    };
  }
  const hang = hangingCrab(heron, t, 0.06 * Math.sin(t * 2.4));
  const up = ramp(t, AT.lift - 0.1, AT.bill);
  const sit: CrabPose = {
    x: WATER_CRAB.x, y: WATER_CRAB.y, k: CLOSE_CRAB_K, rot: -0.05, claws: restingClaws(WATER_CRAB.x, WATER_CRAB.y, CLOSE_CRAB_K, -0.05, 1, 0.6), dangle: 0, kick: t * 3, glare: 1,
  };
  const c1 = ramp(t, AT.clamp1 - 0.12, AT.clamp1);
  const c2 = ramp(t, AT.clamp2 - 0.12, AT.clamp2);
  const claws: [CrabClaw, CrabClaw] = [mixClaw(sit.claws[0], hang.claws[0], c1), mixClaw(sit.claws[1], hang.claws[1], c2)];
  return {
    ...sit,
    x: lerp(sit.x, hang.x, up),
    y: lerp(sit.y, hang.y, up),
    rot: lerp(sit.rot, hang.rot, up),
    claws: up > 0 ? [mixClaw(claws[0], hang.claws[0], up), mixClaw(claws[1], hang.claws[1], up)] : claws,
    dangle: up,
    kick: t * (3 + 6 * up),
  };
}

/** Water drips off the crab as it's lifted, world px. */
export function drips(t: number): readonly Pt[] {
  const u = t - (AT.lift - 0.1);
  if (u < 0 || u > 1.3) return [];
  return Array.from({ length: 9 }, (_, i) => {
    const born = (i % 5) * 0.14;
    const age = u - born;
    if (age < 0) return null;
    const from = { x: WATER_CRAB.x - 120 + (i * 37) % 240, y: lerp(WATER_CRAB.y + 60, 1060, clamp01(born / 0.8)) };
    return { x: from.x, y: from.y + 1600 * age * age };
  }).filter((p): p is Pt => p !== null && p.y < 1400);
}

export const CLOSE_WATER_Y = 1600;

// ---------------------------------------------------------------- after: the heron flies off, the crab stays

/** Where the crab sits, world px, in the after shot (the camera pans it up-left for the invitation). */
export const AFTER_CRAB: Pt = { x: 560, y: 1060 };
export const AFTER_K = 1.5;

export function afterCrab(t: number): CrabPose {
  const landed = ramp(t, AT.after, AT.after + 0.25);
  const raise = ramp(t, AT.after + 0.2, AT.after + 0.6);
  // A little victory bob of the claws on each score.
  const bob = 0.18 * window01(t, AT.one, AT.one + 0.5, 0.15) + 0.18 * window01(t, AT.zero, AT.zero + 0.5, 0.15);
  const rot = 0.02 * Math.sin(t * 2.1);
  const y = AFTER_CRAB.y - 40 * (1 - landed);
  const claws = restingClaws(AFTER_CRAB.x, y, AFTER_K, rot, lerp(0.2, 1, raise) + bob, 0.55 + 0.3 * Math.sin(t * 4));
  return { x: AFTER_CRAB.x, y, k: AFTER_K, rot, claws, dangle: 0.2 * (1 - landed), kick: t * 2.5, glare: 1 };
}

/** The heron flapping away into the distance, smaller and smaller. */
export function afterHeron(t: number): HeronPose {
  const u = clamp01((t - AT.after) / 1.6);
  const e = 1 - (1 - u) * (1 - u);
  const flap = Math.sin((t - AT.after) * 17);
  const k = lerp(1.25, 0.2, e) * (1 - 0.15 * clamp01((t - AT.after - 1.6) / 2.4));
  return {
    x: lerp(740, 905, e) + 20 * Math.max(0, t - AT.after - 1.6),
    y: lerp(960, 640, e) - 30 * Math.max(0, t - AT.after - 1.6),
    k,
    face: 1,
    lean: -0.36,
    head: { x: 118, y: -222, a: 0.05, alarm: 0.6, gape: 0, wince: 0 },
    wings: { open: 1, angle: -1.15 + 0.95 * flap, far: -1.35 + 0.9 * flap },
    tuck: 1,
    step: 0,
    walk: 0,
  };
}

/** The after shot's camera: holding on the crab, then panning it up-left to make room for the invitation. */
export function afterCam(t: number): Cam {
  const u = ramp(t, AT.ctaStart - 0.25, AT.ctaStart + 0.35);
  return { x: lerp(560, 781, u), y: lerp(1000, 1186, u), zoom: lerp(1.04, 0.95, u) };
}

/** The splash where the dropped crab lands. */
export const splashAt = (t: number): number => clamp01((t - AT.after) / 0.7);

// ---------------------------------------------------------------- shots and washes

export type ShotId = 'hook' | 'marsh' | 'close' | 'after';

export interface Shot {
  readonly id: ShotId;
  /** The time its pieces are posed at (the hook runs just before 0 across the loop point). */
  readonly at: number;
}

export interface FrameState {
  readonly under: Shot;
  readonly over: Shot | null;
  readonly u: number;
  readonly how: 'wash' | 'fade';
}

const still = (id: ShotId, at: number): FrameState => ({ under: { id, at }, over: null, u: 0, how: 'wash' });
const WASH_S = 0.3;
const CUT_S = 0.1;

/** Which shots are on screen at time t, in [0, LOOP_S]. */
export function shotsAt(t: number): FrameState {
  if (t < AT.hookOut) return still('hook', t);
  if (t < AT.hookOut + WASH_S) return { under: { id: 'hook', at: t }, over: { id: 'marsh', at: t }, u: (t - AT.hookOut) / WASH_S, how: 'wash' };
  if (t < AT.close) return still('marsh', t);
  if (t < AT.close + CUT_S) return { under: { id: 'marsh', at: t }, over: { id: 'close', at: t }, u: (t - AT.close) / CUT_S, how: 'fade' };
  if (t < AT.after) return still('close', t);
  if (t < AT.after + CUT_S) return { under: { id: 'close', at: t }, over: { id: 'after', at: t }, u: (t - AT.after) / CUT_S, how: 'fade' };
  if (t < AT.wash) return still('after', t);
  const u = (t - AT.wash) / (LOOP_S - AT.wash);
  // The last wash lands exactly on frame 1.
  return u >= 1 ? still('hook', t - LOOP_S) : { under: { id: 'after', at: t }, over: { id: 'hook', at: t - LOOP_S }, u, how: 'wash' };
}

// ---------------------------------------------------------------- marks

/** The comic star and "!" on the poked eye, 0 .. 1 over its life. */
export const starAt = (t: number): number => clamp01((t - AT.poke - 0.04) / 0.95);
/** The big "!" pulses again on "EYE!". */
export const bangAt = (t: number): number => window01(t, AT.eye - 0.05, AT.standoff - 0.05, 0.08);
/** Snap marks where each claw takes the bill. */
export const SNAPS = [AT.clamp1, AT.clamp2] as const;
export const snapMarkAt = (t: number, i: 0 | 1): number => clamp01((t - SNAPS[i]) / 0.45);
/** Shake lines round the head while it twists. */
export const shakeLinesAt = (t: number): number => window01(t, AT.shake, AT.drop, 0.12);

// ---------------------------------------------------------------- the scoreboard

export const SCORE = { y: 548, size: 108, crabX: 330, heronX: 770 } as const;
export const scoreCrabAt = (t: number): number => window01(t, AT.one, AT.wash, 0.12);
export const scoreHeronAt = (t: number): number => window01(t, AT.zero, AT.wash, 0.12);

// ---------------------------------------------------------------- words

export interface SpokenRow {
  readonly words: readonly string[];
  /** Index of the word being said; -1 before its first word. */
  readonly current: number;
  readonly y: number;
  readonly size: number;
  /** How solid its words are before they're said. */
  readonly unsaid: number;
}

/** How the script breaks into caption lines, by word count. The first two lines are the hook, shown together. */
const LINE_WORDS = [3, 3, 4, 3, 3, 2, 3, 5, 2, 3, 2, 3, 3, 3, 2, 2, 2] as const;
const HOOK_LINES = 2;
const HOOK_ROWS = [{ y: 372, size: 146 }, { y: 506, size: 146 }] as const;
export const ROW = { y: 400, size: 126 } as const;

export const LINES: readonly (readonly Word[])[] = LINE_WORDS.reduce<{ at: number; lines: (readonly Word[])[] }>(
  (acc, n) => ({ at: acc.at + n, lines: [...acc.lines, WORDS.slice(acc.at, acc.at + n)] }),
  { at: 0, lines: [] },
).lines;

const startOf = (line: readonly Word[]): number => inVoice(line[0]!.start);
const currentIn = (line: readonly Word[], t: number): number => line.reduce((c, w, i) => (t >= inVoice(w.start) ? i : c), -1);
const texts = (line: readonly Word[]): readonly string[] => line.map((w) => w.text);

/** The spoken caption at time t: the hook's two rows up from frame 1, then one line at a time. */
export function spokenAt(time: number): readonly SpokenRow[] {
  const t = time >= LOOP_S ? time - LOOP_S : time;
  if (t < startOf(LINES[HOOK_LINES]!)) {
    // One hot word: once the second row has begun, the first is simply said.
    const second = currentIn(LINES[1]!, t) >= 0;
    return LINES.slice(0, HOOK_LINES).map((line, i) => ({
      words: texts(line), current: i === 0 ? (second ? line.length : Math.max(0, currentIn(line, t))) : currentIn(line, t), unsaid: 1, ...HOOK_ROWS[i]!,
    }));
  }
  const line = [...LINES].reverse().find((l) => t >= startOf(l))!;
  return [{ words: texts(line), current: currentIn(line, t), unsaid: 0.55, ...ROW }];
}

// ---------------------------------------------------------------- the invitation at the end

export const CTA_FADE_S = 0.3;
/** The same layout as crabbird's invitation: words on the left, the game's card on the right, the arrow to the channel name. */
export const CTA = CRABBIRD_CTA;

/** How much of the invitation shows: only in the last 2.6 s, gone 0.6 s before the loop point. */
export const ctaAt = (t: number): number => window01(t, AT.ctaStart + 0.1, AT.ctaGone, CTA_FADE_S);

/** On the card, the game's heron freezes over the hermit crab; it pulls into its shell. */
export const cardHideAt = (t: number): number => ramp(t, AT.ctaStart + 0.9, AT.ctaStart + 1.15);
export const cardHeronAt = (t: number): number => ramp(t, AT.ctaStart + 0.2, AT.ctaStart + 0.8);

// ---------------------------------------------------------------- everything at once

export interface Poses {
  readonly heron: HeronPose;
  readonly crab: CrabPose;
  readonly cam: Cam;
}

/** The heron, crab and camera of a shot at its time. */
export function posesOf(shot: Shot): Poses {
  const t = shot.at;
  if (shot.id === 'hook') {
    const heron = holdHeron(t);
    return { heron, crab: hangingCrab(heron, t, 0.06 * Math.sin(t * 2.4)), cam: { x: 540, y: 960, zoom: 1 + 0.01 * (t + 0.6) } };
  }
  if (shot.id === 'close') {
    const heron = closeHeron(t);
    // The camera follows the head down to the water and back up.
    const headY = heron.y + heron.head.y * heron.k;
    return { heron, crab: closeCrab(t), cam: { x: 540, y: 960 + 0.85 * Math.max(0, headY - HOOK_HEAD.y), zoom: 1 } };
  }
  if (shot.id === 'after') return { heron: afterHeron(t), crab: afterCrab(t), cam: afterCam(t) };
  const heron = marshHeron(t);
  const tip = billPoint(heron, 0.98);
  return { heron, crab: marshCrab(t, eyeOf(heron), tip), cam: marshCam(t) };
}

/** Everything on screen at time t, as data: t = 0 and t = LOOP_S must match exactly. */
export function stateAt(t: number): { readonly shots: FrameState; readonly poses: Poses; readonly spoken: readonly SpokenRow[]; readonly cta: number; readonly score: readonly [number, number] } {
  const shots = shotsAt(t);
  const top = shots.over && shots.u >= 0.5 ? shots.over : shots.under;
  return { shots, poses: posesOf(top), spoken: spokenAt(t), cta: ctaAt(t), score: [scoreCrabAt(t), scoreHeronAt(t)] };
}
