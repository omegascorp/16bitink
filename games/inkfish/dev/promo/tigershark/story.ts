import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import {
  BELOW_AT, BIRD_AT, cycles, DROP_AT, FISH_AT, FLOATS_AT, HITS_AT, LOOP_S, RIGHT_AT, SEA_AT, SKY_AT, SO_AT, SOME_AT, TIGER_AT, WHATEVER_AT, wrap, YES_AT,
  YOUNG_AT,
} from './beats';
import { mouthMid, pointOn, type TigerPose } from './tiger';

/**
 * "These sharks eat birds that fall out of the SKY!": young tiger sharks off
 * Mississippi and Alabama eat songbirds that fall into the Gulf (Drymon et
 * al. 2019, Ecology: 41 of 105 had songbird remains inside, most of them in
 * the autumn migration, birds probably forced down by storms). Told by a
 * narrator (words.ts), every beat timed to the words (beats.ts), a new mood
 * each sentence, everything a function of time in seconds over LOOP_S.
 *
 * One world, side-on, the sea's surface at y 0 (up is negative), seen by a
 * camera that moves through it:
 *
 *   0     SHOCK "These sharks eat birds that fall out of the SKY!": frame 1,
 *         half above and half below the surface in a storm: a tiger shark
 *         bursting up out of the sea, jaws wide, at a songbird tumbling down
 *         into them, spray flying, lightning behind; slow motion until the
 *         jaws snap shut on "SKY!" (the bird's gone, a feather drifts down),
 *         and it crashes back
 *   3.1   TENDER "Every autumn, millions of songbirds fly across the Gulf…":
 *         up into a sunset sky, a long flock of little songbirds streaming
 *         over the sea
 *   6.9   TENSE "and when a storm hits, some drop into the sea.": the sky
 *         blackens, rain, lightning on "hits"; one tired bird drops out of
 *         the flock, flutters down and lands on the waves on "sea."
 *   10.0  DREAD "Right below: young tiger sharks.": we dip under the surface:
 *         below the floating bird, striped tiger sharks circle out of the dark
 *   12.6  NUMBER "Scientists found birds inside FORTY-ONE of a hundred and
 *         five!": 105 little sharks, 41 lighting up with a bird inside (script.ts)
 *   16.2  CHEEKY "Bird, fish… whatever floats.": a smug tiger shark, a feather
 *         floating over its nose where the bird was, a little fish passing
 *   18.7  "So yes,": it looks up, the storm comes back, and it lunges at a
 *         bird falling from the sky, into frame 1.
 */
export { LOOP_S };

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The sharks' body length, world px. */
export const SHARK_LEN = 900;
/** The screen point the camera centres on. */
export const FOCUS = { x: 540, y: 800 } as const;

/** Video time unwrapped round the seam, for the moments that run across it (the lunge, the snap). */
const across = (t: number): number => {
  const u = wrap(t);
  return u < 10 ? u + LOOP_S : u;
};

// ---------------------------------------------------------------- the breach clock

/** The lunge's own clock (story seconds): it starts on "So", plays the hook in slow motion, and runs on at full speed after the snap. */
const BREACH_KEYS: readonly Key[] = [
  { t: 18.6, at: 0, rate: 0.8 },
  { t: 19.3, at: 0.62, rate: 0.5 },
  { t: LOOP_S, at: 0.7, rate: 0.09 },
  { t: LOOP_S + 1.8, at: 0.83, rate: 0.1 },
  { t: LOOP_S + 2.2, at: 0.98, rate: 0.7 },
  { t: LOOP_S + 3.5, at: 2.2, rate: 1 },
];
const BREACH_END = LOOP_S + 4.2;

/** Story time of the lunge at video time t, or null while it isn't playing. */
export function breachAt(t: number): number | null {
  const u = across(t);
  if (u < BREACH_KEYS[0]!.t || u > BREACH_END) return null;
  const last = BREACH_KEYS[BREACH_KEYS.length - 1]!;
  if (u > last.t) return last.at + (u - last.t);
  return curveAt(BREACH_KEYS, u).at;
}

/** The jaws snap shut on the bird, just after "SKY!" (video time). */
export const SNAP_AT = SKY_AT + 0.07;
const SNAP_S = 0.07;
/** The bird vanishes half way through the snap, in a burst of water and a feather. */
export const VANISH_AT = SNAP_AT - SNAP_S / 2;
/** Where the lunge breaks the surface and crashes back (lunge clock). */
export const BREAKOUT = 0.42;
export const CRASH = 1.5;

/** The hero shark's path through the lunge, keyed on the lunge clock: up from just under the surface, out, over, and back. */
const LX: readonly Key[] = [
  { t: 0, at: -130, rate: 0 },
  { t: 0.35, at: -100 },
  { t: 0.7, at: -40 },
  { t: 1.08, at: -20 },
  { t: 1.55, at: -40 },
  { t: 3.2, at: -60, rate: 0 },
];
const LY: readonly Key[] = [
  { t: 0, at: 240, rate: 0 },
  { t: 0.3, at: 200, rate: -400 },
  { t: 0.7, at: 10, rate: -520 },
  { t: 1.08, at: -110, rate: 0 },
  { t: 1.55, at: 120, rate: 900 },
  { t: 2.3, at: 620, rate: 350 },
  { t: 3.2, at: 900, rate: 0 },
];
const LTILT: readonly Key[] = [
  { t: 0, at: 0.05, rate: 0 },
  { t: 0.35, at: 0.95 },
  { t: 0.62, at: 1.27, rate: 0.35 },
  { t: 1.08, at: 1.42 },
  { t: 1.55, at: 1.78 },
  { t: 2.3, at: 1.3 },
  { t: 3.2, at: 0.6, rate: 0 },
];

/** Tail beats a loop: whole, so the beat flows round the seam. */
const BEATS = 26;

function breachPose(b: number, t: number): TigerPose {
  const u = across(t);
  const opening = ramp(b, 0.22, 0.6);
  const shut = u < LOOP_S + SNAP_AT - SNAP_S ? 1 : 1 - ramp(u, LOOP_S + SNAP_AT - SNAP_S, LOOP_S + SNAP_AT);
  return {
    x: curveAt(LX, b).at,
    y: curveAt(LY, b).at,
    length: SHARK_LEN,
    turn: 1,
    tilt: curveAt(LTILT, b).at,
    beat: cycles(BEATS, t),
    effort: 1 - 0.6 * ramp(b, 1.6, 2.6),
    jaw: Math.max(0.03, opening * shut) + 0.03 * Math.sin(b * 40) * opening * shut,
    lid: 0,
  };
}

// ---------------------------------------------------------------- the sharks circling below

/** Where the young tiger sharks circle under the floating bird: round a centre, seen side-on. */
export const CIRCLE = { x: 0, y: 610, rx: 480 } as const;
const OMEGA = 1.05;
const CIRCLERS = [
  { phase: -0.62 - OMEGA * 15.3, size: 0.82, dy: 0 },
  { phase: 2.4 - OMEGA * 15.3, size: 0.7, dy: 150 },
  { phase: 3.6 - OMEGA * 15.3, size: 0.66, dy: -110 },
] as const;
export const CIRCLERS_N = CIRCLERS.length;

/** Circler i at time t: its pose, how close it swims (z, -1 far .. 1 near) and how deep in the murk (1 hidden .. 0 clear). */
export function circlerAt(i: number, t: number): { readonly pose: TigerPose; readonly z: number; readonly murk: number } {
  const c = CIRCLERS[i]!;
  const phi = c.phase + OMEGA * t;
  const z = Math.cos(phi);
  const scale = c.size * (1 + 0.16 * z);
  const out = i === 0 ? 0 : ramp(t, 15.2, 15.9);
  const murk = 1 - 0.3 * ramp(t, RIGHT_AT, BELOW_AT + 0.3) - 0.7 * ramp(t, YOUNG_AT - 0.1, TIGER_AT + 0.25) + 0.12 * ((1 - z) / 2) + out;
  return {
    pose: {
      x: CIRCLE.x + CIRCLE.rx * Math.sin(phi),
      y: CIRCLE.y + c.dy + 70 * z,
      length: SHARK_LEN * scale,
      turn: z,
      tilt: -0.08 * Math.sin(phi) + 0.05 * Math.sin(t * 2.3 + i),
      beat: cycles(BEATS + 4 * i, t),
      effort: 0.45,
      jaw: 0.04,
      lid: 0,
    },
    z,
    murk: Math.max(0, Math.min(1, murk)),
  };
}

// ---------------------------------------------------------------- the smug one

/** Where the hero rests for "Bird, fish… whatever floats.", nose under the floating feather. */
const SMUG = { x: -130, y: 240, tilt: 0.05 } as const;
export const SMUG_FROM = 15.3;
export const SMUG_AT = 16.2;

function smugPose(t: number): TigerPose {
  // A little shrug on "whatever", settling back by "So".
  const shrug = window01(t, WHATEVER_AT - 0.05, FLOATS_AT + 0.35, 0.18);
  const settle = 1 - ramp(t, 18.2, 18.6);
  return {
    x: SMUG.x + 14 * Math.sin(cycles(2, t)) * settle,
    y: SMUG.y + 6 * Math.sin(cycles(3, t)) * settle - 10 * shrug,
    length: SHARK_LEN,
    turn: 1,
    tilt: SMUG.tilt + 0.07 * shrug * Math.sin((t - WHATEVER_AT) * 9),
    beat: cycles(BEATS, t),
    effort: 0.2,
    jaw: 0.06 + 0.06 * shrug,
    lid: lidAt(t),
  };
}

/** The smug lid: down as the grid fades on "Bird,", up again for the lunge on "So". */
export const lidAt = (t: number): number => 0.85 * window01(wrap(t), BIRD_AT - 0.3, SO_AT + 0.05, 0.25);

/** The hero shark: in the lunge, circling, sliding round to rest, smug; null where it's out of the picture (deep, after the lunge). */
export function heroAt(t: number): { readonly pose: TigerPose; readonly murk: number } | null {
  const u = wrap(t);
  const b = breachAt(u);
  if (b !== null) return { pose: breachPose(b, u), murk: ramp(b, 1.6, 2.3) };
  if (u < 10.1) return null;
  const circling = circlerAt(0, u);
  if (u < SMUG_FROM) return circling;
  const smug = smugPose(u);
  const w = ramp(u, SMUG_FROM, SMUG_AT);
  if (w >= 1) return { pose: smug, murk: 0 };
  const c = circlerAt(0, u).pose;
  return {
    pose: { ...smug, x: lerp(c.x, smug.x, w), y: lerp(c.y, smug.y, w), length: lerp(c.length, smug.length, w), turn: lerp(c.turn, smug.turn, w), tilt: lerp(c.tilt, smug.tilt, w) },
    murk: (1 - w) * circling.murk,
  };
}

/** The middle of the hero's open mouth, world px. */
export function heroMouth(pose: TigerPose): Pt {
  return pointOn(pose, mouthMid(Math.max(0.2, pose.jaw)));
}

// ---------------------------------------------------------------- the bird in the hook

/** The songbird the shark takes: tumbling down into the open jaws (lunge clock), gone in the snap. */
const SNAP_B = (() => {
  const u = LOOP_S + SNAP_AT;
  return curveAt(BREACH_KEYS, u).at;
})();
const IN_MOUTH = heroMouth({ ...breachPose(SNAP_B, SNAP_AT), jaw: 1 });
/** The mouth in frame 1: the bird hangs just above and in front of it. */
const FRAME1_B = 0.7;
const MOUTH_1 = heroMouth({ ...breachPose(FRAME1_B, 0), jaw: 1 });
const HOOK_BIRD_X: readonly Key[] = [
  { t: 0, at: MOUTH_1.x + 260 },
  { t: 0.62, at: MOUTH_1.x + 90 },
  { t: FRAME1_B, at: MOUTH_1.x + 55, rate: -100 },
  { t: SNAP_B, at: IN_MOUTH.x + 20 },
];
const HOOK_BIRD_Y: readonly Key[] = [
  { t: 0, at: MOUTH_1.y - 1400, rate: 1300 },
  { t: 0.62, at: MOUTH_1.y - 145, rate: 450 },
  { t: FRAME1_B, at: MOUTH_1.y - 112, rate: 240 },
  { t: SNAP_B, at: IN_MOUTH.y - 40, rate: 300 },
];
/** Its size, world px across its drawing. */
export const HOOK_BIRD_SIZE = 220;

export interface Bird {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly facing: 1 | -1;
  readonly size: number;
  /** 0..3: up, mid, down, mid; or the floating pose. */
  readonly pose: 'up' | 'mid' | 'down' | 'float';
  readonly alpha: number;
}

const FLAP: readonly ('up' | 'mid' | 'down')[] = ['up', 'mid', 'down', 'mid'];
const flapPose = (phase: number): 'up' | 'mid' | 'down' => FLAP[((Math.floor(phase * 4) % 4) + 4) % 4]!;

export function hookBirdAt(t: number): Bird | null {
  const b = breachAt(t);
  const u = across(t);
  // Gone as the jaws close on it, half way through the snap.
  if (b === null || u >= LOOP_S + VANISH_AT) return null;
  return {
    x: curveAt(HOOK_BIRD_X, b).at + 12 * Math.sin(b * 11),
    y: curveAt(HOOK_BIRD_Y, b).at,
    tilt: -0.55 + 0.12 * Math.sin(b * 9),
    facing: -1,
    size: HOOK_BIRD_SIZE,
    // Flailing: wings mostly up as it drops.
    pose: (b * 9) % 1 < 0.72 ? 'up' : 'mid',
    alpha: 1,
  };
}

/** The feather left drifting down after the snap (video time). */
export function hookFeatherAt(t: number): { readonly x: number; readonly y: number; readonly tilt: number } | null {
  const since = across(t) - (LOOP_S + VANISH_AT);
  if (since < 0 || since > 2.2) return null;
  return { x: IN_MOUTH.x + 50 + 26 * since + 40 * Math.sin(since * 3.2), y: IN_MOUTH.y - 50 + 60 * since + 30 * since * since, tilt: 0.5 * Math.sin(since * 3.2 + 0.4) };
}

/** The snap's burst at the mouth, 0 → 1 over its life (out of range otherwise), and where. */
export function snapBurst(t: number): { readonly u: number; readonly at: Pt } {
  return { u: (across(t) - (LOOP_S + VANISH_AT)) / 0.35, at: IN_MOUTH };
}

// ---------------------------------------------------------------- the flock

const FLOCK_N = 40;
const FAR_N = 46;
const FLOCK_SPEED = 260;
/** When the flock is over the sea: from the hook's end until the storm scatters it. */
export const FLOCK_SPAN = { from: 2.7, to: 9.6 } as const;
/** The bird that drops, and when it leaves the flock. */
export const FALLER = 17;
export const FALL_FROM = SOME_AT - 0.15;
export const LANDED_AT = SEA_AT;

const FLOCK = Array.from({ length: FLOCK_N }, (_, i) => ({
  x0: -1500 + i * 100 + 30 * Math.sin(i * 2.7),
  y0: -1250 + 150 * Math.sin(i * 0.61) + 70 * Math.sin(i * 1.9),
  flap: (i * 0.37) % 1,
  rate: 7 + (i % 5) * 0.6,
  size: 150 + 22 * Math.sin(i * 1.3),
}));

/** How hard the storm buffets the flock, 0 .. 1. */
export const buffetAt = (t: number): number => ramp(wrap(t), 7.2, HITS_AT + 0.2);

function flockBird(i: number, t: number): Bird {
  const f = FLOCK[i]!;
  const gust = buffetAt(t);
  return {
    x: f.x0 + FLOCK_SPEED * (t - 8.2) + gust * 50 * Math.sin(t * 3.1 + i),
    y: f.y0 + gust * 70 * Math.sin(t * 4.3 + i * 1.7) + 10 * Math.sin(t * 2 + i),
    tilt: 0.08 * Math.sin(t * 1.7 + i) + gust * 0.35 * Math.sin(t * 5 + i),
    facing: 1,
    size: f.size,
    pose: flapPose(t * f.rate * (1 + gust * 0.5) + f.flap),
    alpha: 1,
  };
}

/** Where the one that drops lands: on the sea, right over the sharks. */
export const LANDING: Pt = { x: 0, y: 0 };
const FALL_START = flockBird(FALLER, FALL_FROM);

/** The tired bird: dropping out of the flock on "some drop", fluttering down, landing on "sea.", then floating, bobbing. Hidden behind the chart by the time it's gone. */
function fallerAt(t: number): Bird | null {
  if (t < FALL_FROM) return null;
  if (t < LANDED_AT) {
    const u = (t - FALL_FROM) / (LANDED_AT - FALL_FROM);
    const fall = u * u * (1.6 - 0.6 * u);
    return {
      x: lerp(FALL_START.x, LANDING.x, smooth(u)) + 70 * Math.sin(u * 9) * (1 - u),
      y: lerp(FALL_START.y, LANDING.y - 30, fall),
      tilt: -0.4 + 0.5 * Math.sin(u * 13),
      facing: 1,
      size: lerp(FALL_START.size, 200, u),
      pose: flapPose(t * 6),
      alpha: 1,
    };
  }
  const fade = 1 - ramp(t, 14.8, 15.6);
  if (fade <= 0) return null;
  return { x: LANDING.x, y: LANDING.y + floatBob(LANDING.x, t), tilt: 0.04 * Math.sin(t * 2.4), facing: 1, size: 200, pose: 'float', alpha: fade };
}

/** The flock and the falling bird at time t. */
export function birdsAt(t: number): readonly Bird[] {
  const u = wrap(t);
  const out: Bird[] = [];
  if (u >= FLOCK_SPAN.from && u <= FLOCK_SPAN.to) {
    // Far off, higher up: more and more of them, as far as you can see.
    const gust = buffetAt(u);
    for (let i = 0; i < FAR_N; i++) {
      out.push({
        x: -2300 + i * 95 + 40 * Math.sin(i * 3.3) + 200 * (u - 8.2),
        y: -1650 + 120 * Math.sin(i * 0.9) + 50 * Math.sin(i * 2.3) + gust * 40 * Math.sin(u * 4 + i),
        tilt: 0.06 * Math.sin(u * 1.5 + i),
        facing: 1,
        size: 62 + 10 * Math.sin(i * 1.7),
        pose: flapPose(u * (8 + (i % 3)) + i * 0.29),
        alpha: 0.7,
      });
    }
    for (let i = 0; i < FLOCK_N; i++) {
      if (i === FALLER && u >= FALL_FROM) continue;
      const b = flockBird(i, u);
      // Two more drop out of sight on "drop".
      if ((i === FALLER - 4 || i === FALLER + 5) && u > DROP_AT - 0.1) {
        const s = u - DROP_AT + 0.1;
        out.push({ ...b, y: b.y + 900 * s * s, tilt: b.tilt - 0.9 * s, pose: flapPose(u * 9) });
        continue;
      }
      out.push(b);
    }
  }
  const faller = fallerAt(u);
  if (faller) out.push(faller);
  return out;
}

/** The sea's swell under something floating at world x. */
export const floatBob = (x: number, t: number): number => 6 * Math.sin(x * 0.011 + cycles(3, t)) + 3 * Math.sin(x * 0.029 - cycles(6, t));

/** The feather floating on the surface over the smug shark's nose (from behind the chart until the lunge takes the eye). */
export const FLOAT_FEATHER_X = 330;
export function floatingFeatherAt(t: number): { readonly x: number; readonly y: number; readonly tilt: number; readonly alpha: number } | null {
  const u = wrap(t);
  const alpha = window01(u, 15.5, 19.3, 0.3);
  if (alpha <= 0) return null;
  const x = FLOAT_FEATHER_X + 40 * Math.sin(cycles(1, u)) + 25 * (u - FISH_AT);
  return { x, y: floatBob(x, u) - 6, tilt: 0.12 * Math.sin(u * 1.9), alpha };
}

/** The little fish crossing in front of the smug shark on "fish…" (world px; null off screen). */
export function littleFishAt(t: number): { readonly x: number; readonly y: number; readonly beat: number } | null {
  const u = wrap(t);
  if (u < FISH_AT - 0.6 || u > FISH_AT + 1.8) return null;
  const s = u - (FISH_AT - 0.6);
  return { x: 700 - 520 * s, y: 95 + 14 * Math.sin(s * 5), beat: u * 20 };
}

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** World point at the screen's focus, and screen px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Frame 1: half sky, half sea, the open jaws a little above the middle, the bird over them. */
const HOOK_ZOOM = 1.2;
const MOUTH_ON_SCREEN = { x: 560, y: 660 } as const;
export const HOOK_CAM: Camera = { x: MOUTH_1.x - (MOUTH_ON_SCREEN.x - 540) / HOOK_ZOOM, y: MOUTH_1.y - (MOUTH_ON_SCREEN.y - 800) / HOOK_ZOOM, zoom: HOOK_ZOOM };
const SKY_CAM_Y = -600;
const SKY_ZOOM = 0.45;
const UNDER: Camera = { x: 0, y: 350, zoom: 0.8 };
const SMUG_CAM: Camera = { x: 120, y: 160, zoom: 1.3 };

/** Camera keys, video time (unwrapped round the seam where it runs across it). */
const CAM: readonly (Camera & { readonly t: number })[] = [
  { t: -0.5, ...HOOK_CAM },
  { t: 2.15, ...HOOK_CAM },
  { t: 2.75, x: 40, y: -120, zoom: 0.92 },
  { t: 3.6, x: -300 + 77 * 0.6, y: SKY_CAM_Y, zoom: SKY_ZOOM },
  { t: 8.25, x: 100, y: SKY_CAM_Y, zoom: SKY_ZOOM },
  { t: 8.95, x: 40, y: -330, zoom: 0.72 },
  { t: 9.45, x: 0, y: -140, zoom: 1.0 },
  { t: 9.85, x: 0, y: -110, zoom: 1.0 },
  { t: 10.55, ...UNDER },
  { t: 15.55, x: 0, y: 380, zoom: 0.8 },
  { t: 16.2, ...SMUG_CAM },
  { t: 18.6, x: SMUG_CAM.x, y: SMUG_CAM.y + 6, zoom: SMUG_CAM.zoom },
  { t: 19.35, ...HOOK_CAM },
  { t: LOOP_S + 2.15, ...HOOK_CAM },
];
const CAM_X: readonly Key[] = CAM.map((k, i) => ({ t: k.t, at: k.x, rate: i === 3 || i === 4 ? 77 : 0 }));
const CAM_Y: readonly Key[] = CAM.map((k) => ({ t: k.t, at: k.y, rate: 0 }));
const CAM_Z: readonly Key[] = CAM.map((k) => ({ t: k.t, at: Math.log(k.zoom), rate: 0 }));

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at, zoom: Math.exp(curveAt(CAM_Z, u).at) };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + FOCUS.x, y: (p.y - cam.y) * cam.zoom + FOCUS.y });

// ---------------------------------------------------------------- weather

/** Rain, 0 .. 1: the hook's storm, gone for the sunset, back on "storm", over the surface only. */
const RAIN: readonly [number, number][] = [
  [0, 1], [2.85, 1], [3.4, 0], [7.1, 0], [7.7, 1], [10.3, 1], [10.7, 0.35], [15.4, 0.35], [15.9, 0], [18.6, 0], [19.2, 1], [LOOP_S, 1],
];
export function rainAt(t: number): number {
  const u = wrap(t);
  for (let i = 1; i < RAIN.length; i++) {
    const [t0, a] = RAIN[i - 1]!;
    const [t1, b] = RAIN[i]!;
    if (u <= t1) return lerp(a, b, smooth((u - t0) / (t1 - t0)));
  }
  return 1;
}

/** Lightning: when each bolt strikes, and where across the screen it comes down. */
export const BOLTS = [
  { t: HITS_AT + 0.02, x: 300, seed: 3 },
  { t: YES_AT + 0.33, x: 120, seed: 7 },
  { t: SNAP_AT + 0.03, x: 860, seed: 11 },
] as const;
/** The flash and the bolt, 0 .. 1, for a strike at time t (wrapping round the seam). */
export function boltAt(t: number, at: number): { readonly flash: number; readonly bolt: number } {
  const since = wrap(t - at);
  if (since > 1.2) return { flash: 0, bolt: 0 };
  const flicker = since < 0.16 ? 1 : since < 0.22 ? 0.35 : since < 0.3 ? 0.9 : Math.max(0, 1 - (since - 0.3) / 0.85);
  return { flash: Math.exp(-since * 9) * (since < 0.08 || (since > 0.22 && since < 0.28) ? 1 : 0.6), bolt: flicker };
}

// ---------------------------------------------------------------- spray

export interface Spray {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly r: number;
  readonly alpha: number;
}

const G = 2400;

/** Drops shed off the shark as it bursts out: when (lunge clock), from where along it (0 nose .. 1 tail), which side, and how fast they fly off. */
const SHED = Array.from({ length: 90 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const r1 = a - Math.floor(a);
  const b = Math.sin(i * 78.233) * 12543.123;
  const r2 = b - Math.floor(b);
  return { e: BREAKOUT + 0.02 + (i / 90) * 0.75, along: 0.12 + r1 * 0.5, side: i % 2 ? 1 : -1, kick: 220 + r2 * 520, up: -120 - r1 * 380, r: 3 + r2 * 7 };
});

function lungeVelocity(b: number): Pt {
  const h = 0.01;
  return { x: (curveAt(LX, b + h).at - curveAt(LX, b - h).at) / (2 * h), y: (curveAt(LY, b + h).at - curveAt(LY, b - h).at) / (2 * h) };
}

/** Water streaming off the shark in the lunge, and the burst from its jaws as they snap (world px). */
export function sprayAt(t: number): readonly Spray[] {
  const b = breachAt(t);
  const out: Spray[] = [];
  if (b !== null) {
    for (const d of SHED) {
      const s = b - d.e;
      if (s < 0 || s > 1.1) continue;
      const tilt = curveAt(LTILT, d.e).at;
      const c = { x: curveAt(LX, d.e).at, y: curveAt(LY, d.e).at };
      const dir = { x: Math.cos(tilt), y: -Math.sin(tilt) };
      const off = (0.5 - d.along) * SHARK_LEN;
      // From the edge of its silhouette, not its middle: water running off its back and belly.
      const edge = 135 * Math.sin(Math.PI * Math.min(1, 0.15 + d.along)) + 12;
      const p0 = { x: c.x + dir.x * off + d.side * dir.y * edge, y: c.y + dir.y * off - d.side * dir.x * edge };
      if (p0.y > -10) continue;
      const v0 = lungeVelocity(d.e);
      // Flung outwards, away from the side it ran off.
      const away = { x: d.side * dir.y, y: -d.side * dir.x };
      const vx = v0.x * 0.5 + away.x * d.kick;
      const vy = v0.y * 0.55 + away.y * d.kick * 0.5 + d.up;
      const y = p0.y + vy * s + 0.5 * G * s * s;
      if (y > 0) continue;
      out.push({ x: p0.x + vx * s, y, vx, vy: vy + G * s, r: d.r, alpha: Math.min(1, (1.1 - s) * 3) });
    }
  }
  const since = across(t) - (LOOP_S + VANISH_AT);
  if (since >= 0 && since < 0.9) {
    for (let k = 0; k < 20; k++) {
      const ang = -Math.PI / 2 + ((k / 19) - 0.5) * 2.6;
      const speed = 380 + ((k * 37) % 11) * 45;
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;
      out.push({ x: IN_MOUTH.x + vx * since, y: IN_MOUTH.y + vy * since + 0.5 * G * since * since, vx, vy: vy + G * since, r: 4 + (k % 4) * 2, alpha: Math.min(1, (0.9 - since) * 3) });
    }
  }
  return out;
}

/** Splashes on the surface: where, and how long since (the lunge's ones on its own clock, the bird's landing on the video's). */
export function splashesAt(t: number): readonly { readonly x: number; readonly half: number; readonly since: number; readonly size: number }[] {
  const out: { x: number; half: number; since: number; size: number }[] = [];
  const b = breachAt(t);
  if (b !== null) {
    out.push({ x: curveAt(LX, BREAKOUT + 0.1).at + 60, half: 110, since: b - BREAKOUT, size: 1.25 });
    out.push({ x: curveAt(LX, CRASH).at + 40, half: 140, since: b - CRASH, size: 1.6 });
  }
  const land = wrap(t) - SEA_AT;
  if (land >= 0 && land < 2.4) out.push({ x: LANDING.x, half: 30, since: land, size: 0.35 });
  return out;
}

/** The video time (within the loop) when the lunge's clock reaches `b`, searched frame by frame from "So". */
function videoTimeOf(b: number): number {
  for (let u = 18.6; u < BREACH_END; u += 1 / 600) {
    const at = breachAt(u);
    if (at !== null && at >= b) return wrap(u);
  }
  throw new Error(`the lunge never reaches ${b}`);
}
/** When it breaks the surface, and when it crashes back, in video time. */
export const BREAKOUT_T = videoTimeOf(BREAKOUT);
export const CRASH_T = videoTimeOf(CRASH);
