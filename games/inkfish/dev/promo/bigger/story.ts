import type { SfxId } from '../../../src/audio/recipes';
import { mouthOf, NOSE, type Pose } from '../chain';
import { suckedIn } from '../effects';
import { lerp, ramp, smooth, window01 } from '../short';

/**
 * "There's always a bigger fish": Florida, 2014, a fisherman hooks a reef
 * shark and a goliath grouper swallows it whole. Every beat is a function
 * of time, in seconds, over a loop of LOOP_S.
 *
 *   0     the shark bites the hook and thrashes on the line
 *   1.2   a huge shape rises from the dark below
 *   2.9   the shark spots it: "!"
 *   4.35  the grouper gapes, water rushes in, the shark is dragged in
 *   5.55  gulp: eyes squeezed shut, then closed happily, a lump going down
 *   6.55  the hook rips free and springs back, empty
 *   6.0+  the grouper sinks away into the dark with its lump
 *   10.6  a new shark charges in and bites the empty hook...
 *   12    ...which is where the loop began.
 *
 * The hook is tracked by its bend, the point that sits in a mouth.
 */
export const LOOP_S = 12;

export const SHARK_LEN = 410;
export const GROUPER_LEN = 900;
/** Where the empty hook hangs at rest (its bend), and where the line comes down from (off the top). */
export const HOOK_REST = { x: 760, y: 820 } as const;
export const LINE_TOP = { x: 700, y: -60 } as const;
/** Hook from its eye (where the line ties on) to its bend, px. */
export const HOOK_LEN = 58;

export const SPOT_AT = 2.9;
const RISE_FROM = 1.2;
const RISE_TO = 4.8;
const OPEN_FROM = 4.35;
const OPEN_FULL = 4.85;
export const SWALLOW_FROM = 5.0;
export const GULP_AT = 5.55;
const SNAP_LEN = 0.04;
const CHEWS = [{ at: 5.85, size: 0.22 }, { at: 6.2, size: 0.15 }] as const;
const CHEW_LEN = 0.18;
export const PING_AT = 6.55;
const LEAVE_FROM = 6.0;
const LEAVE_TO = 10.3;
export const APPROACH_FROM = 10.6;

/** The shark's nose-up tilt as it reaches the hook, and as the line hauls its head up. */
const BITE_TILT = 0.12;
const HAUL_TILT = 0.38;

const pose = (shape: 'shark' | 'grouper', x: number, y: number, length: number, facing: 1 | -1, tilt: number, beat: number, effort: number): Pose =>
  ({ j: 0, shape, age: 0, x, y, length, facing, tilt, beat, effort });

/** A body centre that puts the mouth of a fish `length` long, facing and tilted so, at `mouth`. */
function centreFor(mouth: { x: number; y: number }, length: number, facing: 1 | -1, tilt: number): { x: number; y: number } {
  return { x: mouth.x - facing * Math.cos(tilt) * NOSE * length, y: mouth.y + Math.sin(tilt) * NOSE * length };
}

// ---------------------------------------------------------------- the shark

/** How frantic the shark is: thrashing on the line, harder once it has seen the grouper. */
export function panic(t: number): number {
  return t < SPOT_AT ? 0 : Math.min(1, 0.5 + 0.5 * smooth((t - SPOT_AT) / 0.1));
}

/** The "!" over the shark: 0 hidden .. 1, overshooting as it pops. */
export function alarm(t: number): number {
  if (t < SPOT_AT || t >= SWALLOW_FROM) return 0;
  const u = (t - SPOT_AT) / 0.12;
  return u < 1 ? smooth(u) * 1.25 : 1 + 0.25 * Math.max(0, 1 - (u - 1) * 2);
}

/** The hooked shark's mouth (the hook's bend), reeled slowly up and jerked about by the thrashing. */
function hookedMouth(t: number): { x: number; y: number } {
  const settle = ramp(t, 0, 0.3);
  const fury = 1 + 0.6 * panic(t);
  return {
    x: HOOK_REST.x + 14 * fury * settle * Math.sin(2 * Math.PI * 1.6 * t),
    y: HOOK_REST.y - 70 * smooth(t / 4.6) + 8 * fury * settle * Math.sin(2 * Math.PI * 2.3 * t),
  };
}

/** The shark on the line, before it is swallowed. */
function hookedShark(t: number): Pose {
  const fury = 1 + panic(t);
  const tilt = lerp(BITE_TILT, HAUL_TILT, ramp(t, 0, 0.35)) + 0.13 * fury * ramp(t, 0, 0.3) * Math.sin(2 * Math.PI * 2.1 * t);
  const beat = 2 * Math.PI * (3.2 * t + 2 * Math.max(0, t - SPOT_AT));
  const c = centreFor(hookedMouth(t), SHARK_LEN, -1, tilt);
  return pose('shark', c.x, c.y, SHARK_LEN, -1, tilt, beat, 1);
}

/** The next shark, charging in from the right to bite the empty hook as the loop comes round. */
function arrivingShark(t: number): Pose {
  const u = (t - APPROACH_FROM) / (LOOP_S - APPROACH_FROM);
  const go = 1 - (1 - u) ** 1.6;
  const mouth = { x: lerp(HOOK_REST.x + 640, HOOK_REST.x, go), y: lerp(HOOK_REST.y + 60, HOOK_REST.y, go) + 10 * Math.sin(Math.PI * u) };
  const c = centreFor(mouth, SHARK_LEN, -1, BITE_TILT);
  // Beat phase and tilt land exactly where the hooked shark's start.
  return pose('shark', c.x, c.y, SHARK_LEN, -1, BITE_TILT, 2 * Math.PI * 2.6 * (t - LOOP_S), lerp(0.8, 1, u));
}

/** The arriving shark's jaw: open for the bite, shut on the hook at the loop point. */
export function sharkJaw(t: number): number {
  if (t < LOOP_S - 0.45) return 0;
  if (t < LOOP_S - 0.1) return 0.55 * ramp(t, LOOP_S - 0.45, LOOP_S - 0.2);
  return 0.55 * (1 - ramp(t, LOOP_S - 0.1, LOOP_S));
}

export type SharkState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly pose: Pose }
  | { readonly kind: 'swallowed'; readonly pose: Pose; readonly stretch: number; readonly squash: number };

export function sharkAt(t: number): SharkState {
  if (t >= APPROACH_FROM) return { kind: 'swimming', pose: arrivingShark(t) };
  if (t < SWALLOW_FROM) return { kind: 'swimming', pose: hookedShark(t) };
  if (t >= GULP_AT) return { kind: 'gone' };
  const [inMouth, look] = suckedIn(hookedShark(t), grouperAt(t), (t - SWALLOW_FROM) / (GULP_AT - SWALLOW_FROM));
  return { kind: 'swallowed', pose: inMouth, ...look };
}

// ---------------------------------------------------------------- the grouper

const RISE_START = { x: -120, y: 2500, tilt: 0.8 };
const RISE_BEND = { x: 120, y: 1380 };
const LURK = { x: 300, y: 985, tilt: 0.28 };
/** How far it surges forwards, along its heading, as it sucks the shark in. */
const LUNGE = 60;
const EXIT = { x: 1600, y: 2600, tilt: -0.5 };

/** The grouper is in the picture over [RISE_FROM, LEAVE_TO]. */
export const grouperVisible = (t: number): boolean => t >= RISE_FROM && t <= LEAVE_TO;

/** Where the grouper is: rising from the dark, lurking, lunging, then sinking away. */
export function grouperAt(t: number): Pose {
  const lunge = LUNGE * ramp(t, RISE_TO, GULP_AT);
  const surge = { x: Math.cos(LURK.tilt) * lunge, y: -Math.sin(LURK.tilt) * lunge };
  if (t < RISE_TO) {
    // Fast out of the deep, slowing as it closes in: menace.
    const s = Math.max(0, (t - RISE_FROM) / (RISE_TO - RISE_FROM));
    const u = 1 - (1 - s) ** 1.9;
    const a = (1 - u) ** 2;
    const b = 2 * u * (1 - u);
    const c = u * u;
    return pose('grouper', a * RISE_START.x + b * RISE_BEND.x + c * LURK.x, a * RISE_START.y + b * RISE_BEND.y + c * LURK.y,
      GROUPER_LEN, 1, lerp(RISE_START.tilt, LURK.tilt, smooth(s)), 2 * Math.PI * 1.1 * t, 0.5);
  }
  const fed = { x: LURK.x + surge.x, y: LURK.y + surge.y };
  if (t < LEAVE_FROM) {
    return pose('grouper', fed.x, fed.y, GROUPER_LEN, 1, LURK.tilt, 2 * Math.PI * (1.1 * t + 0.6 * ramp(t, RISE_TO, GULP_AT)), lerp(0.5, 1, ramp(t, RISE_TO, SWALLOW_FROM)));
  }
  const u = ((t - LEAVE_FROM) / (LEAVE_TO - LEAVE_FROM)) ** 1.6;
  return pose('grouper', lerp(fed.x, EXIT.x, u), lerp(fed.y, EXIT.y, u), GROUPER_LEN, 1, lerp(LURK.tilt, EXIT.tilt, ramp(t, LEAVE_FROM, LEAVE_FROM + 1.2)),
    2 * Math.PI * (1.1 * t + 0.6), 0.6);
}

/** How far the grouper's jaw hangs open, 0 shut .. 1 gaping. */
export function grouperJaw(t: number): number {
  if (t >= OPEN_FROM && t < GULP_AT) return ramp(t, OPEN_FROM, OPEN_FULL);
  if (t >= GULP_AT && t < GULP_AT + SNAP_LEN) return 1 - ramp(t, GULP_AT, GULP_AT + SNAP_LEN);
  let open = 0;
  for (const c of CHEWS) {
    if (t > c.at && t < c.at + CHEW_LEN) open = Math.max(open, c.size * Math.sin((Math.PI * (t - c.at)) / CHEW_LEN));
  }
  return open;
}

/** Water rushing into the open mouth, 0 .. 1. */
export function suction(t: number): number {
  return t >= OPEN_FROM && t < GULP_AT ? ramp(t, OPEN_FROM, OPEN_FULL + 0.1) : 0;
}

/** The whole fish jolting as its jaw snaps shut. */
export function snap(t: number): number {
  return t > GULP_AT - 0.02 && t < GULP_AT + 0.12 ? Math.sin((Math.PI * (t - GULP_AT + 0.02)) / 0.14) : 0;
}

export function grouperEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= GULP_AT - 0.01 && t < GULP_AT + 0.3) return 'squeeze';
  if (t >= GULP_AT + 0.3 && t < 7.8) return 'happy';
  return null;
}

/** The shark going down: a lump puffing the cheeks, then settling in the belly, where it stays as the grouper leaves. */
export function grouperLump(t: number): { readonly size: number; readonly at: number } {
  if (t < GULP_AT) return { size: 0, at: 0.2 };
  const size = Math.min(1, (t - GULP_AT) / 0.1) * lerp(1, 0.8, ramp(t, GULP_AT + 0.1, 7.2));
  return { size, at: lerp(0.18, 0.55, ramp(t, GULP_AT, 7.4)) };
}

/** Camera shake from the gulp, px. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const since = t - GULP_AT;
  if (since < 0 || since > 0.35) return { x: 0, y: 0 };
  const amp = 18 * (1 - since / 0.35) ** 2;
  return { x: amp * Math.sin(since * 120), y: amp * 0.7 * Math.cos(since * 150) };
}

/** How far the dark of the deep still hides the grouper, 0 .. 1, from how deep in the frame it is. */
export const murk = (p: Pose): number => Math.max(0, Math.min(1, (p.y - 1250) / 700));

// ---------------------------------------------------------------- the hook and line

/** A point given in a fish's own frame (forwards, downwards; px) on screen. */
function fromBody(p: Pose, forward: number, down: number): { x: number; y: number } {
  const cos = Math.cos(p.tilt);
  const sin = Math.sin(p.tilt);
  return { x: p.x + p.facing * (forward * cos + down * sin), y: p.y - forward * sin + down * cos };
}

/** The inverse of fromBody. */
function toBody(p: Pose, at: { x: number; y: number }): { forward: number; down: number } {
  const cos = Math.cos(p.tilt);
  const sin = Math.sin(p.tilt);
  const dx = (at.x - p.x) * p.facing;
  const dy = at.y - p.y;
  return { forward: dx * cos - dy * sin, down: dx * sin + dy * cos };
}

/** Where the swallowed shark's mouth (and the hook in it) ends up, in the grouper's frame. */
const DOWN_THROAT = (() => {
  const shark = sharkAt(GULP_AT - 1e-9);
  return toBody(grouperAt(GULP_AT), mouthOf(shark.kind === 'gone' ? grouperAt(GULP_AT) : shark.pose));
})();

/** The swallowed hook: yanked by the line from down the grouper's throat to just inside its lips, where it tears free. */
function inGrouper(t: number): { x: number; y: number } {
  const g = grouperAt(t);
  const u = ramp(t, GULP_AT + 0.1, PING_AT);
  return fromBody(g, lerp(DOWN_THROAT.forward, (NOSE - 0.04) * g.length, u), lerp(DOWN_THROAT.down, 0, u));
}

/** The hook's bend: in the shark's mouth, then the grouper's, then ripped free and swinging back to rest. */
export function hookAt(t: number): { readonly x: number; readonly y: number } {
  if (t < SWALLOW_FROM) return hookedMouth(t);
  if (t < GULP_AT) {
    const shark = sharkAt(t);
    return shark.kind === 'swallowed' ? mouthOf(shark.pose) : inGrouper(t);
  }
  if (t < PING_AT) return inGrouper(t);
  // Free: springs back from where it tore loose, swings, and settles exactly at rest for the next bite.
  const from = inGrouper(PING_AT);
  const tau = Math.max(0, t - PING_AT);
  const decay = Math.exp(-2.2 * tau);
  const sway = 12 * Math.sin((2 * Math.PI * tau) / 2.2) * Math.exp(-0.35 * tau);
  const settle = ramp(t, 10.8, 11.9);
  return {
    x: lerp(HOOK_REST.x + (from.x - HOOK_REST.x) * decay * Math.cos(5 * tau) + sway, HOOK_REST.x, settle),
    y: lerp(HOOK_REST.y + (from.y - HOOK_REST.y) * decay * Math.cos(4 * tau), HOOK_REST.y, settle),
  };
}

/** The line's sideways bow at its middle, px: a hum while taut, a big slack loop after the hook tears free. */
export function lineBow(t: number): number {
  if (t < PING_AT || t >= LOOP_S) return 3 * Math.sin(2 * Math.PI * 9 * t) * (t < GULP_AT ? 1 : 0.5);
  const tau = t - PING_AT;
  return (110 * Math.exp(-1.2 * tau) * Math.cos(3 * tau) + 15) * (1 - ramp(t, 10.8, 11.9));
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

const OPENING = { from: -0.45, to: 4.3 };
export const CAPTIONS: readonly Caption[] = [
  { text: 'Florida, 2014.', y: 330, size: 100, ...OPENING },
  { text: 'A fisherman hooks a shark…', y: 430, size: 84, ...OPENING },
  { text: 'This really happened.', y: 370, size: 100, from: 7.3, to: 9.45 },
  { text: 'there’s always', y: 330, size: 112, from: 9.55, to: 11.6 },
  { text: 'a bigger fish', y: 445, size: 112, from: 9.55, to: 11.6 },
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

const reelClicks = (from: number, to: number, every: number): SoundCue[] =>
  Array.from({ length: Math.floor((to - from) / every) }, (_, i) => ({ id: 'click' as const, t: from + i * every, pitch: 1, gain: 0.25 + 0.1 * (i % 2), pan: -0.1 }));

export const SOUNDS: readonly SoundCue[] = [
  // The bite on the hook, then the reel ratcheting as the fisherman hauls.
  { id: 'hooked', t: 0, pitch: 1, gain: 0.9, pan: 0.2 },
  ...reelClicks(0.45, 4.4, 0.11),
  { id: 'dash', t: 0.05, pitch: 0.8, gain: 0.35, pan: 0.25 },
  { id: 'dash', t: 1.3, pitch: 0.75, gain: 0.25, pan: 0.25 },
  // Something huge coming up from below.
  { id: 'lunge', t: 1.7, pitch: 0.5, gain: 0.45, pan: -0.3 },
  { id: 'spotted', t: SPOT_AT, pitch: 1.3, gain: 0.5, pan: 0.25 },
  { id: 'dash', t: SPOT_AT + 0.1, pitch: 0.9, gain: 0.4, pan: 0.25 },
  { id: 'suck', t: OPEN_FROM - 0.05, pitch: 0.6, gain: 0.7, pan: -0.1 },
  { id: 'lunge', t: SWALLOW_FROM - 0.05, pitch: 0.55, gain: 0.9, pan: -0.1 },
  // The gulp.
  { id: 'eatBig', t: GULP_AT, pitch: 0.5, gain: 1, pan: 0 },
  { id: 'hurt', t: GULP_AT, pitch: 0.45, gain: 0.4, pan: 0 },
  { id: 'boom', t: GULP_AT, pitch: 1, gain: 0.25, pan: 0 },
  ...CHEWS.map((c, i): SoundCue => ({ id: 'eat', t: c.at + 0.03, pitch: 0.45, gain: 0.5 - i * 0.12, pan: -0.1 })),
  { id: 'drop', t: GULP_AT + 0.12, pitch: 0.9, gain: 0.25, pan: -0.1 },
  { id: 'drop', t: GULP_AT + 0.22, pitch: 1.2, gain: 0.18, pan: -0.15 },
  // The hook tears free and twangs back.
  { id: 'free', t: PING_AT, pitch: 1.5, gain: 0.35, pan: 0.15 },
  { id: 'clang', t: PING_AT, pitch: 1.6, gain: 0.12, pan: 0.15 },
  // The next shark charges in.
  { id: 'dash', t: APPROACH_FROM + 0.2, pitch: 0.85, gain: 0.45, pan: 0.6 },
  { id: 'lunge', t: LOOP_S - 0.3, pitch: 0.9, gain: 0.35, pan: 0.3 },
];
