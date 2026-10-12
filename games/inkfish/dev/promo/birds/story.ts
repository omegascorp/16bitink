import type { SfxId } from '../../../src/audio/recipes';
import { createRng } from '../../../src/logic/rng';
import { mouthOf, NOSE, type Pose } from '../chain';
import { clamp01, curveAt, lerp, ramp, window01 } from '../short';

/**
 * "Some fish eat birds": in the Seychelles, giant trevally leap clean out of
 * the sea to snatch young terns flying low over it (filmed for Blue Planet
 * II). Every beat is a function of time, in seconds, over a loop of LOOP_S.
 *
 *   0     a young tern flutters in low over the sea, past the island
 *   0.8   a dark shape slides in under the water and shadows it from below
 *   3.0   the tern glides, dropping lower over the water
 *   4.4   it spots the shape: "!"
 *   4.6   the trevally charges, mouth open, and bursts out of the sea
 *   5.0   it takes the tern in mid-air; feathers fly
 *   5.6   it dives back in with a splash and sinks away into the deep
 *   9.6   a new tern flutters in from the left...
 *   12    ...which is where the loop began.
 *
 * The game's own drawings: its jack (the trevally is one) and its tern.
 */
export const LOOP_S = 12;

/** The waterline, px from the top of the video. */
export const SURFACE_Y = 880;
export const JACK_LEN = 480;
/** Screen px per px of the game's bird drawing (art/birdArt.ts, BIRD_TEX). */
export const TERN_SCALE = 4;

/** When the next tern flies in: its age is 0 here, and the loop's tern is that much older at t = 0. */
export const TERN_ENTER = 9.6;
const AGE_AT_START = LOOP_S - TERN_ENTER;
export const SPOT_AT = 4.4;
export const GRAB_AT = 5.0;
export const GULP_AT = 5.1;
const RISE_FROM = 0.8;
const GONE_AT = 8.4;
const OPEN_FROM = 4.6;
const OPEN_FULL = 4.9;
const CHEWS = [{ at: GULP_AT + 0.3, size: 0.18 }, { at: GULP_AT + 0.6, size: 0.12 }] as const;
const CHEW_LEN = 0.16;
/** The tern stops flapping and glides low over the water over these ages. */
const GLIDE = { from: 5.4, to: 6.6 } as const;

interface Pt { readonly x: number; readonly y: number }

// ---------------------------------------------------------------- the tern

export interface TernPose {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** The bird drawing's wing frame: 0 up, 1 level, 2 down. */
  readonly frame: 0 | 1 | 2;
  /** Size, 1 is TERN_SCALE. */
  readonly scale: number;
}

export type TernState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'flying'; readonly pose: TernPose }
  | { readonly kind: 'taken'; readonly pose: TernPose };

const FLAP_CYCLE = [0, 1, 2, 1] as const;
const FLAP_HZ = 3.2;
/** Flapping for its life once it has seen the trevally. */
const PANIC_HZ = 5.5;

/** A tern's flight path by age (s since it flew in): in from the left, sinking lower over the water as it goes, bobbing on each wingbeat. */
export function flight(age: number): Pt {
  return { x: -180 + 110 * age, y: 600 + 190 * ramp(age, 3, 7) + 12 * Math.sin(Math.PI * age) };
}

function flyingTern(age: number, t: number, panicking: boolean): TernPose {
  const at = flight(age);
  const ahead = flight(age + 0.01);
  // Nose down a little as it sinks, up as it climbs.
  const tilt = -0.7 * Math.atan2(ahead.y - at.y, ahead.x - at.x);
  const gliding = !panicking && age >= GLIDE.from && age < GLIDE.to;
  const beat = panicking ? Math.floor((t - SPOT_AT) * PANIC_HZ * 4) : Math.floor(age * FLAP_HZ * 4);
  const frame = gliding ? 1 : FLAP_CYCLE[((beat % 4) + 4) % 4]!;
  return { ...at, tilt, frame, scale: 1 };
}

/** The tern: the loop's own until it is eaten, then the next one flying in. */
export function ternAt(t: number): TernState {
  if (t >= TERN_ENTER) return { kind: 'flying', pose: flyingTern(t - TERN_ENTER, t, false) };
  if (t < GRAB_AT) return { kind: 'flying', pose: flyingTern(t + AGE_AT_START, t, t >= SPOT_AT) };
  if (t >= GULP_AT) return { kind: 'gone' };
  // Taken: pulled from the lips into the throat, shrinking into the dark.
  const jack = jackAt(t);
  const u = (t - GRAB_AT) / (GULP_AT - GRAB_AT);
  const lips = mouthOf(jack);
  const throat = { x: jack.x + jack.facing * Math.cos(jack.tilt) * 0.2 * jack.length, y: jack.y - Math.sin(jack.tilt) * 0.2 * jack.length };
  const e = u ** 1.7;
  return { kind: 'taken', pose: { x: lerp(lips.x, throat.x, e), y: lerp(lips.y, throat.y, e), tilt: jack.tilt, frame: 1, scale: 1 - 0.5 * e } };
}

/** The "!" over the tern: 0 hidden .. 1, overshooting as it pops. */
export function alarm(t: number): number {
  if (t < SPOT_AT || t >= GRAB_AT) return 0;
  const u = (t - SPOT_AT) / 0.12;
  return u < 1 ? (u * u * (3 - 2 * u)) * 1.25 : 1 + 0.25 * Math.max(0, 1 - (u - 1) * 2);
}

// ---------------------------------------------------------------- the trevally

/**
 * Where the trevally's body is at key moments, and optionally which way and
 * how fast it is going there (px/s); it swims a smooth curve through them
 * (see curveAt), heading the way it goes.
 */
interface Key { readonly t: number; readonly x: number; readonly y: number; readonly v?: Pt }

/** Where the tern is when the trevally's mouth meets it. */
export const GRAB_POINT = flight(GRAB_AT + AGE_AT_START);
/** The trevally's heading as it takes the tern: nose up, mid-leap. */
const GRAB_TILT = 0.95;
const heading = (tilt: number, speed: number): Pt => ({ x: Math.cos(tilt) * speed, y: -Math.sin(tilt) * speed });

const KEYS: readonly Key[] = [
  // In from off the left, deep enough to be just a shadow...
  { t: RISE_FROM, x: -520, y: 1300 },
  // ...levelling off just under the surface, to shadow the tern from behind and below...
  { t: 2.6, x: 40, y: 1170, v: { x: 160, y: -20 } },
  { t: 4.2, x: 250, y: 1130, v: { x: 150, y: 0 } },
  // ...then up through the surface, its mouth meeting the tern...
  { t: GRAB_AT, x: GRAB_POINT.x - Math.cos(GRAB_TILT) * NOSE * JACK_LEN, y: GRAB_POINT.y + Math.sin(GRAB_TILT) * NOSE * JACK_LEN, v: heading(GRAB_TILT, 520) },
  // ...over the top of its leap, back into the sea nose first, and away down into the dark.
  { t: 5.3, x: 650, y: 790, v: { x: 400, y: 110 } },
  { t: 5.7, x: 820, y: 990, v: { x: 250, y: 420 } },
  { t: 6.6, x: 1000, y: 1250 },
  { t: GONE_AT, x: 1300, y: 2250 },
];

const X_KEYS = KEYS.map((k) => ({ t: k.t, at: k.x, rate: k.v?.x }));
const Y_KEYS = KEYS.map((k) => ({ t: k.t, at: k.y, rate: k.v?.y }));

/** The body's position and velocity (px/s) at time t, held at the ends. */
export function track(t: number): { readonly at: Pt; readonly v: Pt } {
  const x = curveAt(X_KEYS, t);
  const y = curveAt(Y_KEYS, t);
  return { at: { x: x.at, y: y.at }, v: { x: x.rate, y: y.rate } };
}

/** The trevally is in the picture over [RISE_FROM, GONE_AT]: off the edge at both ends. */
export const jackVisible = (t: number): boolean => t >= RISE_FROM && t <= GONE_AT;

/** The trevally on its track, heading the way it is going. */
export function jackAt(t: number): Pose {
  const { at, v } = track(t);
  const tilt = Math.max(-1.25, Math.min(1.25, Math.atan2(-v.y, v.x)));
  const { x, y } = at;
  // A slow cruise, beating hard through the charge and the leap.
  const beat = 2 * Math.PI * (1.3 * t + 2 * Math.max(0, Math.min(t, 5.8) - SPOT_AT));
  const effort = lerp(0.45, 1, ramp(t, 4.3, 4.7)) * (1 - 0.45 * ramp(t, 6, 7));
  return { j: 0, shape: 'jack', age: 0, x, y, length: JACK_LEN, facing: 1, tilt, beat, effort };
}

/** How far the water still hides the trevally, 0 .. 1: a dark shape while it lurks, clear in the air. */
export const murk = (p: Pose): number => clamp01((p.y - 940) / 200);

/** How far its jaw hangs open, 0 shut .. 1 gaping. */
export function jackJaw(t: number): number {
  if (t >= OPEN_FROM && t < GULP_AT) return ramp(t, OPEN_FROM, OPEN_FULL);
  if (t >= GULP_AT && t < GULP_AT + 0.04) return 1 - ramp(t, GULP_AT, GULP_AT + 0.04);
  let open = 0;
  for (const c of CHEWS) {
    if (t > c.at && t < c.at + CHEW_LEN) open = Math.max(open, c.size * Math.sin((Math.PI * (t - c.at)) / CHEW_LEN));
  }
  return open;
}

/** The whole fish jolting as its jaw snaps shut. */
export function snap(t: number): number {
  return t > GULP_AT - 0.02 && t < GULP_AT + 0.12 ? Math.sin((Math.PI * (t - GULP_AT + 0.02)) / 0.14) : 0;
}

export function jackEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= GULP_AT && t < GULP_AT + 0.3) return 'squeeze';
  if (t >= GULP_AT + 0.3 && t < 6.6) return 'happy';
  return null;
}

/** Camera shake from the snap, px. */
export function shake(t: number): Pt {
  const since = t - GULP_AT;
  if (since < 0 || since > 0.3) return { x: 0, y: 0 };
  const amp = 12 * (1 - since / 0.3) ** 2;
  return { x: amp * Math.sin(since * 120), y: amp * 0.7 * Math.cos(since * 150) };
}

// ---------------------------------------------------------------- splashes, ripples and feathers

/** When the trevally's mouth crosses the waterline between `from` and `to` (it does so once there). */
function crossing(from: number, to: number): number {
  let lo = from;
  let hi = to;
  const below = (t: number): boolean => mouthOf(jackAt(t)).y > SURFACE_Y;
  const startsBelow = below(lo);
  for (let n = 0; n < 40; n++) {
    const mid = (lo + hi) / 2;
    if (below(mid) === startsBelow) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Where and when the trevally breaks the surface on the way up, and goes back in. */
export const SPLASHES: readonly { readonly at: number; readonly x: number; readonly size: number }[] = [
  { at: crossing(4.2, GRAB_AT), size: 0.85 },
  { at: crossing(5.3, 6.6), size: 1.15 },
].map((s) => ({ ...s, x: mouthOf(jackAt(s.at)).x }));

/** Feathers knocked loose in the bite: how each flies out, rocks and settles. */
const FEATHERS = (() => {
  const rng = createRng(31);
  return Array.from({ length: 5 }, () => ({
    vx: (rng() - 0.5) * 520,
    vy: -180 - rng() * 300,
    sway: 0.5 + rng() * 0.4,
    phase: rng() * Math.PI * 2,
    fall: 95 + rng() * 40,
    size: 0.8 + rng() * 0.5,
  }));
})();
export const FEATHER_COUNT = FEATHERS.length;
const FEATHERS_FADE = { from: 9.8, to: 10.8 } as const;

export interface FeatherPose { readonly x: number; readonly y: number; readonly rotation: number; readonly size: number; readonly alpha: number }

/** Feather `i`: bursting from the trevally's mouth, see-sawing down, then floating on the water until it fades. */
export function featherAt(i: number, t: number): FeatherPose | null {
  const f = FEATHERS[i]!;
  const since = t - GULP_AT;
  if (since < 0 || t >= FEATHERS_FADE.to) return null;
  const from = mouthOf(jackAt(GULP_AT));
  const burst = 1 - Math.exp(-4 * since);
  const rock = Math.sin(2 * Math.PI * f.sway * since + f.phase);
  const x = from.x + (f.vx / 4) * burst + 26 * rock * ramp(since, 0.3, 1);
  const y = Math.min(SURFACE_Y - 4, from.y + (f.vy / 4) * burst + f.fall * Math.max(0, since - 0.25));
  const afloat = y >= SURFACE_Y - 4;
  return {
    x,
    y: afloat ? y + 3 * Math.sin(3 * since + f.phase) : y,
    rotation: afloat ? 0.15 * rock : 0.6 * rock,
    size: f.size,
    alpha: 1 - ramp(t, FEATHERS_FADE.from, FEATHERS_FADE.to),
  };
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
  { text: 'Seychelles.', y: 330, size: 100, ...OPENING },
  { text: 'A young tern skims the sea…', y: 430, size: 84, ...OPENING },
  { text: 'This really happened.', y: 370, size: 100, from: 6.9, to: 9.3 },
  { text: 'some fish', y: 330, size: 112, from: 9.45, to: 11.6 },
  { text: 'eat birds', y: 445, size: 112, from: 9.45, to: 11.6 },
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

const [EXIT, ENTRY] = SPLASHES as readonly [(typeof SPLASHES)[number], (typeof SPLASHES)[number]];
const panAt = (x: number): number => Math.max(-1, Math.min(1, (x - 540) / 540)) * 0.6;

export const SOUNDS: readonly SoundCue[] = [
  // The tern calling as it flies in (the next one's call lands at the same ages).
  { id: 'squawk', t: 0.9, pitch: 1.7, gain: 0.22, pan: -0.4 },
  { id: 'squawk', t: 2.6, pitch: 1.85, gain: 0.18, pan: -0.15 },
  { id: 'squawk', t: 11.0, pitch: 1.75, gain: 0.2, pan: -0.6 },
  // Something big coming up from below.
  { id: 'lunge', t: 1.3, pitch: 0.5, gain: 0.4, pan: -0.4 },
  { id: 'spotted', t: SPOT_AT, pitch: 1.3, gain: 0.5, pan: 0.1 },
  { id: 'squawk', t: SPOT_AT + 0.05, pitch: 2.1, gain: 0.45, pan: 0.1 },
  { id: 'lunge', t: OPEN_FROM - 0.05, pitch: 0.75, gain: 0.8, pan: 0 },
  { id: 'splash', t: EXIT.at, pitch: 0.85, gain: 0.65, pan: panAt(EXIT.x) },
  // The snatch.
  { id: 'eatBig', t: GULP_AT, pitch: 0.8, gain: 0.7, pan: 0.15 },
  { id: 'boom', t: GULP_AT, pitch: 1.2, gain: 0.15, pan: 0.15 },
  { id: 'rustle', t: GULP_AT + 0.04, pitch: 1.4, gain: 0.35, pan: 0.15 },
  ...CHEWS.map((c, i): SoundCue => ({ id: 'eat', t: c.at + 0.03, pitch: 0.7, gain: 0.4 - i * 0.1, pan: 0.2 })),
  { id: 'splash', t: ENTRY.at, pitch: 0.6, gain: 0.75, pan: panAt(ENTRY.x) },
  { id: 'drop', t: ENTRY.at + 0.25, pitch: 0.8, gain: 0.25, pan: panAt(ENTRY.x) },
  // Feathers settling on the water.
  { id: 'drop', t: 6.9, pitch: 1.7, gain: 0.1, pan: 0.1 },
  { id: 'drop', t: 7.5, pitch: 1.9, gain: 0.08, pan: 0.25 },
];
