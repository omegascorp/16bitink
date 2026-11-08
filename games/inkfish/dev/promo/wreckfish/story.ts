import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { mouthOf } from './swimmer';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This fish swallowed a whole SHARK": 28 June 2019, about 80 mi off South
 * Carolina, NOAA's ROV Deep Discoverer filmed at least eleven deep-sea
 * dogfish sharks feeding on a dead swordfish 446–454 m (1,463–1,490 ft)
 * down, until a big wreckfish swam in and swallowed one of the sharks whole,
 * its tail still flailing from the wreckfish's lips.
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts). Two scenes: the deep (the
 * floodlit seabed, one world with a camera) and the descent between them.
 *
 *   0     "This fish swallowed a whole SHARK!" (thrill): close on the wreckfish's
 *         head, jaws wide round a dogfish going in head first, its back half
 *         flicking outside; the jaws shut on "SHARK!", the tail wiggling from the lips
 *   2.1   "Almost fifteen hundred feet down," (eerie): the camera drops down a dark
 *         water column after the ROV's lamps, the light fading, a depth readout
 *         ticking to "1,500 ft" / "450 m"
 *   4.2   "eleven sharks were tearing into a dead swordfish…" (unease): the swordfish
 *         lying on the rock in the floodlight, still and whole; on "eleven" the
 *         sharks pop in one at a time, nosing it
 *   7.7   "then a wreckfish showed up!" (shock): a huge shadow slides into the light;
 *         the sharks scatter a little; "!"s pop over them
 *   9.4   "It couldn't bite the swordfish…" (comic): the wreckfish bumps the swordfish
 *         with its open mouth, twice; it doesn't fit; boing
 *   11.1  "so it ate the guy who COULD." (smug): its eye turns to a shark above, which
 *         freezes stiff
 *   12.9  "One gulp. Tail still wiggling." (dramatic): suction lunge, gulp, the shark
 *         half in and its tail wiggling from the lips
 *   15.3  "And that's how" (sly): push in to frame 1's framing; the jaws open wide
 *         for the next gulp, which the loop's first line finishes.
 */

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const SWALLOWED_AT = said('swallowed');
export const SHARK_AT = said('SHARK!');
export const ALMOST_AT = said('Almost');
export const FEET_AT = said('feet');
export const DOWN_AT = said('down,');
export const DOWN_END = ends('down,');
export const ELEVEN_AT = said('eleven');
export const SHARKS_AT = said('sharks');
export const TEARING_AT = said('tearing');
export const DEAD_AT = said('dead');
export const SWORDFISH_AT = said('swordfish…');
export const THEN_AT = said('then');
export const WRECKFISH_AT = said('wreckfish');
export const SHOWED_AT = said('showed');
export const UP_AT = said('up!');
export const IT_AT = said('It');
export const BITE_AT = said('bite');
export const SWORDFISH2_AT = said('swordfish…', 2);
export const SO_AT = said('so');
export const ATE_AT = said('ate');
export const GUY_AT = said('guy');
export const COULD_AT = said('COULD.');
export const ONE_AT = said('One');
export const GULP_AT = said('gulp.');
export const TAIL_AT = said('Tail');
export const WIGGLING_AT = said('wiggling.');
export const AND_AT = said('And');

// ---------------------------------------------------------------- scenes

export type SceneId = 'deep' | 'descent';

/** The drop into the descent after the hook, and the landing in the floodlight. */
export const DROP = { from: 2.1, to: 2.45 } as const;
export const LAND = { from: 4.2, to: 4.48 } as const;
/** While the descent covers the screen, the deep resets to the start of the story. */
export const RESET = 3.3;

/** What's on screen at t: one scene, or two mixing (`mix` of the second over the first). */
export interface SceneMix {
  readonly a: SceneId;
  readonly b: SceneId | null;
  readonly mix: number;
}

export function sceneAt(t: number): SceneMix {
  const u = wrap(t);
  if (u < DROP.from || u >= LAND.to) return { a: 'deep', b: null, mix: 0 };
  if (u < DROP.to) return { a: 'deep', b: 'descent', mix: ramp(u, DROP.from, DROP.to) };
  if (u < LAND.from) return { a: 'descent', b: null, mix: 0 };
  return { a: 'descent', b: 'deep', mix: ramp(u, LAND.from, LAND.to) };
}

// ---------------------------------------------------------------- tracks

/** Keys for several values at once: [t, ...values]; rates are Catmull-Rom except where `still` says 0. */
type Row = readonly number[];

function track(rows: readonly Row[], stillAt: readonly number[] = []): (t: number) => number[] {
  const n = rows[0]!.length - 1;
  const curves: Key[][] = Array.from({ length: n }, (_, c) =>
    rows.map((r) => (stillAt.includes(r[0]!) ? { t: r[0]!, at: r[c + 1]!, rate: 0 } : { t: r[0]!, at: r[c + 1]! })),
  );
  return (t) => curves.map((keys) => curveAt(keys, t).at);
}

/** Two tracks round the loop: `hook` from 0 until RESET, `main` from RESET to the loop point. */
function looped(hook: (u: number) => number[], main: (u: number) => number[]): (t: number) => number[] {
  return (t) => {
    const u = wrap(t);
    return u < RESET ? hook(u) : main(u);
  };
}

// ---------------------------------------------------------------- world and camera

/** A fish in the world: centre, body length (world px), facing, tilt (+ nose up), tail beat and its strength. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The world point the camera centres sits at this screen point. */
export const FOCUS: Pt = { x: 540, y: 860 };
export const toScreen = (v: View, p: Pt): Pt => ({ x: FOCUS.x + (p.x - v.x) * v.zoom, y: FOCUS.y + (p.y - v.y) * v.zoom });

/** A world fish as a pose on screen. */
export function poseOn(v: View, f: Fish, shape: Pose['shape']): Pose {
  const c = toScreen(v, f);
  return { j: 0, age: 0, shape, x: c.x, y: c.y, length: f.length * v.zoom, facing: f.facing, tilt: f.tilt, beat: f.beat, effort: f.effort };
}
/** A world fish as a pose in world px. */
export const worldPose = (f: Fish, shape: Pose['shape']): Pose => poseOn({ x: FOCUS.x, y: FOCUS.y, zoom: 1 }, f, shape);

/** The rock the swordfish lies on: its top is y 0, world px (y down). */
export const WRECK_LEN = 640;
export const SHARK_LEN = 270;
/** The shark that gets eaten: a big one, so frame 1 shows a whole shark. */
export const SHARK0_LEN = 350;
export const SWORD = { x: 260, y: -105, length: 760, tilt: 0.03 } as const;

// ---------------------------------------------------------------- the wreckfish

/** The wreckfish's last pose, where frame 1 has it. */
const HOOK_POSE = { x: -170, y: -1005, tilt: 0.12 } as const;

const WRECK_HOOK = track([
  [0, HOOK_POSE.x, HOOK_POSE.y, HOOK_POSE.tilt],
  [1.5, -160, -1007, 0.12],
  [1.78, -132, -1012, 0.15],
  [2.6, -140, -1012, 0.13],
  [RESET, -140, -1012, 0.13],
], [0, RESET]);

/** Bumps on the swordfish, mouth first: on "bite" and on "swordfish…". */
export const BUMPS = [BITE_AT + 0.03, SWORDFISH2_AT + 0.1] as const;

const WRECK_MAIN = track([
  [RESET, -1500, -430, 0],
  [THEN_AT - 0.2, -1300, -430, 0],
  [WRECKFISH_AT + 0.2, -720, -420, 0.02],
  [UP_AT + 0.1, -430, -410, 0],
  [IT_AT + 0.1, -280, -470, -0.25],
  [BUMPS[0], 79, -403, -0.5],
  [BUMPS[0] + 0.17, 10, -450, -0.42],
  [BUMPS[1], 64, -412, -0.5],
  [BUMPS[1] + 0.18, 0, -455, -0.42],
  [SO_AT, -60, -560, -0.12],
  [ATE_AT + 0.15, -170, -850, 0.05],
  [COULD_AT + 0.45, -200, -960, 0.1],
  [ONE_AT + 0.05, -205, -962, 0.1],
  [GULP_AT + 0.02, -110, -990, 0.14],
  [GULP_AT + 0.5, -140, -995, 0.12],
  [AND_AT, -160, -1000, 0.12],
  [LOOP_S, HOOK_POSE.x, HOOK_POSE.y, HOOK_POSE.tilt],
], [RESET, LOOP_S]);

const wreckTrack = looped(WRECK_HOOK, WRECK_MAIN);

/** How hidden it is in the dark: hidden until it slides into the light after "then". */
export const murkAt = (t: number): number => {
  const u = wrap(t);
  return u < RESET ? 0 : 1 - ramp(u, WRECKFISH_AT - 0.1, UP_AT + 0.05);
};

/** The jaws: 0 shut .. 1 wide. Frame 1 has them wide round the shark. */
export const JAW_WIDE = 0.85;
export const SHUT_T = SHARK_AT + 0.13;
const JAW_HOOK = track([[0, JAW_WIDE], [1.35, 0.9], [SHUT_T - 0.08, 0.98], [SHUT_T, 0.13], [2.4, 0.11], [RESET, 0.1]], [0, RESET]);
const JAW_MAIN = track([
  [RESET, 0], [BUMPS[0] - 0.25, 0], [BUMPS[0] - 0.06, 0.6], [BUMPS[0] + 0.05, 0.35], [BUMPS[0] + 0.2, 0.15], [BUMPS[1] - 0.08, 0.6], [BUMPS[1] + 0.05, 0.35],
  [BUMPS[1] + 0.35, 0.04], [SO_AT, 0], [ONE_AT - 0.05, 0], [ONE_AT + 0.2, 1.02], [GULP_AT - 0.05, 1.05], [GULP_AT + 0.06, 0.3], [AND_AT, 0.3], [LOOP_S, JAW_WIDE],
], [RESET, LOOP_S]);
const jawTrack = looped(JAW_HOOK, JAW_MAIN);
export const jawAt = (t: number): number => Math.max(0, jawTrack(t)[0]!);

/** The jaw on the gulp holds the shark: a little chewing wobble while it does. */
function chewAt(u: number): number {
  return 0.03 * Math.sin(cycles(22, u)) * window01(u, GULP_AT + 0.1, AND_AT + 0.4, 0.2);
}

export function wreckAt(t: number): Fish {
  const [x, y, tilt] = wreckTrack(t);
  return { x: x!, y: y!, length: WRECK_LEN, facing: 1, tilt: tilt!, beat: cycles(9, t), effort: 0.35 };
}

/** The jaw as drawn, with the chewing. */
export const jawDrawnAt = (t: number): number => Math.max(0, jawAt(t) + chewAt(wrap(t)));

/** The middle of its open mouth, world px. */
export const mouthAt = (t: number): Pt => mouthOf(worldPose(wreckAt(t), 'grouper'), jawDrawnAt(t));

/** Its squash on each bump, 0 .. 1. */
export function bumpAt(t: number): number {
  const u = wrap(t);
  return Math.max(...BUMPS.map((b) => (u >= b - 0.02 && u < b + 0.3 ? Math.exp(-(u - b) * 9) * Math.max(0, Math.sin(((u - b + 0.02) / 0.32) * Math.PI)) : 0)));
}

/** The eye: where it looks (-1 back .. 1 ahead, -1 up .. 1 down) and how far the lid is down (0 open .. 1 shut). */
export interface Gaze {
  readonly x: number;
  readonly y: number;
  readonly lid: number;
}
const GAZE = track([
  [0, 0.75, 0.25, 0.1], [RESET, 0.75, 0.25, 0.1],
  [7.7, 0.5, 0.2, 0.1], [UP_AT, 0.7, 0.4, 0.05], [BUMPS[0] - 0.2, 0.8, 0.6, 0.05], [BUMPS[0] + 0.1, 0.2, -0.1, 0.55], [BUMPS[1] + 0.25, 0.3, 0.1, 0.5],
  [SO_AT - 0.05, 0.2, 0.0, 0.4], [SO_AT + 0.35, 0.85, -0.35, 0.45], [COULD_AT + 0.3, 0.9, -0.3, 0.5], [ONE_AT, 0.9, -0.1, 0.1], [GULP_AT + 0.1, 0.8, 0.1, 0.75],
  [WIGGLING_AT, 0.75, 0.2, 0.6], [AND_AT + 0.4, 0.75, 0.25, 0.1], [LOOP_S, 0.75, 0.25, 0.1],
], [0, RESET, LOOP_S]);
export function gazeAt(t: number): Gaze {
  const u = wrap(t);
  const [x, y, lid] = GAZE(u < RESET ? 0 : u);
  return { x: x!, y: y!, lid: lid! };
}

// ---------------------------------------------------------------- the swordfish

/** It rocks on the rock when the wreckfish bumps it, rad and world px. */
export function swordAt(t: number): { readonly x: number; readonly y: number; readonly length: number; readonly tilt: number } {
  const u = wrap(t);
  let rock = 0;
  let lift = 0;
  for (const b of BUMPS) {
    const s = u - b;
    if (s > 0 && s < 1.2) {
      rock += 0.06 * Math.exp(-s * 4) * Math.sin(s * 22);
      lift += 14 * Math.exp(-s * 5) * Math.abs(Math.sin(s * 22));
    }
  }
  return { x: SWORD.x, y: SWORD.y - lift, length: SWORD.length, tilt: SWORD.tilt + rock };
}

// ---------------------------------------------------------------- the sharks

/** Shark 0 is the one that gets eaten; the other ten nose at the swordfish. */
interface Nosing {
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly size: number;
  /** 0 in the light .. 1 far back in the dark. */
  readonly far: number;
}

/** Where each one's nose is on the swordfish, which way it faces and its tilt; its centre is half a length back. */
const NOSES: readonly (readonly [number, number, 1 | -1, number, number, number])[] = [
  // nose x, nose y, facing, tilt, size, far
  [0, -165, 1, -0.6, 1, 0],
  [175, -212, 1, -0.95, 0.95, 0.05],
  [335, -218, -1, -0.8, 1, 0],
  [510, -190, -1, -0.45, 1.05, 0],
  [-85, -60, 1, 0.08, 1, 0.05],
  [300, -70, -1, 0.12, 1.08, 0],
  [150, -75, 1, -0.08, 1.08, 0],
  [480, -235, -1, -0.5, 0.75, 0.45],
  [70, -240, 1, -0.35, 0.75, 0.45],
  [255, -400, 1, -0.15, 0.7, 0.55],
];

export const NOSERS: readonly Nosing[] = NOSES.map(([x, y, facing, tilt, size, far]) => {
  const half = (SHARK_LEN * size) / 2;
  return { x: x - facing * Math.cos(tilt) * half, y: y + Math.sin(tilt) * half, facing, tilt, size, far };
});

/** Shark 0's start, nosing the swordfish's head from above. */
const SHARK0_START = { x: 560, y: -300, tilt: -0.5 } as const;

/** When each shark pops into the light on "eleven": shark 0 first, then the rest. */
export const POP_AT: readonly number[] = Array.from({ length: 11 }, (_, i) => ELEVEN_AT - 0.02 + i * 0.085);

/** How far each shark has popped in (with an overshoot): 1 from the end of the pops round the loop to the reset. */
export function popAt(i: number, t: number): number {
  const u = wrap(t);
  if (u < RESET) return 1;
  const s = u - POP_AT[i]!;
  if (s <= 0) return 0;
  return Math.min(1, s / 0.06) * (1 + 0.28 * Math.exp(-s * 9) * Math.sin(s * 26));
}

/** How far the sharks have scattered from the wreckfish: 0 nosing .. 1 backed off. */
export function scatterAt(t: number): number {
  const u = wrap(t);
  return u < RESET ? 1 : ramp(u, WRECKFISH_AT + 0.25, UP_AT + 0.25);
}

/** Where the wreckfish comes in from: the sharks back off away from it. */
const FROM = { x: -700, y: -380 } as const;

export function noserAt(i: number, t: number): Fish {
  const n = NOSERS[i]!;
  const d = { x: n.facing * Math.cos(n.tilt), y: -Math.sin(n.tilt) };
  const bob = 22 * Math.sin(cycles(14 + i, t) + i * 1.9);
  const away = { x: n.x - FROM.x, y: n.y - FROM.y };
  const len = Math.hypot(away.x, away.y);
  const s = scatterAt(t);
  const push = 170 * s;
  return {
    x: n.x + d.x * bob + (away.x / len) * push,
    y: n.y + d.y * bob + (away.y / len) * push * 0.6 + 40 * s,
    length: SHARK_LEN * n.size,
    facing: n.facing,
    tilt: n.tilt + 0.05 * Math.sin(cycles(7 + i, t) + i) + 0.25 * s * (n.tilt < 0 ? 1 : -1),
    beat: cycles(24 + 2 * i, t),
    effort: 0.55,
  };
}

/** How far into the wreckfish shark 0 is, in its own lengths: 0 its nose at the lips. */
/** The depth's rate at the seam, both sides the same: the slow slide in of frame 1. */
const SEAM_DEPTH_RATE = 0.055;
function depthAt(u: number): number {
  if (u < RESET) {
    const k: Key[] = [{ t: 0, at: 0.45, rate: SEAM_DEPTH_RATE }, { t: 1.45, at: 0.53 }, { t: SHUT_T, at: 0.86, rate: 0.6 }, { t: 2.3, at: 0.9, rate: 0 }, { t: RESET, at: 0.9, rate: 0 }];
    return curveAt(k, u).at;
  }
  const k: Key[] = [{ t: RESET, at: -0.3, rate: 0 }, { t: ONE_AT, at: -0.3, rate: 0 }, { t: GULP_AT + 0.03, at: 0.4, rate: 0.4 }, { t: AND_AT, at: 0.42 }, { t: LOOP_S, at: 0.45, rate: SEAM_DEPTH_RATE }];
  return curveAt(k, u).at;
}

/** The shark held in the wreckfish's mouth, `depth` lengths in, nose first. */
function heldShark(t: number, depth: number): Fish {
  const w = wreckAt(t);
  const m = mouthAt(t);
  const d = { x: Math.cos(w.tilt), y: -Math.sin(w.tilt) };
  // The shark's centre: half a length back from its nose, which is `depth` lengths inside the lips.
  const back = SHARK0_LEN * (0.5 - depth);
  return { x: m.x + d.x * back, y: m.y + d.y * back, length: SHARK0_LEN, facing: -1, tilt: -w.tilt, beat: 0, effort: 0 };
}

/** Shark 0 before the gulp: nosing, backing off, then hanging in front of the wreckfish, where the gulp takes it. */
const FREE_END = heldShark(COULD_AT + 0.45, -0.3);
const SHARK0_FREE = track([
  [RESET, SHARK0_START.x, SHARK0_START.y, SHARK0_START.tilt],
  [WRECKFISH_AT + 0.25, SHARK0_START.x, SHARK0_START.y, SHARK0_START.tilt],
  [UP_AT + 0.3, 560, -560, 0.1],
  [BUMPS[1] + 0.3, 440, -800, 0.05],
  [GUY_AT, FREE_END.x, FREE_END.y, FREE_END.tilt],
  [LOOP_S, FREE_END.x, FREE_END.y, FREE_END.tilt],
], [RESET, GUY_AT]);

/** It freezes stiff on "guy", until the gulp: 0 .. 1. */
export const frozenAt = (t: number): number => window01(wrap(t), GUY_AT - 0.15, ONE_AT + 0.2, 0.2);

/** How hard its tail lashes: nosing, frozen, then flailing in the mouth. */
function sharkEffortAt(u: number): number {
  if (u < RESET) return 1.5;
  const flail = ramp(u, ONE_AT, GULP_AT);
  return lerp(0.55 * (1 - frozenAt(u)), 1.5, flail);
}

/** How far it has been taken by the wreckfish: 1 in its mouth (the hook, and from the gulp). */
export function heldAt(t: number): number {
  const u = wrap(t);
  return u < RESET ? 1 : ramp(u, ONE_AT, ONE_AT + 0.2);
}

export function shark0At(t: number): Fish {
  const u = wrap(t);
  const held = heldAt(u);
  const bob = u < RESET ? 0 : 22 * Math.sin(cycles(14, u)) * (1 - ramp(u, UP_AT, UP_AT + 0.5));
  const [fx, fy, ftilt] = SHARK0_FREE(u < RESET ? LOOP_S : u);
  const free = { x: fx! - Math.cos(ftilt!) * bob, y: fy! + Math.sin(ftilt!) * bob, tilt: ftilt! };
  const h = heldShark(u, depthAt(u));
  // A shiver while frozen.
  const shiver = 4 * frozenAt(u) * Math.sin(cycles(160, u));
  return {
    x: lerp(free.x, h.x, held) + shiver,
    y: lerp(free.y, h.y, held),
    length: SHARK0_LEN,
    facing: -1,
    tilt: lerp(free.tilt, h.tilt, held),
    beat: cycles(52, u),
    effort: sharkEffortAt(u),
  };
}

/** Shark 0's depth into the mouth (for drawing it clipped to the gape): below 0 it's still outside. */
export const sharkDepthAt = (t: number): number => {
  const u = wrap(t);
  return u < RESET || u >= ONE_AT ? depthAt(u) : -1;
};

// ---------------------------------------------------------------- camera

const VIEW_HOOK_ZOOM = 2.15;
/** Where frame 1 puts the open mouth on screen. */
export const HOOK_MOUTH_SCREEN: Pt = { x: 470, y: 820 };
const HOOK_MOUTH = mouthOf(worldPose({ ...HOOK_POSE, length: WRECK_LEN, facing: 1, beat: 0, effort: 0 }, 'grouper'), JAW_WIDE);
export const VIEW_HOOK: View = {
  x: HOOK_MOUTH.x - (HOOK_MOUTH_SCREEN.x - FOCUS.x) / VIEW_HOOK_ZOOM,
  y: HOOK_MOUTH.y - (HOOK_MOUTH_SCREEN.y - FOCUS.y) / VIEW_HOOK_ZOOM,
  zoom: VIEW_HOOK_ZOOM,
};

const CAM_HOOK = track([
  [0, VIEW_HOOK.x, VIEW_HOOK.y, VIEW_HOOK.zoom],
  [SHUT_T - 0.05, VIEW_HOOK.x + 4, VIEW_HOOK.y, VIEW_HOOK.zoom + 0.02],
  [SHUT_T + 0.15, VIEW_HOOK.x + 12, VIEW_HOOK.y - 4, VIEW_HOOK.zoom + 0.1],
  [DROP.from, VIEW_HOOK.x + 14, VIEW_HOOK.y - 4, VIEW_HOOK.zoom + 0.08],
  [DROP.to, VIEW_HOOK.x + 14, VIEW_HOOK.y + 280, VIEW_HOOK.zoom + 0.08],
  [RESET, VIEW_HOOK.x + 14, VIEW_HOOK.y + 400, VIEW_HOOK.zoom + 0.08],
], [0]);

const CAM_MAIN = track([
  [RESET, 300, -150, 0.95],
  [LAND.from, 300, -150, 0.95],
  [THEN_AT - 0.1, 280, -175, 1.08],
  [WRECKFISH_AT, 110, -220, 0.9],
  [UP_AT + 0.1, 60, -270, 0.84],
  [IT_AT + 0.25, 120, -300, 1.05],
  [BUMPS[0], 190, -300, 1.22],
  [BUMPS[1] + 0.3, 170, -320, 1.18],
  [SO_AT + 0.3, 60, -640, 1.3],
  [COULD_AT + 0.2, 150, -940, 1.75],
  [ONE_AT + 0.1, 140, -950, 1.78],
  [GULP_AT + 0.1, 110, -985, 2.15],
  [AND_AT, 115, -990, 2.2],
  [LOOP_S, VIEW_HOOK.x, VIEW_HOOK.y, VIEW_HOOK.zoom],
], [RESET, LOOP_S]);
const camTrack = looped(CAM_HOOK, CAM_MAIN);

export function cameraAt(t: number): View {
  const [x, y, zoom] = camTrack(t);
  return { x: x!, y: y!, zoom: zoom! };
}

/** Jolts of the picture, px: the jaws shutting, the wreckfish showing up, the bumps, the gulp. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  const hits: readonly (readonly [number, number])[] = [[SHUT_T, 24], [UP_AT, 10], [BUMPS[0], 7], [BUMPS[1], 6], [GULP_AT + 0.04, 28]];
  let x = 0;
  let y = 0;
  for (const [at, amp] of hits) {
    const s = u - at;
    if (s < 0 || s > 0.45) continue;
    const a = amp * (1 - s / 0.45) ** 2;
    x += a * Math.sin(s * 115);
    y += a * 0.7 * Math.cos(s * 140);
  }
  return { x, y };
}

// ---------------------------------------------------------------- the descent

/** The depth readout's feet, counting up from "Almost" to "down,", and back to 0 once it's gone. */
export const DEPTH_FT = 1500;
export const DEPTH_M = 450;
export const depthAt01 = (t: number): number => {
  const u = wrap(t);
  return ramp(u, ALMOST_AT, DOWN_AT + 0.15) * (1 - ramp(u, LAND.to + 0.2, LAND.to + 0.4));
};
/** The readout, 0 .. 1: from "Almost" until the floodlight. */
export const readoutAt = (t: number): number => window01(wrap(t), ALMOST_AT - 0.12, LAND.to, 0.18);

/** How far down the descent has gone, 0 .. 1 (light fading, snow streaming). */
export const fallAt = (t: number): number => ramp(wrap(t), DROP.from, LAND.to);

// ---------------------------------------------------------------- moods

/** The colour grade for each mood, [r, g, b, strength]: soft light over the frame, and the dark at the edges. */
export interface Grade {
  readonly rgb: readonly [number, number, number];
  readonly strength: number;
  readonly vignette: number;
}

const THRILL = [70, 140, 160, 0.26, 0.62];
const EERIE = [30, 50, 140, 0.4, 0.7];
const UNEASE = [120, 175, 60, 0.36, 0.62];
const FLASH = [235, 40, 30, 0.62, 0.55];
const SHOCK = [170, 45, 40, 0.34, 0.66];
const COMIC = [245, 185, 80, 0.36, 0.45];
const SMUG = [165, 80, 205, 0.36, 0.6];
const DRAMA = [200, 25, 35, 0.42, 0.82];
const GRADES: readonly (readonly [number, readonly number[]])[] = [
  [0, THRILL], [DROP.from, THRILL], [DROP.to, EERIE], [LAND.from, EERIE], [LAND.to + 0.1, UNEASE], [THEN_AT, UNEASE], [WRECKFISH_AT + 0.05, FLASH], [WRECKFISH_AT + 0.45, SHOCK],
  [IT_AT, SHOCK], [IT_AT + 0.3, COMIC], [SO_AT - 0.1, COMIC], [SO_AT + 0.25, SMUG], [ONE_AT - 0.05, SMUG], [ONE_AT + 0.2, DRAMA], [WIGGLING_AT + 0.3, DRAMA], [AND_AT + 0.5, THRILL],
  [LOOP_S, THRILL],
];

export function gradeAt(t: number): Grade {
  const u = wrap(t);
  let i = 0;
  while (i < GRADES.length - 2 && u >= GRADES[i + 1]![0]) i++;
  const [t0, a] = GRADES[i]!;
  const [t1, b] = GRADES[i + 1]!;
  const k = ramp(u, t0, t1);
  const mix = (j: number): number => a[j]! + (b[j]! - a[j]!) * k;
  return { rgb: [mix(0), mix(1), mix(2)], strength: mix(3), vignette: mix(4) };
}

// ---------------------------------------------------------------- marks

/** The "!"s over the sharks as the wreckfish shows up, 0 .. 1. */
export const alarmAt = (t: number): number => window01(wrap(t), SHOWED_AT - 0.15, IT_AT + 0.1, 0.18);
/** Which sharks get a "!". */
export const ALARMED = [0, 2, 5, 9] as const;

/** Water rushing into the open mouth: a slow pull in frame 1, the lunge on "One". */
export function suctionAt(t: number): number {
  const u = wrap(t);
  if (u < RESET) return 0.45 * (1 - ramp(u, SHUT_T - 0.02, SHUT_T + 0.08)) + 0.6 * window01(u, SHUT_T - 0.4, SHUT_T + 0.04, 0.12);
  return window01(u, ONE_AT - 0.05, GULP_AT + 0.08, 0.12) + 0.45 * ramp(u, AND_AT + 0.3, LOOP_S);
}

/** The snap bursting from the shut jaws: 0 → 1 after each shut (else outside). */
export function chompsAt(t: number): readonly number[] {
  const u = wrap(t);
  return [SHUT_T, GULP_AT + 0.04].map((at) => (u - at) / 0.4).filter((s) => s >= 0 && s <= 1);
}

/** The boing lines round each bump, 0 → 1 (else outside). */
export function boingsAt(t: number): readonly number[] {
  const u = wrap(t);
  return BUMPS.map((at) => (u - at) / 0.5).filter((s) => s >= 0 && s <= 1);
}
