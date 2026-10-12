import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, lerp, ramp, window01 } from '../short';
import { SNOUT_X } from './body';
import { dirToCamera, type FishPose, framed, looped, type V3, v3 } from './space';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish has the biggest teeth in the ocean, for its size": the common
 * fangtooth, told by a narrator (words.ts). Every beat is timed to the words,
 * a function of time in seconds over a loop of LOOP_S.
 *
 *   0     its face lunges at us, jaws gaping, the great lower fangs bared
 *   3.7   "The fangtooth is smaller than your hand": it turns side on as we pull back; a hand is drawn behind it
 *   5.8   "…but its fangs are so long…": X-ray. The jaw drops to show them, then shuts, slowly, and
 *         turning to face us we see each fang slide into its socket, one either side of the brain
 *   12.1  "Down in the dark, it can barely see": the light closes in, the world blurs, its tiny eye
 *   14.4  "So it hangs still, and snaps at anything that brushes past": a shrimp drifts by, the lateral
 *         line feels it, and SNAP
 *   18.2  "Tiny body, giant bite, because…": we pull back to the tiny fish; it turns and lunges at us,
 *   21    "…this fish has the biggest teeth…": where the loop began.
 *
 * The camera never moves: the fish is placed in front of it (space.ts), so
 * a "camera move" is the fish moving, and the lunge is real perspective.
 */
export const LOOP_S = 21;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" isn't in the voiceover`);
  return w.start / TEMPO;
}

export const PULL_FROM = said('The');
export const HAND_FROM = said('smaller');
export const XRAY_FROM = said('but');
export const FANGS_AT = said('fangs');
export const SHUT_FROM = said('shuts');
export const SOCKETS_AT = said('sockets');
export const BRAIN_AT = said('brain.');
export const DARK_FROM = said('Down');
export const BLIND_AT = said('barely');
export const STILL_FROM = said('So');
export const BRUSH_AT = said('brushes');
export const TINY_AT = said('Tiny');
export const GIANT_AT = said('giant');
/** The jaw has shut, the fangs home in their sockets. */
export const SHUT_AT = said('sockets') + 0.3;
/** The snap at the shrimp, as the narrator says it brushes past. */
export const SNAP_AT = said('past.') - 0.28;

// ---------------------------------------------------------------- the fish

/** Head-on, mouth wide: the opening shot. */
const HOOK = { yaw: 0.9, pitch: 0.15, fx: 4.6, fy: -1.8, dist: 12.5 } as const;
/** Side on, the whole fish, with the hand below it. */
const SIDE = { fx: -1.5, fy: -6.6, dist: 44 } as const;
/** The X-ray: the head close, at first a little turned, then nearly face on, from a little above. */
const XRAY_OPEN = { yaw: 0.42, pitch: 0, fx: 4.0, fy: -0.4, dist: 17, dx: -110 } as const;
const XRAY_FRONT = { yaw: 1.3, pitch: -0.15, fx: 4.6, fy: 1.0, dist: 11.5 } as const;
/** In the dark, and waiting: side on, a little left, leaving room for the shrimp. */
const WAIT = { fx: 0.6, fy: 0.3, dist: 34, dx: -150 } as const;
const TINY = { fx: -1.5, fy: 0.2, dist: 62 } as const;

const k = (t: number, at: number, rate?: number): { t: number; at: number; rate?: number } => (rate === undefined ? { t, at } : { t, at, rate });

const yawAt = looped([
  k(0, HOOK.yaw), k(PULL_FROM + 0.05, HOOK.yaw), k(PULL_FROM + 0.95, 0),
  k(XRAY_FROM + 0.1, 0), k(FANGS_AT + 0.6, XRAY_OPEN.yaw), k(SHUT_FROM + 0.5, XRAY_OPEN.yaw), k(SOCKETS_AT + 0.35, XRAY_FRONT.yaw), k(DARK_FROM, XRAY_FRONT.yaw),
  k(DARK_FROM + 0.9, 0), k(GIANT_AT, 0), k(GIANT_AT + 0.95, HOOK.yaw),
], LOOP_S);

const pitchAt = looped([
  k(0, HOOK.pitch), k(PULL_FROM + 0.05, HOOK.pitch), k(PULL_FROM + 0.95, 0),
  k(SHUT_FROM + 0.5, 0), k(SOCKETS_AT + 0.35, XRAY_FRONT.pitch), k(DARK_FROM, XRAY_FRONT.pitch),
  k(DARK_FROM + 0.9, 0), k(GIANT_AT, 0), k(GIANT_AT + 0.95, HOOK.pitch),
], LOOP_S);

/** Where the "camera" looks on the fish (model x, y) and from how far (log cm), and a nudge on screen (px). */
const fxAt = looped([
  k(0, HOOK.fx), k(PULL_FROM + 0.05, HOOK.fx), k(PULL_FROM + 1.0, SIDE.fx),
  k(XRAY_FROM, SIDE.fx), k(FANGS_AT + 0.4, XRAY_OPEN.fx), k(SHUT_FROM + 0.5, XRAY_OPEN.fx), k(SOCKETS_AT + 0.35, XRAY_FRONT.fx), k(DARK_FROM, XRAY_FRONT.fx),
  k(DARK_FROM + 1.0, WAIT.fx), k(TINY_AT, WAIT.fx), k(TINY_AT + 0.7, TINY.fx), k(GIANT_AT + 0.15, TINY.fx), k(GIANT_AT + 1.2, HOOK.fx),
], LOOP_S);
const fyAt = looped([
  k(0, HOOK.fy), k(PULL_FROM + 0.05, HOOK.fy), k(PULL_FROM + 1.0, SIDE.fy),
  k(XRAY_FROM, SIDE.fy), k(FANGS_AT + 0.4, XRAY_OPEN.fy), k(SHUT_FROM + 0.5, XRAY_OPEN.fy), k(SOCKETS_AT + 0.35, XRAY_FRONT.fy), k(DARK_FROM, XRAY_FRONT.fy),
  k(DARK_FROM + 1.0, WAIT.fy), k(TINY_AT, WAIT.fy), k(TINY_AT + 0.7, TINY.fy), k(GIANT_AT + 0.15, TINY.fy), k(GIANT_AT + 1.2, HOOK.fy),
], LOOP_S);
const dxAt = looped([
  k(0, 0), k(XRAY_FROM, 0), k(FANGS_AT + 0.4, XRAY_OPEN.dx), k(SHUT_FROM + 0.5, XRAY_OPEN.dx), k(SOCKETS_AT + 0.35, 0),
  k(DARK_FROM, 0), k(DARK_FROM + 1.0, WAIT.dx), k(TINY_AT, WAIT.dx), k(TINY_AT + 0.7, 0),
], LOOP_S);

/**
 * The lunge: the fish comes at the camera from far off (tiny), fast through
 * the loop point, and pulls up close with its jaws gaping.
 */
const LUNGE_RATE = -1.5;
const LUNGE_SEAM = Math.log(17.7);
const logDistAt = looped([
  k(0, LUNGE_SEAM, LUNGE_RATE), k(0.7, Math.log(HOOK.dist)), k(PULL_FROM, Math.log(HOOK.dist - 0.6)), k(PULL_FROM + 1.0, Math.log(SIDE.dist)),
  k(XRAY_FROM, Math.log(SIDE.dist)), k(FANGS_AT + 0.4, Math.log(XRAY_OPEN.dist)), k(SHUT_FROM + 0.5, Math.log(XRAY_OPEN.dist)),
  k(SOCKETS_AT + 0.35, Math.log(XRAY_FRONT.dist)), k(DARK_FROM, Math.log(XRAY_FRONT.dist - 0.4)),
  k(DARK_FROM + 1.0, Math.log(WAIT.dist)), k(TINY_AT, Math.log(WAIT.dist + 1)), k(TINY_AT + 0.75, Math.log(TINY.dist)), k(GIANT_AT + 0.2, Math.log(TINY.dist)),
], LOOP_S);

/** How fast the fish grows on screen (per second, log scale): positive as it comes at us. For the snow's streaks. */
export function scaleRateAt(t: number): number {
  const dt = 1 / 120;
  return -(logDistAt(t + dt) - logDistAt(t - dt)) / (2 * dt);
}

/** How wide the jaw is open, without the snap: gaping in the hook, shut while it waits. */
const jawKeyed = looped([
  k(0, 1), k(PULL_FROM + 0.1, 1), k(PULL_FROM + 0.9, 0.08),
  k(FANGS_AT, 0.08), k(FANGS_AT + 0.7, 1), k(SHUT_FROM, 1), k(SHUT_AT, 0),
  k(DARK_FROM + 0.5, 0), k(DARK_FROM + 1.2, 0.1), k(GIANT_AT + 0.1, 0.1), k(GIANT_AT + 0.9, 1),
], LOOP_S);

/** The snap: the jaw flies open, then slams shut on the shrimp, and it chews twice. */
const SNAP_OPEN = 0.13;
function snapJaw(t: number): number | null {
  const u = t - SNAP_AT;
  if (u < -SNAP_OPEN - 0.05 || u > 0.7) return null;
  if (u < 0) return lerp(0.1, 1, ramp(u, -SNAP_OPEN, -0.02));
  if (u < 0.06) return lerp(1, 0, ramp(u, 0, 0.06));
  // Two chews, then back to resting just open.
  const chew = 0.18 * Math.max(0, Math.sin(((u - 0.06) / 0.32) * Math.PI)) * (u < 0.38 ? 1 : 0.6);
  return chew + 0.1 * ramp(u, 0.4, 0.7);
}

/** How much the opening shot is on: 1 from the lunge through the loop point to the pull-back. */
export function hookness(t: number): number {
  return t < LOOP_S / 2 ? 1 - ramp(t, PULL_FROM - 0.2, PULL_FROM + 0.3) : ramp(t, GIANT_AT + 0.6, GIANT_AT + 1.2);
}

/** In the opening shot the jaw works a little, as if breathing, menacing. A whole number of breaths per loop. */
const BREATHS = 7;
export function jawAt(t: number): number {
  const breath = 0.09 * hookness(t) * (0.5 + 0.5 * Math.sin((2 * Math.PI * BREATHS * t) / LOOP_S));
  return snapJaw(t) ?? clamp01(jawKeyed(t) - breath);
}

/** How far forward the fish darts at the snap (cm along its body): a cock back, a strike, a slow drift back. */
export function dartAt(t: number): number {
  const u = t - SNAP_AT;
  if (u < -0.6 || u > 1.6) return 0;
  if (u < -0.08) return -0.35 * ramp(u, -0.6, -0.12);
  if (u < 0.05) return lerp(-0.35, 1.6, ramp(u, -0.08, 0.05));
  return 1.6 * (1 - ramp(u, 0.25, 1.6));
}

/** Its tail barely moving while it hangs still, harder when it lunges or strikes. */
const swayKeyed = looped([k(0, 0.6), k(0.7, 0.25), k(SNAP_AT - 0.2, 0.2), k(SNAP_AT, 0.7), k(SNAP_AT + 0.8, 0.2), k(GIANT_AT + 0.2, 0.25), k(GIANT_AT + 1.0, 0.6)], LOOP_S);
const BEATS = 12;
const FLUTTERS = 21;
const BOBS = 5;

const SWAYS = 4;

export function fishAt(t: number): FishPose {
  const yaw = yawAt(t) + 0.07 * hookness(t) * Math.sin((2 * Math.PI * SWAYS * t) / LOOP_S);
  const pitch = pitchAt(t);
  const at = framed(v3(fxAt(t), fyAt(t), 0), Math.exp(logDistAt(t)), dxAt(t), 0, yaw, pitch);
  const pose: FishPose = {
    ...at,
    yaw,
    pitch,
    jaw: jawAt(t),
    beat: (2 * Math.PI * BEATS * t) / LOOP_S,
    sway: swayKeyed(t),
    flutter: (2 * Math.PI * FLUTTERS * t) / LOOP_S,
  };
  const ahead = dirToCamera(pose, v3(1, 0, 0));
  const dart = dartAt(t);
  const bob = 0.12 * Math.sin((2 * Math.PI * BOBS * t) / LOOP_S);
  return { ...pose, x: pose.x + ahead.x * dart, y: pose.y + ahead.y * dart + bob, z: pose.z + ahead.z * dart };
}

/** Where the fish would be without its dart: the frame the shrimp drifts in. */
export function restAt(t: number): FishPose {
  const pose = fishAt(t);
  const ahead = dirToCamera(pose, v3(1, 0, 0));
  const dart = dartAt(t);
  return { ...pose, x: pose.x - ahead.x * dart, y: pose.y - ahead.y * dart, z: pose.z - ahead.z * dart };
}

// ---------------------------------------------------------------- the X-ray

export const xrayAt = (t: number): number => window01(t, XRAY_FROM + 0.05, DARK_FROM + 0.55, 0.45);
export const fangGlow = (t: number): number => window01(t, FANGS_AT, SHUT_AT + 0.6, 0.3);
export const socketGlow = (t: number): number => window01(t, SOCKETS_AT - 0.15, DARK_FROM, 0.3);
export const brainGlow = (t: number): number => window01(t, BRAIN_AT - 0.1, DARK_FROM, 0.3);

// ---------------------------------------------------------------- the hand, the dark, the eye

/** The hand behind the fish: drawn in over "smaller than your hand", gone by the X-ray. */
export const handDrawn = (t: number): number => ramp(t, HAND_FROM - 0.25, HAND_FROM + 0.75);
export const handShown = (t: number): number => window01(t, HAND_FROM - 0.3, XRAY_FROM + 0.35, 0.3);
/** How dark it closes in: a little always, a lot down in the dark. */
export const darkAt = looped([k(0, 0.25), k(DARK_FROM, 0.25), k(DARK_FROM + 1.0, 0.85), k(TINY_AT, 0.75), k(GIANT_AT + 0.6, 0.25)], LOOP_S);
/** "It can barely see": the world blurs, 0 .. 1. */
export const blurAt = (t: number): number => window01(t, BLIND_AT - 0.1, STILL_FROM + 0.25, 0.35);
/** Its eye, 1 normal .. 0 dim. */
export const eyeAt = (t: number): number => 1 - 0.7 * window01(t, DARK_FROM + 0.3, STILL_FROM + 0.4, 0.4);

// ---------------------------------------------------------------- the shrimp

/** The shrimp's path, in the fish's frame (model cm, ignoring its dart): drifting down past its face. */
const PREY_FROM = STILL_FROM + 0.1;
const preyX = looped([k(0, 16), k(PREY_FROM, 16), k(BRUSH_AT - 0.4, 9.6, -1.4), k(SNAP_AT, SNOUT_X + 1.55, -1.0), k(SNAP_AT + 0.4, SNOUT_X + 1.3), k(TINY_AT, 16)], LOOP_S);
const preyY = looped([k(0, 7), k(PREY_FROM, 7), k(BRUSH_AT - 0.4, 2.9, -2.2), k(SNAP_AT, 0.45, -1.6), k(SNAP_AT + 0.4, 0.2), k(TINY_AT, 7)], LOOP_S);

export interface Prey {
  /** Where it is in the fish's frame (model cm). */
  readonly at: V3;
  /** Which way it swims (radians on screen, 0 right), and its tail flick phase. */
  readonly heading: number;
  readonly flick: number;
}

/** The shrimp, from when it drifts in until it is eaten (null otherwise). */
export function preyAt(t: number): Prey | null {
  if (t < PREY_FROM || t >= SNAP_AT + 0.03) return null;
  const x = preyX(t);
  const y = preyY(t);
  // Head first, down and towards the fish's face, rocking a little as it swims.
  const heading = Math.PI - 0.3 + 0.12 * Math.sin((t - PREY_FROM) * 2.3);
  return { at: v3(x, y, 0.4), heading, flick: (t - PREY_FROM) * 2 * Math.PI * 1.6 };
}

/** The lateral line feeling the shrimp's wake: pulses running back along it, 0 .. 1 at `along` (0 gill .. 1 tail). */
export function senseAt(t: number, along: number): number {
  const on = window01(t, BRUSH_AT - 0.55, SNAP_AT + 0.15, 0.25);
  if (on <= 0) return 0;
  const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (2.4 * (t - BRUSH_AT) - 1.6 * along));
  return on * wave ** 2;
}

/** Ripples spreading from the shrimp as it nears: ages of each ring, s (only those alive). */
export function ripplesAt(t: number): number[] {
  const from = BRUSH_AT - 0.9;
  if (t < from || t > SNAP_AT) return [];
  const ages: number[] = [];
  for (let s = from; s <= t; s += 0.32) if (t - s < 0.9) ages.push(t - s);
  return ages;
}

/** The ink burst of the bite, 0 .. 1 over its life, or outside that. */
export const burstAt = (t: number): number => (t - SNAP_AT) / 0.55;
/** A jolt of the picture on the bite, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = t - SNAP_AT;
  if (u < 0 || u > 0.3) return { x: 0, y: 0 };
  const fade = (1 - u / 0.3) ** 2;
  return { x: 14 * fade * Math.sin(u * 95), y: 9 * fade * Math.cos(u * 77) };
}

// ---------------------------------------------------------------- labels

export const fangLabel = (t: number): number => window01(t, FANGS_AT + 0.3, SHUT_FROM + 0.3, 0.3);
export const socketLabel = (t: number): number => window01(t, SOCKETS_AT - 0.05, DARK_FROM + 0.1, 0.3);
export const brainLabel = (t: number): number => window01(t, BRAIN_AT - 0.1, DARK_FROM + 0.1, 0.3);
export const sizeLabel = (t: number): number => window01(t, HAND_FROM + 0.4, XRAY_FROM + 0.3, 0.3);
export const depthLabel = (t: number): number => window01(t, DARK_FROM + 0.2, BLIND_AT - 0.1, 0.3);
export const eyeLabel = (t: number): number => window01(t, BLIND_AT - 0.2, STILL_FROM + 0.5, 0.3);
export const lateralLabel = (t: number): number => window01(t, BRUSH_AT - 0.3, SNAP_AT - 0.05, 0.25);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'dash', t: PULL_FROM + 0.05, pitch: 0.55, gain: 0.14, pan: 0 },
  { id: 'zap', t: XRAY_FROM + 0.05, pitch: 0.55, gain: 0.07, pan: 0 },
  { id: 'click', t: SHUT_AT - 0.04, pitch: 0.45, gain: 0.5, pan: -0.2 },
  { id: 'click', t: SHUT_AT, pitch: 0.42, gain: 0.5, pan: 0.2 },
  { id: 'dash', t: DARK_FROM + 0.1, pitch: 0.45, gain: 0.1, pan: 0 },
  { id: 'drop', t: BRUSH_AT - 0.35, pitch: 0.45, gain: 0.06, pan: 0.3 },
  { id: 'drop', t: BRUSH_AT + 0.05, pitch: 0.45, gain: 0.06, pan: 0.2 },
  { id: 'lunge', t: SNAP_AT - 0.1, pitch: 1.3, gain: 0.3, pan: 0.1 },
  { id: 'eat', t: SNAP_AT + 0.02, pitch: 0.9, gain: 0.45, pan: 0.1 },
  { id: 'dash', t: TINY_AT + 0.05, pitch: 0.5, gain: 0.1, pan: 0 },
  { id: 'suck', t: GIANT_AT + 0.05, pitch: 0.9, gain: 0.16, pan: 0 },
  { id: 'lunge', t: GIANT_AT + 0.6, pitch: 0.8, gain: 0.35, pan: 0 },
];
