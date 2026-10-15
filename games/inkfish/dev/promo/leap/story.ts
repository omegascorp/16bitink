import { BIRD_RADIUS } from '../../../src/art/birdArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { bodyProportions } from '../../../src/art/fishArt';
import { pitchForSize, type SfxId } from '../../../src/audio/recipes';
import { JUMP } from '../../../src/logic/jump';
import { scoreFor } from '../../../src/logic/sizing';
import { createRng } from '../../../src/logic/rng';
import { mouthOf, NOSE, type Pose } from '../chain';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { seamTime } from '../gameplay/fish';

/**
 * "Don't fly too close to the sun… or too low": chapter 5 of the game (the
 * wreck), played as a highlight. You are the young tuna, the game's best
 * leaper; the gulls skimming the sea are snacks you can only reach by
 * leaping. The loop opens mid-leap: the first lunge falls short and the gull
 * flares up out of reach. It forgets, glides back down, and the second leap
 * takes it out of the air. Then the next gull skims in low...
 *
 *   0     you are out of the water, jaws wide, lunging at a gull skimming low: it sees you, "!"
 *   0.18  your jaws snap shut just under its tail: missed, a feather flies
 *   0.65  you crash back in; it flaps up towards the sun, scolding
 *   2.05  you turn back under it; it glides down to skim the water again
 *   4.45  two dashes up at the surface (the tuna's back-to-back dash)
 *   4.85  you burst out of the sea...
 *   5.25  ...and take it by the tail near the top of the leap: "+340" (44% in)
 *   5.65  splash, bubbles; feathers settle on the water; "…or too low"
 *   8.0   the next gull flies in low from the right: "some birds never learn"
 *   11.5  two dashes up at the surface again
 *   11.9  out of the water, which is where the loop began.
 *
 * Times are story time: timing.ts plays the snatch at ~0.35x (and the miss at
 * 0.6x) and the rest a touch faster, so the video's loop and seam are unchanged.
 * Everything is in screen px (the camera holds still). Leaps are the game's
 * (logic/jump.ts): a launch you can't steer, gravity pulling you back down,
 * sideways speed bleeding off in the air.
 */
export const LOOP_S = 12;

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seam = (t: number): number => seamTime(t, LOOP_S);
/** A time difference wrapped into [-LOOP_S / 2, LOOP_S / 2). */
const wrapDt = (dt: number): number => dt - LOOP_S * Math.floor(dt / LOOP_S + 0.5);

/** The waterline, px from the top of the video. */
export const SURFACE_Y = 980;
export const TUNA_LEN = 380;

/**
 * The gull's size against yours, as the game spawns them: gulls come at
 * 0.6-1.9 times your size, and any under 0.9 is prey (logic/birds.ts,
 * logic/sizing.ts). This one is a snack.
 */
export const GULL_RATIO = 0.75;
/** The tuna's size (the game's radius) at this point of chapter 5; the gull is GULL_RATIO of it. */
const TUNA_SIZE = 45;
export const GULL_SIZE = Math.round(TUNA_SIZE * GULL_RATIO);
/** "+340": the game's score for the gull (scoreFor, no frenzy multiplier). */
export const POINTS = scoreFor(GULL_SIZE, 1);
/**
 * Screen px per px of the game's bird drawing: drawn at the size the game
 * gives a bird of GULL_RATIO times your size next to a fish TUNA_LEN long
 * (fish: size / FISH_RADIUS per texture px; birds: size / BIRD_RADIUS).
 */
export const GULL_SCALE = (GULL_RATIO * TUNA_LEN * FISH_RADIUS) / (2 * bodyProportions('tuna').hl * BIRD_RADIUS);

/** Pull back down in the air, screen px/s² (the game's gravity, scaled to this view). */
const GRAVITY = 3640;
/** Sideways speed lost per second in the air (the game's). */
const AIR_DRAG = JUMP.airDrag;

interface Pt { readonly x: number; readonly y: number }

// ---------------------------------------------------------------- the gull

/** When the next gull flies in: its age is 0 here, and the loop's gull is that much older at t = 0. */
export const GULL_ENTER = 8.0;
const AGE_AT_START = LOOP_S - GULL_ENTER;
export const MISS_AT = 0.18;
export const CATCH_AT = 5.25;
export const GULP_AT = 5.37;
const CHEWS = [{ at: GULP_AT + 0.25, size: 0.2 }, { at: GULP_AT + 0.55, size: 0.14 }] as const;
const CHEW_LEN = 0.16;

/** The gull's flight by age (s since it flew in): in low from the right, a flare up away from the first leap, then back down to skim the water. */
const GULL_KEYS: readonly { readonly age: number; readonly x: number; readonly y: number; readonly vx?: number; readonly vy?: number }[] = [
  { age: 0, x: 1290, y: 715, vx: -175, vy: 8 },
  { age: 2.0, x: 935, y: 735 },
  { age: 3.4, x: 725, y: 752, vx: -125, vy: 0 },
  { age: 3.9, x: 660, y: 735, vx: -130, vy: -160 },
  { age: AGE_AT_START + MISS_AT, x: 600, y: 672, vx: -360, vy: -230 },
  { age: 4.6, x: 480, y: 634 },
  { age: 5.2, x: 455, y: 630, vx: -55, vy: 0 },
  { age: 6.2, x: 430, y: 652, vx: -50, vy: 15 },
  { age: 7.5, x: 390, y: 712 },
  { age: 8.6, x: 335, y: 752, vx: -45, vy: 18 },
  { age: AGE_AT_START + CATCH_AT, x: 305, y: 762, vx: -45, vy: 0 },
];
const GULL_X: readonly Key[] = GULL_KEYS.map((k) => ({ t: k.age, at: k.x, ...(k.vx === undefined ? {} : { rate: k.vx }) }));
const GULL_Y: readonly Key[] = GULL_KEYS.map((k) => ({ t: k.age, at: k.y, ...(k.vy === undefined ? {} : { rate: k.vy }) }));

export function gullFlight(age: number): Pt & { readonly vx: number; readonly vy: number } {
  const x = curveAt(GULL_X, age);
  const y = curveAt(GULL_Y, age);
  return { x: x.at, y: y.at, vx: x.rate, vy: y.rate };
}

export interface GullPose {
  readonly x: number;
  readonly y: number;
  /** Nose up, radians. */
  readonly tilt: number;
  /** The game's bird drawing's wing frame: 0 up, 1 level, 2 down. */
  readonly frame: 0 | 1 | 2;
  /** Size, 1 is GULL_SCALE. */
  readonly scale: number;
  /** Facing: gulls here fly left. */
  readonly facing: 1 | -1;
}

export type GullState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'flying'; readonly pose: GullPose }
  | { readonly kind: 'taken'; readonly pose: GullPose };

const FLAP_CYCLE = [0, 1, 2, 1] as const;
const FLAP_HZ = 3;
/** Flapping for its life after the first leap (a whole number of cycles is not needed: it spans the seam on one clock). */
const PANIC_HZ = 5.5;
const PANIC = { from: -0.2, to: 1.6 } as const;
/** It stops flapping and glides back down over these times. */
const GLIDE = { from: 2.4, to: 4.2 } as const;

function flyingGull(age: number, t: number): GullPose {
  const f = gullFlight(age);
  // Nose up as it climbs, down as it sinks (gently).
  const tilt = 0.6 * Math.atan2(-f.vy, Math.abs(f.vx));
  const u = seam(t);
  const panicking = u >= PANIC.from && u < PANIC.to;
  const gliding = t >= GLIDE.from && t < GLIDE.to;
  const beat = panicking ? Math.floor((u - PANIC.from) * PANIC_HZ * 4) : Math.floor(t * FLAP_HZ * 4 + 1e-6);
  const frame = gliding ? 1 : FLAP_CYCLE[((beat % 4) + 4) % 4]!;
  return { x: f.x, y: f.y, tilt, frame, scale: 1, facing: -1 };
}

/** The gull: the loop's own until it is eaten, then the next one flying in. */
export function gullAt(t: number): GullState {
  if (t >= GULL_ENTER) return { kind: 'flying', pose: flyingGull(t - GULL_ENTER, t) };
  if (t < CATCH_AT) return { kind: 'flying', pose: flyingGull(t + AGE_AT_START, t) };
  if (t >= GULP_AT) return { kind: 'gone' };
  // Taken: dragged from where it was, through the lips and into the throat, shrinking into the dark.
  const fish = tunaAt(t);
  const u = (t - CATCH_AT) / (GULP_AT - CATCH_AT);
  const lips = mouthOf(fish);
  const throat = { x: fish.x + fish.facing * Math.cos(fish.tilt) * 0.2 * fish.length, y: fish.y - Math.sin(fish.tilt) * 0.2 * fish.length };
  const held = flyingGull(CATCH_AT + AGE_AT_START, CATCH_AT);
  const e = u ** 1.4;
  const a = (1 - e) ** 2;
  const b = 2 * e * (1 - e);
  const c = e * e;
  return {
    kind: 'taken',
    pose: { x: a * held.x + b * lips.x + c * throat.x, y: a * held.y + b * lips.y + c * throat.y, tilt: held.tilt * (1 - e), frame: 0, scale: 1 - 0.55 * e, facing: -1 },
  };
}

/** The last moments before the bite, when your head is in front of the gull. */
export const gullBehind = (t: number): boolean => t >= CATCH_AT - 0.12 && t < CATCH_AT;

/** The "!" over the gull as you burst out under it: 0 hidden .. 1, overshooting as it pops; up from just before the seam. */
export function gullAlarm(t: number): number {
  const since = seam(t) - (EXIT_AT_SEAM + 0.02);
  if (since < 0 || since > 0.75) return 0;
  const grow = since < 0.12 ? smooth(since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - (since - 0.12) / 0.06);
  return grow * (1 - ramp(since, 0.6, 0.75));
}

// ---------------------------------------------------------------- the leaps

interface Leap {
  /** When the body breaks the surface (seam time for the leap that spans the loop point). */
  readonly exit: number;
  /** Where, and at what speed it launches (px/s). */
  readonly x: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: 1 | -1;
  /** Seconds in the air: up and back down to the surface. */
  readonly air: number;
}

/** Where a leap has you `s` seconds after breaking the surface, and how fast you're going. */
function inAir(l: Leap, s: number): { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number } {
  const keep = Math.exp(-AIR_DRAG * s);
  return {
    x: l.x + (l.vx * (1 - keep)) / AIR_DRAG,
    y: SURFACE_Y + l.vy * s + 0.5 * GRAVITY * s * s,
    vx: l.vx * keep,
    vy: l.vy + GRAVITY * s,
  };
}

/** Nose up or down with the motion; a little damping keeps slow drifts level. Up to 1.3 rad nose-up out of the water, but only 0.65 nose-down back in: a belly-flop crash, so the big tail never swings up through the bird. */
const tiltOf = (vx: number, vy: number): number => Math.max(-0.65, Math.min(1.3, Math.atan2(-vy, Math.abs(vx) + 140)));

/**
 * The leap that puts your mouth at `mouth` at time `at`, breaking the
 * surface at `exit` with sideways speed `vx`. Solved by a few rounds of
 * guessing the angle you'll be at, since the mouth leads the body.
 */
function leapTo(exit: number, at: number, mouth: Pt, vx: number): Leap {
  const s = at - exit;
  const facing: 1 | -1 = vx > 0 ? 1 : -1;
  const keep = Math.exp(-AIR_DRAG * s);
  const reach = NOSE * TUNA_LEN;
  let tilt = 0;
  let vy = -1000;
  for (let i = 0; i < 30; i++) {
    const cy = mouth.y + Math.sin(tilt) * reach;
    vy = (cy - SURFACE_Y - 0.5 * GRAVITY * s * s) / s;
    tilt = tiltOf(vx * keep, vy + GRAVITY * s);
  }
  const x = mouth.x - facing * Math.cos(tilt) * reach - (vx * (1 - keep)) / AIR_DRAG;
  return { exit, x, vx, vy, facing, air: (-2 * vy) / GRAVITY };
}

/** The first leap, across the loop point: your jaws close just under the gull's tail as it flares away. */
const EXIT_AT_SEAM = -0.1;
const MISS_GULL = gullFlight(MISS_AT + AGE_AT_START);
const LEAP_MISS = leapTo(EXIT_AT_SEAM, MISS_AT, { x: MISS_GULL.x + 150, y: MISS_GULL.y + 172 }, 780);
/** The second: your mouth meets the gull at the top of the leap. */
export const CATCH_POINT = gullFlight(CATCH_AT + AGE_AT_START);
const EXIT_CATCH = 4.85;
const LEAP_CATCH = leapTo(EXIT_CATCH, CATCH_AT, { x: CATCH_POINT.x + 75, y: CATCH_POINT.y + 24 }, -380);
const LEAPS = [LEAP_MISS, LEAP_CATCH] as const;

/** When each leap goes back in. */
const ENTRY_MISS = LEAP_MISS.exit + LEAP_MISS.air;
const ENTRY_CATCH = LEAP_CATCH.exit + LEAP_CATCH.air;

/** After going back in, the water brakes you hard: down hardest, so you level out. */
const PLUNGE_S = 0.35;
const BRAKE = { x: 4.5, y: 17 } as const;

function plunge(l: Leap, s: number): { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number } {
  const e = inAir(l, l.air);
  const kx = Math.exp(-BRAKE.x * s);
  const ky = Math.exp(-BRAKE.y * s);
  return { x: e.x + (e.vx * (1 - kx)) / BRAKE.x, y: e.y + (e.vy * (1 - ky)) / BRAKE.y, vx: e.vx * kx, vy: e.vy * ky };
}

/** The leap you're in at time t and how far into it, or null under water. */
function leapAt(t: number): { readonly leap: Leap; readonly s: number } | null {
  for (const leap of LEAPS) {
    const s = wrapDt(t - leap.exit);
    if (s >= 0 && s <= leap.air + PLUNGE_S) return { leap, s };
  }
  return null;
}

export const airborne = (t: number): boolean => {
  const l = leapAt(t);
  return l !== null && l.s <= l.leap.air;
};

// ---------------------------------------------------------------- under the water

interface SwimKey { readonly t: number; readonly x: number; readonly y: number; readonly vx?: number; readonly vy?: number }

const entryKey = (l: Leap, t: number): SwimKey => {
  const p = plunge(l, PLUNGE_S);
  return { t: t + PLUNGE_S, x: p.x, y: p.y, vx: p.vx, vy: p.vy };
};
const exitKey = (l: Leap, t: number): SwimKey => ({ t, x: l.x, y: SURFACE_Y, vx: l.vx, vy: l.vy });

/** Back in after the miss: carried on, round, and back under the gull, then sinking a touch before the dash up. */
const SWIM_AFTER_MISS: readonly SwimKey[] = [
  entryKey(LEAP_MISS, ENTRY_MISS),
  { t: 2.05, x: 845, y: 1078, vx: 0, vy: 0 },
  { t: 3.0, x: 735, y: 1074 },
  { t: 3.9, x: LEAP_CATCH.x + 190, y: 1072, vx: -120, vy: 6 },
  { t: EXIT_CATCH - 0.32, x: LEAP_CATCH.x + 130, y: 1072, vx: -110, vy: 0 },
  exitKey(LEAP_CATCH, EXIT_CATCH),
];

/** Back in with the gull inside you: down, round, and waiting under the next one. */
const SWIM_AFTER_CATCH: readonly SwimKey[] = [
  entryKey(LEAP_CATCH, ENTRY_CATCH),
  { t: 6.9, x: 230, y: 1078, vx: 0, vy: 0 },
  { t: 8.4, x: 270, y: 1072 },
  { t: 10.2, x: LEAP_MISS.x - 85, y: 1078, vx: 10, vy: 0 },
  { t: LOOP_S + EXIT_AT_SEAM - 0.32, x: LEAP_MISS.x - 70, y: 1074, vx: 80, vy: 0 },
  exitKey(LEAP_MISS, LOOP_S + EXIT_AT_SEAM),
];

const axis = (keys: readonly SwimKey[], at: 'x' | 'y', rate: 'vx' | 'vy'): Key[] =>
  keys.map((k) => ({ t: k.t, at: k[at], ...(k[rate] === undefined ? {} : { rate: k[rate] }) }));
const SWIMS = [SWIM_AFTER_MISS, SWIM_AFTER_CATCH].map((keys) => ({ from: keys[0]!.t, to: keys[keys.length - 1]!.t, x: axis(keys, 'x', 'vx'), y: axis(keys, 'y', 'vy') }));

function swimAt(t: number): { readonly x: number; readonly y: number; readonly vx: number; readonly vy: number } {
  const swim = SWIMS.find((s) => t >= s.from && t <= s.to) ?? SWIMS[1]!;
  const x = curveAt(swim.x, t);
  const y = curveAt(swim.y, t);
  return { x: x.at, y: y.at, vx: x.rate, vy: y.rate };
}

/** Which way you face: right for the first leap, round to the left under the gull, back right after the catch. */
const TURNS = [[0, 1], [2.05, -1], [6.9, 1]] as const;
const facingAt = (t: number): 1 | -1 => {
  let f: 1 | -1 = TURNS[0][1];
  for (const [at, to] of TURNS) if (t >= at) f = to;
  return f;
};

/** Tail beats a second: LOOP_S times this is whole, so the tail is where it was at the seam. */
const BEAT_HZ = 3;

/** The tuna at time t, on screen. */
export function tunaAt(t: number): Pose {
  const air = leapAt(t);
  const p = !air ? swimAt(t) : air.s <= air.leap.air ? inAir(air.leap, air.s) : plunge(air.leap, air.s - air.leap.air);
  const speed = Math.hypot(p.vx, p.vy);
  return {
    j: 0, age: 0, shape: 'tuna', x: p.x, y: p.y, length: TUNA_LEN, facing: air ? air.leap.facing : facingAt(t),
    tilt: tiltOf(p.vx, p.vy), beat: 2 * Math.PI * BEAT_HZ * t, effort: clamp01(speed / 700),
  };
}

/** How far your jaw hangs open: wide on the way up, snapped shut on the miss and on the catch, then two chews. */
export function tunaJaw(t: number): number {
  const u = seam(t);
  if (u >= EXIT_AT_SEAM - 0.25 && u < MISS_AT + 0.05) return u < MISS_AT ? ramp(u, EXIT_AT_SEAM - 0.25, EXIT_AT_SEAM + 0.1) : 1 - ramp(u, MISS_AT, MISS_AT + 0.05);
  if (t >= EXIT_CATCH - 0.25 && t < CATCH_AT + 0.05) return t < CATCH_AT ? ramp(t, EXIT_CATCH - 0.25, EXIT_CATCH + 0.1) : 1 - ramp(t, CATCH_AT, CATCH_AT + 0.05);
  let open = 0;
  for (const c of CHEWS) if (t > c.at && t < c.at + CHEW_LEN) open = Math.max(open, c.size * Math.sin((Math.PI * (t - c.at)) / CHEW_LEN));
  return open;
}

/** The gull going down. */
export function tunaLump(t: number): { readonly size: number; readonly at: number } {
  if (t < GULP_AT || t > 7.8) return { size: 0, at: 0.2 };
  return { size: Math.min(1, (t - GULP_AT) / 0.1) * (1 - ramp(t, 6.6, 7.8)), at: lerp(0.2, 0.5, ramp(t, GULP_AT, 7.0)) };
}

export function tunaEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= CATCH_AT && t < CATCH_AT + 0.3) return 'squeeze';
  if (t >= CATCH_AT + 0.3 && t < 7.4) return 'happy';
  return null;
}

/** The jolt as the jaws snap: 0 .. 1 (half for the miss). */
export function snap(t: number): number {
  for (const [at, size] of [[MISS_AT, 0.5], [CATCH_AT, 1]] as const) {
    const s = wrapDt(t - at);
    if (s > -0.02 && s < 0.12) return Math.sin((Math.PI * (s + 0.02)) / 0.14) * size;
  }
  return 0;
}

/** Camera shake, px: the snap, the catch, the crash back in. */
export function shake(t: number): Pt {
  const jolts = [{ at: MISS_AT, amp: 6 }, { at: CATCH_AT, amp: 14 }, { at: ENTRY_CATCH, amp: 7 }];
  let x = 0;
  let y = 0;
  for (const j of jolts) {
    const s = wrapDt(t - j.at);
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

// ---------------------------------------------------------------- splashes, bubbles and feathers

export interface Splash { readonly at: number; readonly x: number; readonly size: number; readonly kind: 'out' | 'in' }

/** Where and when you break the surface and go back in. */
export const SPLASHES: readonly Splash[] = [
  { at: LOOP_S + EXIT_AT_SEAM, x: LEAP_MISS.x, size: 1.0, kind: 'out' },
  { at: ENTRY_MISS, x: inAir(LEAP_MISS, LEAP_MISS.air).x, size: 1.2, kind: 'in' },
  { at: EXIT_CATCH, x: LEAP_CATCH.x, size: 1.05, kind: 'out' },
  { at: ENTRY_CATCH, x: inAir(LEAP_CATCH, LEAP_CATCH.air).x, size: 1.45, kind: 'in' },
];

/** Seconds since a moment, counting round the loop: `at` a little before the seam is still "just now" after it. */
export const sinceLoop = (t: number, at: number): number => ((t - at) % LOOP_S + LOOP_S) % LOOP_S;

/** Bubbles left behind as you dive back in: where along your path, and how each wobbles up. */
const BUBBLES = (() => {
  const rng = createRng(83);
  return Array.from({ length: 14 }, (_, i) => ({ after: 0.04 + (i / 14) * 0.5, r: 7 + rng() * 12, rise: 110 + rng() * 100, phase: rng() * Math.PI * 2, side: (rng() - 0.5) * 50 }));
})();
const BUBBLE_LIFE = 1.4;

export interface Bubble { readonly x: number; readonly y: number; readonly r: number; readonly alpha: number }

export function bubblesAt(t: number): Bubble[] {
  const out: Bubble[] = [];
  for (const s of SPLASHES.filter((sp) => sp.kind === 'in')) {
    for (const b of BUBBLES) {
      const born = s.at + b.after;
      const age = sinceLoop(t, born);
      if (age > BUBBLE_LIFE) continue;
      const from = tunaAt(born % LOOP_S);
      // Shed from your tail end, then wobbling up; popped at the surface.
      const tail = { x: from.x - from.facing * Math.cos(from.tilt) * 0.35 * TUNA_LEN, y: from.y + Math.sin(from.tilt) * 0.35 * TUNA_LEN };
      const y = tail.y - b.rise * age;
      if (y < SURFACE_Y + b.r + 4) continue;
      out.push({ x: tail.x + b.side * 0.4 + 7 * Math.sin(9 * age + b.phase), y, r: b.r * (0.7 + 0.3 * Math.min(1, age * 3)), alpha: 1 - ramp(age, BUBBLE_LIFE - 0.5, BUBBLE_LIFE) });
    }
  }
  return out;
}

interface Feather { readonly from: number; readonly vx: number; readonly vy: number; readonly sway: number; readonly phase: number; readonly fall: number; readonly size: number }

/** Feathers knocked loose: one from the miss, a burst from the catch. Each flies out, rocks, settles on the water, and fades. */
const FEATHERS: readonly Feather[] = (() => {
  const rng = createRng(31);
  const make = (from: number, n: number, spread: number): Feather[] => Array.from({ length: n }, () => ({
    from, vx: (rng() - 0.5) * spread, vy: -150 - rng() * 260, sway: 0.5 + rng() * 0.4, phase: rng() * Math.PI * 2, fall: 95 + rng() * 40, size: 1.0 + rng() * 0.6,
  }));
  return [...make(MISS_AT, 2, 260), ...make(CATCH_AT + 0.02, 6, 560)];
})();
export const FEATHER_COUNT = FEATHERS.length;
/** A feather lasts this long after it is knocked loose, fading over its last second. */
const FEATHER_LIFE = 4.2;

export interface FeatherPose { readonly x: number; readonly y: number; readonly rotation: number; readonly size: number; readonly alpha: number }

/** Feather `i` at time t, or null when it isn't there. */
export function featherAt(i: number, t: number): FeatherPose | null {
  const f = FEATHERS[i]!;
  const since = sinceLoop(t, f.from);
  if (since > FEATHER_LIFE) return null;
  const at = f.from === MISS_AT ? { x: MISS_GULL.x + 40, y: MISS_GULL.y + 35 } : mouthOf(tunaAt(f.from));
  const burst = 1 - Math.exp(-4 * since);
  const rock = Math.sin(2 * Math.PI * f.sway * since + f.phase);
  const x = at.x + (f.vx / 4) * burst + 26 * rock * ramp(since, 0.3, 1);
  const y = Math.min(SURFACE_Y - 4, at.y + (f.vy / 4) * burst + f.fall * Math.max(0, since - 0.25));
  const afloat = y >= SURFACE_Y - 4;
  return {
    x, y: afloat ? y + 3 * Math.sin(3 * since + f.phase) : y, rotation: afloat ? 0.15 * rock : 0.6 * rock, size: f.size,
    alpha: 1 - ramp(since, FEATHER_LIFE - 1, FEATHER_LIFE),
  };
}

// ---------------------------------------------------------------- "+340"

/** The game's score text over the catch: how far it has risen and how visible, or null. */
export function scoreText(t: number): { readonly rise: number; readonly alpha: number; readonly x: number; readonly y: number } | null {
  const s = t - (CATCH_AT + 0.05);
  if (s < 0 || s >= 0.95) return null;
  return { rise: 1 - (1 - s / 0.95) ** 2, alpha: Math.min(1, s / 0.08) * (1 - ramp(s, 0.6, 0.95)), x: CATCH_POINT.x + 60, y: CATCH_POINT.y - 110 };
}


// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  /** Shown over [from, to] seconds, fading at both ends; may run past the loop's ends, wrapping round. */
  readonly from: number;
  readonly to: number;
}

const HOOK = { from: -0.45, to: 2.6 };
export const CAPTIONS: readonly Caption[] = [
  { text: 'don’t fly too close', y: 345, size: 104, ...HOOK },
  { text: 'to the sun…', y: 445, size: 104, ...HOOK },
  { text: '…or too low', y: 410, size: 132, from: 5.4, to: 8.1 },
  { text: 'some birds never learn', y: 380, size: 98, from: 8.6, to: 11.35 },
];

const CAPTION_FADE = 0.25;

/** How visible a caption is at time t, 0 .. 1, counting its copies a loop before and after (so it can span the seam). */
export function captionAlpha(c: Caption, t: number): number {
  return Math.max(...[-LOOP_S, 0, LOOP_S].map((shift) => window01(t + shift, c.from, c.to, CAPTION_FADE)));
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** -1 left .. 1 right. */
  readonly pan: number;
}

const panAt = (x: number): number => Math.max(-1, Math.min(1, (x - 540) / 540)) * 0.6;
const [OUT_MISS, IN_MISS, OUT_CATCH, IN_CATCH] = SPLASHES as readonly [Splash, Splash, Splash, Splash];
const EAT_PITCH = pitchForSize(GULL_SIZE);

export const SOUNDS: readonly SoundCue[] = [
  // The miss: jaws clack shut under the gull, a feather torn loose, and it shrieks off.
  { id: 'eat', t: MISS_AT, pitch: 0.55, gain: 0.6, pan: panAt(MISS_GULL.x) },
  { id: 'rustle', t: MISS_AT + 0.02, pitch: 1.5, gain: 0.25, pan: panAt(MISS_GULL.x) },
  { id: 'squawk', t: MISS_AT + 0.12, pitch: 1.45, gain: 0.45, pan: panAt(MISS_GULL.x) },
  { id: 'splash', t: IN_MISS.at, pitch: 0.8, gain: 0.6, pan: panAt(IN_MISS.x) },
  // Scolding from up high.
  { id: 'squawk', t: 2.1, pitch: 1.35, gain: 0.25, pan: -0.1 },
  // Two dashes up at the surface, and out.
  { id: 'dash', t: EXIT_CATCH - 0.4, pitch: 0.95, gain: 0.45, pan: panAt(OUT_CATCH.x) },
  { id: 'dash', t: EXIT_CATCH - 0.22, pitch: 1.05, gain: 0.45, pan: panAt(OUT_CATCH.x) },
  { id: 'lunge', t: EXIT_CATCH - 0.1, pitch: 0.8, gain: 0.7, pan: panAt(OUT_CATCH.x) },
  { id: 'splash', t: OUT_CATCH.at, pitch: 0.9, gain: 0.6, pan: panAt(OUT_CATCH.x) },
  // The catch: the game's bite for a gull this size, the big gulp under it, feathers.
  { id: 'eat', t: CATCH_AT, pitch: EAT_PITCH, gain: 0.65, pan: panAt(CATCH_POINT.x) },
  { id: 'eatBig', t: CATCH_AT, pitch: 0.85, gain: 0.45, pan: panAt(CATCH_POINT.x) },
  { id: 'rustle', t: CATCH_AT + 0.04, pitch: 1.3, gain: 0.35, pan: panAt(CATCH_POINT.x) },
  ...CHEWS.map((c, i): SoundCue => ({ id: 'eat', t: c.at + 0.03, pitch: 0.7, gain: 0.35 - i * 0.1, pan: panAt(IN_CATCH.x) })),
  { id: 'splash', t: IN_CATCH.at, pitch: 0.7, gain: 0.75, pan: panAt(IN_CATCH.x) },
  { id: 'drop', t: IN_CATCH.at + 0.25, pitch: 0.8, gain: 0.25, pan: panAt(IN_CATCH.x) },
  // Feathers settling on the water.
  { id: 'drop', t: 7.0, pitch: 1.7, gain: 0.1, pan: -0.3 },
  // The next gull calling as it flies in.
  { id: 'squawk', t: 8.9, pitch: 1.6, gain: 0.25, pan: 0.5 },
  { id: 'squawk', t: 10.6, pitch: 1.7, gain: 0.2, pan: 0.3 },
  // Two dashes, out, and the gull sees you.
  { id: 'dash', t: OUT_MISS.at - 0.4, pitch: 0.95, gain: 0.45, pan: panAt(OUT_MISS.x) },
  { id: 'dash', t: OUT_MISS.at - 0.22, pitch: 1.05, gain: 0.45, pan: panAt(OUT_MISS.x) },
  { id: 'lunge', t: OUT_MISS.at - 0.1, pitch: 0.8, gain: 0.7, pan: panAt(OUT_MISS.x) },
  { id: 'splash', t: OUT_MISS.at, pitch: 0.9, gain: 0.6, pan: panAt(OUT_MISS.x) },
  { id: 'spotted', t: OUT_MISS.at + 0.02, pitch: 1.3, gain: 0.45, pan: 0.1 },
];
