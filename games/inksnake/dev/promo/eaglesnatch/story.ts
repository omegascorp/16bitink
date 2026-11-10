import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { taper } from '../sprites';

/**
 * The beats of "Snake Catches Lizard, Eagle Catches Snake" (12 s, no voice).
 * Top-down, as the game's chapter 7 is drawn. Screen px throughout.
 *
 * - 0 – 3.2 s: frame 1 is the end of the last hunt: the eagle's talons close
 *   on the snake (an agama half swallowed in its jaws, the red ring on it) and
 *   it lifts off the rock, up and out of frame.
 * - 3.3 – 12 s: a new snake crawls up over the rocks (the ground scrolls: the
 *   camera follows it), the next agama coming down the screen to meet it. The
 *   eagle's shadow circles (the game's warning), the snake strikes (6.95) and
 *   swallows, the red ring locks on (10.2) and the snake ignores it; at 11.6
 *   the eagle stoops and the last frame is frame 1.
 */
export const LOOP_S = 12;

/** The snake's width on screen; board px (the agama's and eagle's units) and snake-art units in screen px. */
export const W = 96;
export const KB = W / 15;
export const KS = W / 24;
export const BODY_LEN = 840;

export const T_NEW = 3.3;
export const T_CATCH = 6.95;
export const T_LOCK = 10.2;
export const T_STILL = 11.1;
export const T_DIVE = 11.6;
const LIFT_END = 3.2;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- the ground

export const TILE_H = 600;
const SCROLL = 2 * TILE_H;

/** How far the ground has slid down the screen: two tile heights over the new snake's crawl, which is the ground's own period. */
export const scrollAt = (t: number): number => (t >= T_NEW ? SCROLL * clamp01((t - T_NEW) / (LOOP_S - T_NEW)) : 0);

// ---------------------------------------------------------------- the snake

const HEAD_END = 740;
const HEAD_START = 1760;
const L_END = 2000;
const WEAVE = { amp: 75, len: 880 } as const;
const X_MID = 600;

const lunge = (t: number): number => 120 * (ramp(t, T_CATCH - 0.12, T_CATCH) - ramp(t, T_CATCH + 0.05, T_CATCH + 0.6));

/** The head's screen y for the new snake at `t` in [T_NEW, 12]. */
function headY(t: number): number {
  const u = clamp01((t - T_NEW) / 3.7);
  return lerp(HEAD_START, HEAD_END, 1 - (1 - u) * (1 - u)) - lunge(t);
}

/** The core state of the new snake at `t` (the old snake of frame 1 is the core at 12). */
export interface Core {
  readonly t: number;
  readonly path: number;
  readonly headY: number;
}

export const coreAt = (t: number): Core => {
  const c = Math.min(LOOP_S, Math.max(T_NEW, t));
  const y = headY(c);
  return { t: c, path: 1540 + scrollAt(c) - y, headY: y };
};

const weave = (w: number): number => X_MID + WEAVE.amp * Math.sin((2 * Math.PI * (w - L_END)) / WEAVE.len);

/** The body's point `d` px behind the head. */
export function bodyPoint(core: Core, d: number): Pt {
  return { x: weave(core.path - d), y: core.headY + d };
}

export interface Head extends Pt {
  readonly heading: number;
}

export function headOf(core: Core): Head {
  const [a, b] = [bodyPoint(core, 0), bodyPoint(core, 14)];
  return { x: a.x, y: a.y, heading: Math.atan2(a.y - b.y, a.x - b.x) };
}

export const HEAVES = [8.0, 9.2, 10.4, 11.4] as const;
/** 0..1: how far the agama has gone down. */
export const swallowed = (t: number): number => HEAVES.reduce((s, h) => s + ramp(t, h, h + 0.4), 0) / HEAVES.length;

/** How far the agama is in the mouth (px of it behind the snake's snout tip): its head seized at the strike, gulped in past the forelegs, then drawn in at each heave. */
const M_BITE = 34;
const M_GULP = 116;
const M_END = 140;
export const inMouth = (t: number): number =>
  t < T_CATCH ? 0 : M_BITE + (M_GULP - M_BITE) * ramp(t, T_CATCH + 0.06, T_CATCH + 0.7) + (M_END - M_GULP) * swallowed(t);
export const SNOUT_TIP = 21 * KS;

export interface Body {
  readonly spine: readonly Pt[];
  readonly widths: readonly number[];
}

/** The body: the agama is narrower than the snake's neck, so it makes no lump; the jaws (the head drawing) stretch round it instead. */
export function bodyOf(core: Core): Body {
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let d = 0; d <= BODY_LEN; d += 8) {
    spine.push(bodyPoint(core, d));
    widths.push(W * taper(d / BODY_LEN, 0.62, 0.12));
  }
  return { spine, widths };
}

/**
 * 'swallow' is the shut head stretched round the agama (mouth.ts): no open
 * mouth shows round the prey. The jaws gape only early in the lunge, while the
 * agama is still clear of them; they shut on it as they reach it.
 */
export type HeadPose = 'shut' | 'strike' | 'swallow';
export const headPose = (t: number): HeadPose => (t >= T_CATCH - 0.06 ? 'swallow' : t >= T_CATCH - 0.15 ? 'strike' : 'shut');
/** 0..1: how far the jaws have stretched round the agama. */
export const gapeAt = (t: number): number => (t >= T_CATCH ? ramp(t, T_CATCH - 0.02, T_CATCH + 0.12) : 0);

/** The tongue flicks while it stalks. */
export const tongueOut = (t: number): boolean => t < T_CATCH - 0.3 && ((t - T_NEW) * 1.6) % 1 < 0.28;

// ---------------------------------------------------------------- the agama

export interface Agama extends Pt {
  readonly angle: number;
  readonly pose: 'idle' | 'bob' | 'run0' | 'run1';
  /** Screen px per board px (KB, times the height scale when it is carried off). */
  readonly scale: number;
  /** Where its spine passes the snake's lips (board px from its snout), when in the mouth. */
  readonly sMouth?: number;
}

/** A snake's head on screen: where, which way, and how much bigger than on the ground (1 there). */
export interface HeadAt extends Pt {
  readonly heading: number;
  readonly scale: number;
}

/** The agama's own drawing (src/art/chapters/mountainsCrittersAgama.ts), board px: snout at x 22.5 facing +x, its full width along the spine and its pose's trunk swing. */
const AGAMA = { snout: 22.5, len: 47 } as const;
const AGAMA_WIDTH: readonly (readonly [number, number])[] = [
  [0, 1.2], [1.5, 3.8], [4, 6.6], [6.4, 7.6], [8.4, 5.6], [10, 6.6], [14, 10.2], [19, 10], [22.5, 6.4], [25, 4.4], [31, 2.8], [39, 1.5], [47, 0.35],
];
const TRUNK: Readonly<Record<Agama['pose'], number>> = { idle: 0.6, bob: 0.3, run0: 2.3, run1: -2.3 };

export function agamaWidth(s: number): number {
  for (let i = 1; i < AGAMA_WIDTH.length; i++) {
    const [s1, w1] = AGAMA_WIDTH[i]!;
    const [s0, w0] = AGAMA_WIDTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) * 0.5;
  }
  return AGAMA_WIDTH[AGAMA_WIDTH.length - 1]![1];
}

/** The agama's spine at s (s < 23, the trunk), in its drawing's board px. */
export const agamaSpine = (pose: Agama['pose'], s: number): Pt => ({ x: AGAMA.snout - s, y: TRUNK[pose] * Math.sin((Math.PI * Math.min(s, 28)) / 28) });

/** Where the lips close round the agama: head-drawing units ahead of the head's centre (the snout tip is at 21). */
export const MOUTH_X = 18.5;
/** The agama is hidden behind this line (head-drawing units): its front is in the mouth, under the head. */
export const MOUTH_CUT = 16.5;

/** The agama in the mouth of a head: its spine where the lips are, pointing in, `m` px of it inside, wriggling at first. */
export function agamaInMouth(h: HeadAt, t: number, m: number): Agama {
  const sc = h.scale;
  const sMouth = (m - (SNOUT_TIP - MOUTH_X * KS)) / KB;
  const struggling = t < 8.4;
  const pose: Agama['pose'] = struggling ? (Math.floor(t * 14) % 2 === 0 ? 'run0' : 'run1') : 'idle';
  const wiggle = t >= T_CATCH ? 0.22 * Math.sin(t * 26) * (1 - ramp(t, T_CATCH + 0.2, 8.4)) + 0.04 * Math.sin(t * 9) : 0;
  // Its own trunk's slope at the lips, so its spine there lies along the snake's.
  const slope = ((TRUNK[pose] * Math.PI) / 28) * Math.cos((Math.PI * Math.min(sMouth, 28)) / 28);
  const angle = h.heading + Math.PI + wiggle + Math.atan(slope);
  const mouth = { x: h.x + Math.cos(h.heading) * MOUTH_X * KS * sc, y: h.y + Math.sin(h.heading) * MOUTH_X * KS * sc };
  const p = agamaSpine(pose, sMouth);
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const k = KB * sc;
  return { x: mouth.x - (c * p.x - s * p.y) * k, y: mouth.y - (s * p.x + c * p.y) * k, angle, pose, scale: k, sMouth };
}

const headAtCore = (core: Core): HeadAt => ({ ...headOf(core), scale: 1 });

/** The agama on the ground, fixed in the world until the strike. */
const CAUGHT = agamaInMouth(headAtCore(coreAt(T_CATCH)), T_CATCH, inMouth(T_CATCH));
const AGAMA_WORLD: Pt = { x: CAUGHT.x, y: CAUGHT.y - scrollAt(T_CATCH) };

/** The agama (before T_NEW, the last hunt's, as it lies at frame 1: carry.ts lifts it with the snake). */
export function agamaAt(t: number): Agama {
  const core = coreAt(t < T_NEW ? LOOP_S : t);
  if (core.t >= T_CATCH) return agamaInMouth(headAtCore(core), core.t, inMouth(core.t));
  return { x: AGAMA_WORLD.x, y: AGAMA_WORLD.y + scrollAt(core.t), angle: CAUGHT.angle - 0.04 * Math.sin(core.t * 3), pose: Math.floor(core.t / 0.7) % 3 === 0 ? 'bob' : 'idle', scale: KB };
}

// ---------------------------------------------------------------- the eagle

export const DIR = (-50 * Math.PI) / 180;
const [DX, DY] = [Math.cos(DIR), Math.sin(DIR)];
const FOOT = 31 * 0.8 * KB;

/** Where the talons close: the neck, just behind the head (snake eagles seize a snake by the neck, out of reach of its fangs). */
export const GRAB_D = 1.05 * W;
export const grabPoint = (): Pt => bodyPoint(coreAt(LOOP_S), GRAB_D);
const GRAB = grabPoint();
/** The eagle's centre when its feet are on the grab. */
const ORIGIN: Pt = { x: GRAB.x - DX * FOOT, y: GRAB.y - DY * FOOT };

const CIRCLE = { r: 560, from: 3.5, w: 1.1 } as const;
const ANGLE_DIVE = Math.atan2(-DY, -DX);

/** How far through its circuit the eagle is: it slows as it locks on. */
function circuit(t: number): number {
  let s = 0;
  const steps = 48;
  const span = LOOP_S - t;
  for (let i = 0; i < steps; i++) {
    const u = t + ((i + 0.5) / steps) * span;
    s += (1 - ramp(u, T_LOCK - 1, T_LOCK + 0.4)) * (span / steps);
  }
  return ANGLE_DIVE - CIRCLE.w * s;
}

export interface Lift {
  readonly dx: number;
  readonly dy: number;
  readonly scale: number;
  readonly swing: number;
  /** Altitude in px (the shadow slides off this far). */
  readonly alt: number;
}

export function liftAt(t: number): Lift {
  const p = clamp01(t / 3.1);
  const e = 2800 * p ** 2.2;
  const rise = 1 - Math.exp(-t * 4.5);
  // It climbs hard off the rock (nearer the camera: bigger), so the snake hanging under it reads as lower.
  const scale = 1 + 0.26 * rise + 0.42 * p * p;
  return { dx: DX * e, dy: DY * e, scale, swing: 0.06 * Math.sin(t * 5) * ramp(t, 0, 0.6), alt: 1000 * (scale - 1) };
}

export type EaglePose = 'soar' | 'hover' | 'flap0' | 'flap1' | 'stoop';

export interface Eagle extends Pt {
  readonly heading: number;
  readonly scale: number;
  readonly pose: EaglePose;
  readonly alpha: number;
  readonly alt: number;
  /** Talons on the snake (a foot pair is drawn over the stoop's own for the flapping poses). */
  readonly feet: boolean;
}

const angleLerp = (a: number, b: number, u: number): number => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;

export function eagleAt(t: number): Eagle | null {
  if (t < LIFT_END) {
    const l = liftAt(t);
    const flap = t < 0.12 ? 'stoop' : (`flap${Math.floor((t - 0.12) * 5) % 2}` as EaglePose);
    return { x: GRAB.x + (ORIGIN.x - GRAB.x) * l.scale + l.dx, y: GRAB.y + (ORIGIN.y - GRAB.y) * l.scale + l.dy, heading: DIR + l.swing, scale: l.scale, pose: flap, alpha: 1, alt: l.alt, feet: t >= 0.12 };
  }
  if (t < CIRCLE.from) return null;
  const alt = 150 * ramp(t, CIRCLE.from, CIRCLE.from + 0.9);
  const dive = ramp(t, T_DIVE, LOOP_S);
  const th = circuit(t);
  const ring = { x: GRAB.x + Math.cos(th) * CIRCLE.r, y: GRAB.y + Math.sin(th) * CIRCLE.r };
  const x = lerp(ring.x, ORIGIN.x, dive);
  const y = lerp(ring.y, ORIGIN.y, dive);
  const tangent = th + Math.PI / 2;
  const heading = angleLerp(tangent, DIR, smooth((t - T_LOCK) / (T_DIVE - T_LOCK + 0.2)));
  const pose: EaglePose = t >= T_DIVE ? 'stoop' : t >= T_LOCK ? 'hover' : t < CIRCLE.from + 1 || Math.sin(t * 1.1) > 0.9 ? (`flap${Math.floor(t * 6) % 2}` as EaglePose) : 'soar';
  const a = alt * (1 - dive);
  return { x, y, heading, scale: 1 + a / 1000, pose, alpha: ramp(t, CIRCLE.from, CIRCLE.from + 0.7), alt: a, feet: false };
}

// ---------------------------------------------------------------- the ring

export interface RingMark {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
  readonly tau: number;
}

export const RING_R = 46 * KB;
const flash = (t: number): number => 0.8 + 0.2 * Math.cos(2 * Math.PI * 5 * t);

export function ringAt(t: number): RingMark | null {
  if (t >= T_LOCK) {
    const tau = ramp(t, T_LOCK, T_STILL);
    return { x: GRAB.x, y: GRAB.y, r: RING_R * (1.5 - 0.5 * tau), alpha: Math.min(1, 0.5 + 0.5 * tau) * flash(t), tau };
  }
  if (t < 0.7) return { x: GRAB.x, y: GRAB.y, r: RING_R, alpha: (1 - smooth((t - 0.25) / 0.4)) * flash(t), tau: 1 };
  return null;
}

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
}

export const CAPTIONS: readonly Caption[] = [
  { text: 'lunch…', y: 376, size: 124, from: 0.1, to: 1.7 },
  { text: '…for the eagle', y: 372, size: 118, from: 1.8, to: 3.2 },
  { text: 'eagles eat almost only snakes', y: 352, size: 84, from: 3.9, to: 6.4 },
  { text: 'too busy eating to look up', y: 352, size: 88, from: 7.9, to: 10.1 },
  { text: 'uh oh…', y: 372, size: 124, from: 10.5, to: 11.9 },
];
const CAPTION_FADE = 0.12;
export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink/snake', x: 250, y: 1420, size: 46, alpha: 1 } as const;

/** The strike's "!" and the meal's score (the agama is worth 12 in the game: logic/chapters/mountains.ts). */
export const SCORE_TEXT = '+12';
export interface Float {
  readonly rise: number;
  readonly alpha: number;
}
const float = (age: number, life: number): Float | null => (age < 0 || age > life ? null : { rise: smooth(age / life), alpha: Math.min(1, age / 0.1, (life - age) / 0.3) });
export const alarmAt = (t: number): Float | null => float(t - T_CATCH, 0.8);
export const scoreAt = (t: number): Float | null => float(t - T_CATCH - 0.15, 1.1);

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  { id: 'cry', t: 0.03, pitch: 1.1, gain: 0.9, pan: 0.1 },
  { id: 'hurt', t: 0.05, pitch: 0.9, gain: 0.5, pan: 0 },
  ...[0.12, 0.5, 0.9, 1.3, 1.7, 2.1].map((t, i): SoundCue => ({ id: 'flap', t, pitch: 0.9, gain: 0.7 - i * 0.08, pan: 0.2 + i * 0.1 })),
  ...[3.7, 4.9, 6.1].map((t): SoundCue => ({ id: 'steps', t, pitch: 0.85, gain: 0.45, pan: 0 })),
  { id: 'flap', t: 3.8, pitch: 0.8, gain: 0.35, pan: -0.5 },
  { id: 'cry', t: 5.2, pitch: 0.8, gain: 0.3, pan: -0.5 },
  { id: 'strike', t: T_CATCH, pitch: 1, gain: 1, pan: 0 },
  { id: 'squeak', t: T_CATCH + 0.06, pitch: 1.2, gain: 0.7, pan: 0 },
  { id: 'bump', t: T_CATCH + 0.08, pitch: 0.8, gain: 0.6, pan: 0 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'squeeze', t: h, pitch: 0.8, gain: 0.7, pan: 0 },
    { id: 'gulp', t: h + 0.1, pitch: 0.6, gain: 0.8, pan: 0 },
  ]),
  { id: 'appear', t: T_LOCK, pitch: 1.3, gain: 0.6, pan: 0 },
  { id: 'cry', t: T_LOCK + 0.35, pitch: 1.05, gain: 0.95, pan: 0.2 },
  { id: 'dive', t: T_DIVE - 0.05, pitch: 1, gain: 1, pan: -0.2 },
];
