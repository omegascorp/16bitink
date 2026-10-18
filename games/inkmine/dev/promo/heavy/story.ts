import { BOIL } from '../../../src/art/palette';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "On a heavy planet, a deer would look like THIS": the square–cube law
 * (Galileo, Two New Sciences, 1638) and what three times our gravity would
 * do to animals, told by the narrator (words.ts), every beat timed to his
 * words and a pure function of time over a loop of LOOP_S. One mood a beat:
 *
 *   0     SHOCK: the heavy-world deer (squat, armoured, six column legs)
 *         has just stomped; the ground cracks, dust bursts; it stomps again
 *         on "THIS"
 *   4     LAUGH: you trudge bent double, two more of you dropping onto your
 *         back on "two more of you", a thud at every step
 *   7.5   CURIOUS: Galileo's notebook page, his two bones drawn by quill
 *         (one three times longer, far thicker), "1638"
 *   10    TENSION: a block deer doubles in size and its body fills with
 *         eight blocks, thump by thump; SURPRISE: its leg's cross-section
 *         holds only four
 *   15.2  JOLT: a thin-legged deer on the heavy world; its legs give on
 *         "snap" and it plops onto its belly, stunned
 *   17.3  TENDER: an elephant tries a hop; its feet never leave the ground
 *   19    TRIUMPH: the heavy-world deer strides back in, short, wide, its six
 *         legs counted; MISCHIEF: it rears on "Because" and stomps into the
 *         first frame.
 *
 * This file has the clock and the heavy-world deer and the stacked
 * prospectors; lesson.ts has the page and the blocks, falls.ts the thin deer
 * and the elephant.
 */
export const LOOP_S = 24;
const FPS_BOIL = 8;
/** The line boil steps at 8 a second: 192 steps, 64 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * FPS_BOIL;
export const boilAt = (t: number): number => Math.floor(wrap(t) * FPS_BOIL + 1e-9) % BOIL_STEPS % BOIL;

const HALF = LOOP_S / 2;
/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time from the loop point, negative before it: for beats that run across the seam. */
export const seam = (t: number): number => (wrap(t) < HALF ? wrap(t) : wrap(t) - LOOP_S);
/** How long ago `at` was, round the loop (0 .. LOOP_S). */
export const since = (t: number, at: number): number => wrap(t - at);

/** When word `i` of the voiceover begins in voice.mp3. */
export function said(i: number): number {
  const w = WORDS[i];
  if (!w) throw new Error(`no word #${i} in the voiceover`);
  return w.start / TEMPO;
}

export const THREE_AT = said(4);
export const DEER_AT = said(9);
export const LIKE_AT = said(12);
export const THIS_AT = said(13);
export const EVERY_AT = said(14);
export const STEP_AT = said(15);
export const TWO_AT = said(18);
export const MORE_AT = said(19);
export const BACK_AT = said(24);
export const GALILEO_AT = said(25);
export const RULE_AT = said(28);
export const YEAR_AT = said(30);
export const DOUBLE_AT = said(31);
export const ANIMAL_AT = said(33);
export const SIZE_AT = said(34);
export const GETS_AT = said(37);
export const EIGHT_AT = said(38);
export const HEAVIER_AT = said(40);
export const LEGS_AT = said(43);
export const ONLY_AT = said(44);
export const FOUR_AT = said(45);
export const STRONGER_AT = said(47);
export const THIN_AT = said(48);
export const THIN_LEGS_AT = said(49);
export const JUST_AT = said(51);
export const SNAP_AT = said(52);
export const ITS_AT = said(53);
export const ELEPHANTS_AT = said(55);
export const CANT_AT = said(56);
export const JUMP_AT = said(57);
export const SO_AT = said(58);
export const HEAVY_AT = said(59);
export const SHORT_AT = said(63);
export const WIDE_AT = said(64);
export const SIX_AT = said(66);
export const ANIMALS_AT = said(67);
export const BECAUSE_AT = said(68);

// ---------------------------------------------------------------- scenes

export type Scene = 'beast' | 'stack' | 'page' | 'blocks' | 'thin' | 'elephant';
const FADE = 0.2;
/** When each scene is up (the beast's runs across the loop point, from "So heavy worlds" to "Every step"). */
export const SCENES: Readonly<Record<Scene, readonly [number, number]>> = {
  beast: [SO_AT - 0.12 - LOOP_S, EVERY_AT + 0.1],
  stack: [EVERY_AT - 0.1, GALILEO_AT + 0.05],
  page: [GALILEO_AT - 0.25, DOUBLE_AT + 0.05],
  blocks: [DOUBLE_AT - 0.3, THIN_AT - 0.05],
  thin: [THIN_AT - 0.3, ITS_AT + 0.05],
  elephant: [ITS_AT - 0.25, SO_AT - 0.02],
};
export function sceneAt(name: Scene, t: number): number {
  const [from, to] = SCENES[name];
  return window01(name === 'beast' ? seam(t) : wrap(t), from, to, FADE);
}
/** How much of the backdrop is Earth's blue dusk (the elephant) rather than the heavy world's dark. */
export const earthAt = (t: number): number => sceneAt('elephant', t);

// ---------------------------------------------------------------- impacts and the shake

/** Every big hit: the camera jolts, a dust burst. */
export const SLAM_AT = LOOP_S - 0.15;
export const STOMP_AT = THIS_AT - 0.02;
export interface Impact {
  readonly t: number;
  readonly size: number;
}
export const IMPACTS: readonly Impact[] = [
  { t: SLAM_AT, size: 1 },
  { t: STOMP_AT, size: 0.85 },
  { t: SNAP_AT, size: 0.45 },
  { t: SNAP_AT + 0.22, size: 0.4 },
];
const SHAKE_PX = 26;
const SHAKE_S = 0.5;
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  let x = 0;
  let y = 0;
  for (const hit of IMPACTS) {
    const dt = since(t, hit.t);
    if (dt >= SHAKE_S) continue;
    const k = SHAKE_PX * hit.size * Math.exp(-dt / 0.11) * (1 - dt / SHAKE_S);
    x += k * Math.sin(dt * 71) * 0.5;
    y += k * Math.sin(dt * 53 + 0.3);
  }
  return { x, y };
}

// ---------------------------------------------------------------- the heavy-world deer

/** Its ground point at frame 1 (screen px) and its size (screen px per unit of its drawing). */
export const BEAST = { x: 510, ground: 990, scale: 3.45 } as const;
/** Its legs, rear to front: near ones at y = -58, far ones a little behind (x + 14) and higher. */
export const BEAST_LEGS: readonly { readonly x: number; readonly y: number; readonly far: boolean }[] = [
  { x: -64, y: -58, far: false }, { x: -6, y: -58, far: false }, { x: 52, y: -58, far: false },
  { x: -50, y: -63, far: true }, { x: 8, y: -63, far: true }, { x: 66, y: -63, far: true },
];
export const LEG_LEN = 58;
/** Far feet stand this much higher on screen (they're further away). */
export const FAR_RISE = 5;
/** It rears about its near hind hip. */
export const PIVOT = { x: -64, y: -58 } as const;

export interface LegPose {
  /** The hip, in the drawing's units after the body's tilt and bob. */
  readonly hip: { readonly x: number; readonly y: number };
  /** Radians (negative swings the foot forward). */
  readonly angle: number;
  /** The leg's length over its drawn length. */
  readonly stretch: number;
}
export interface BeastPose {
  readonly x: number;
  readonly ground: number;
  readonly scale: number;
  /** Body rotation about PIVOT; negative rears. */
  readonly tilt: number;
  /** Body drop on a hit, units. */
  readonly bob: number;
  readonly legs: readonly LegPose[];
}

const REAR_TILT = -0.3;
/** Rearing on "Because", slamming down into the loop point. */
function rearAt(t: number): number {
  const u = seam(t);
  const up = smooth(ramp(u, BECAUSE_AT - LOOP_S, BECAUSE_AT + 0.5 - LOOP_S));
  const fall = ramp(u, SLAM_AT - 0.16 - LOOP_S, SLAM_AT - LOOP_S);
  const proud = 0.25 * window01(wrap(t), ANIMALS_AT - 0.1, BECAUSE_AT + 0.3, 0.25);
  return REAR_TILT * Math.max(proud, up * (1 - fall * fall));
}

/** The squash of a hit: down and back up. */
function bobAt(t: number): number {
  let b = 0;
  for (const hit of IMPACTS.slice(0, 2)) {
    const dt = since(t, hit.t);
    if (dt < 0.6) b += 4 * hit.size * Math.sin((dt / 0.6) * Math.PI) * Math.exp(-dt / 0.2);
  }
  return b;
}

/** Walking in on "So heavy worlds": a tripod gait (two near legs and the far middle one together), slowing to a stand. */
const WALK = { from: SO_AT - 0.35, to: SHORT_AT - 0.05, cadence: 1.9, lift: 9, swing: 12 } as const;
const TRIPOD = [0, 1, 0, 1, 0, 1] as const;
export function walkAmp(t: number): number {
  const w = wrap(t);
  return w > 15 ? ramp(w, WALK.from, WALK.from + 0.15) * (1 - ramp(w, WALK.to - 0.4, WALK.to)) : 0;
}
const walkPhase = (t: number, leg: number): number => 2 * Math.PI * WALK.cadence * (wrap(t) - WALK.from) + Math.PI * TRIPOD[leg]!;
/** Each tripod's foot-down moments while it walks. */
export function walkSteps(): number[] {
  const out: number[] = [];
  for (let k = 1; k < 20; k++) {
    const at = WALK.from + k / (2 * WALK.cadence);
    if (at < WALK.to - 0.2) out.push(at);
  }
  return out;
}

/** The six legs counted on "SIX-legged", rear to front, near then far each pair: each stamps as its ring pops. */
export const COUNT_ORDER = [0, 3, 1, 4, 2, 5] as const;
export const countAt = (k: number): number => SIX_AT - 0.08 + k * 0.11;
function stampLift(t: number, leg: number): number {
  const at = countAt((COUNT_ORDER as readonly number[]).indexOf(leg));
  return 6 * (ramp(wrap(t), at - 0.18, at - 0.07) - ramp(wrap(t), at - 0.06, at));
}

/** The front near foot lifts and stomps on "THIS". */
function stompLift(t: number, leg: number): number {
  if (leg !== 2) return 0;
  const w = wrap(t);
  const fall = ramp(w, STOMP_AT - 0.12, STOMP_AT);
  return 24 * smooth(ramp(w, LIKE_AT - 0.2, STOMP_AT - 0.14)) * (1 - fall * fall);
}

/** How far each pair reaches as it rears (per radian): the hind legs brace back, the front ones paw forward. */
const REACH = [-25, 35, 70] as const;

function legAt(t: number, i: number, tilt: number, bob: number): LegPose {
  const leg = BEAST_LEGS[i]!;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const dx = leg.x - PIVOT.x;
  const dy = leg.y - PIVOT.y;
  const hip = { x: PIVOT.x + dx * c - dy * s, y: PIVOT.y + dx * s + dy * c + bob };
  const amp = walkAmp(t);
  const ph = walkPhase(t, i);
  const lift = WALK.lift * amp * Math.max(0, Math.sin(ph)) + stompLift(t, i) + stampLift(t, i);
  const swing = -WALK.swing * amp * Math.cos(ph) - tilt * REACH[i % 3]!;
  const foot = leg.far ? -FAR_RISE : 0;
  // Planted feet stay on the ground: the leg squashes under a dropped body.
  const reach = Math.min(LEG_LEN, foot - hip.y) - lift;
  return { hip, angle: -Math.atan2(swing, reach), stretch: Math.hypot(swing, reach) / LEG_LEN };
}

export function beastAt(t: number): BeastPose {
  const w = wrap(t);
  const late = w > 15;
  const arrive = clamp01((w - WALK.from) / (WALK.to - WALK.from));
  const x = late ? lerp(-170, BEAST.x, 1 - (1 - arrive) * (1 - arrive)) : BEAST.x;
  const scale = BEAST.scale * (late ? lerp(0.8, 1, smooth(ramp(w, BECAUSE_AT - 0.05, BECAUSE_AT + 0.55))) : 1);
  const tilt = rearAt(t);
  const amp = walkAmp(t);
  const bob = bobAt(t) - 1.2 * amp * Math.abs(Math.sin(2 * Math.PI * WALK.cadence * (w - WALK.from)));
  return { x, ground: BEAST.ground, scale, tilt, bob, legs: BEAST_LEGS.map((_, i) => legAt(t, i, tilt, bob)) };
}

/** Where its foot `i` is on screen. */
export function footOf(p: BeastPose, i: number): { readonly x: number; readonly y: number } {
  const l = p.legs[i]!;
  const len = LEG_LEN * l.stretch;
  return { x: p.x + (l.hip.x - Math.sin(l.angle) * len) * p.scale, y: p.ground + (l.hip.y + Math.cos(l.angle) * len) * p.scale };
}

/** Dust and cracks from the two stomps, under the front feet. */
export const burstAt = (t: number, at: number): number => since(t, at) / 1.4;
export function cracksAt(t: number, at: number): number {
  const dt = since(t, at);
  return (dt < HALF ? ramp(dt, 0, 0.18) : 0) * (1 - ramp(seam(t), EVERY_AT - 0.1, EVERY_AT + 0.1));
}

/** "short" and "wide" brackets, the six rings, and the triumphant glow. */
export const shortMark = (t: number): number => window01(wrap(t), SHORT_AT - 0.1, BECAUSE_AT, 0.2);
export const wideMark = (t: number): number => window01(wrap(t), WIDE_AT - 0.1, BECAUSE_AT, 0.2);
export const ringAt = (t: number, k: number): number => window01(wrap(t), countAt(k) - 0.02, BECAUSE_AT, 0.12);
export const glowAt = (t: number): number => window01(wrap(t), ANIMALS_AT - 0.15, LOOP_S - 0.35, 0.4);

// ---------------------------------------------------------------- you, carrying two more of you

/** The trudge: a heavy step every STEP_S, one landing on "step". */
const STEP_S = 0.55;
export const STEPS: readonly number[] = Array.from({ length: 6 }, (_, k) => STEP_AT - STEP_S + k * STEP_S);
/** Each of the two extra yous lands on your back: on "two" and on "more". */
export const RIDERS_LAND: readonly number[] = [TWO_AT + 0.04, MORE_AT + 0.12];
const FALL_S = 0.32;

export interface Walker {
  readonly x: number;
  readonly ground: number;
  /** How far bent over, radians. */
  readonly bend: number;
  /** The walk frame (0..2): one more each step. */
  readonly step: number;
  /** Dip on each footfall, px. */
  readonly dip: number;
  /** Squashed under the load (0 .. ~0.2). */
  readonly squash: number;
}
export function walkerAt(t: number): Walker {
  const w = wrap(t);
  const load = RIDERS_LAND.reduce((s, at) => s + smooth(ramp(w, at - 0.02, at + 0.15)), 0);
  const steps = STEPS.filter((at) => w >= at).length;
  const last = Math.max(...STEPS.filter((at) => w >= at), -9, ...RIDERS_LAND.filter((at) => w >= at));
  const dt = w - last;
  return {
    x: lerp(250, 640, clamp01((w - (EVERY_AT - 0.1)) / (GALILEO_AT - EVERY_AT + 0.1))),
    ground: 1010,
    bend: 0.1 + 0.05 * load,
    step: steps % 3,
    dip: dt < 0.4 ? 9 * Math.sin((dt / 0.4) * Math.PI) * Math.exp(-dt / 0.15) : 0,
    squash: 0.04 + 0.07 * load + (dt < 0.4 ? 0.05 * Math.sin((dt / 0.4) * Math.PI) * Math.exp(-dt / 0.15) : 0),
  };
}
/** A rider: how far above its seat it still is (px, 0 once landed) and its wobble. */
export function riderAt(t: number, i: number): { readonly drop: number; readonly wobble: number } | null {
  const w = wrap(t);
  const at = RIDERS_LAND[i]!;
  if (w < at - FALL_S || w > GALILEO_AT + 0.1) return null;
  const u = clamp01((at - w) / FALL_S);
  const dt = Math.max(0, w - at);
  return { drop: 900 * u * u, wobble: 0.16 * Math.exp(-dt / 0.5) * Math.sin(dt * 11) + 0.04 * Math.sin(w * 3.1 + i * 2) };
}
/** Sweat flying off you once loaded. */
export const sweatAt = (t: number): number => window01(wrap(t), MORE_AT + 0.2, GALILEO_AT + 0.05, 0.15);
