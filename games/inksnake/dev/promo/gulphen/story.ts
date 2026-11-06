import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { Pt } from '../sprites';
import { DRIFT, pathAt, PERIOD, TILT } from './path';

/**
 * "How did that fit": chapter 1's farmyard, played as a highlight, seen from
 * a low three-quarter angle so the hen reads as a hen. The beats are the
 * series' best short (InkFish's gape):
 *
 *   0     frame 1: the jaws gaping round the hen's head and shoulders, her "!"
 *   0.75  the bite lands; stuck, legs paddling
 *   1.9   heave, 2.8 heave, 3.65 heave: the jaws walk on, feathers puff out
 *   4.25  only her feet are left; they kick once
 *   4.55  the last slurp
 *   4.9   GULP: the jaws shoot on and snap shut, a hen-shaped lump, "+40"
 *   5.05  "how did THAT fit"; a feather drifts down
 *   5.6   "Bigger!"; 6.05 the tongue flicks
 *   6.4   the camera pulls back; the snake crawls on, digesting
 *   8.0   the next hen wanders in, pecking
 *   11.0  she looks up; 11.35 "!"; 11.55 the strike, which is frame 1.
 *
 * World units are screen px at frame 1. Over the loop the snake grows GROW
 * times and the camera pulls back as much, so the snake and the next hen
 * draw the same on screen as they did and only the ground shows the change:
 * it zooms out for good and crossfades into itself (groundAt).
 */
export const LOOP_S = 12;
export const GROW = 1.25;

export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const KICK_AT = 4.25;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const NEXT_HEN_AT = 8;
export const LOOK_UP_AT = 11;
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.55;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Seam time: seconds from the loop point, negative just before it. */
export const seam = (t: number): number => (t > LOOP_S / 2 ? t - LOOP_S : t);

// ---------------------------------------------------------------- sizes

/** The snake's body width and length, and its jaws' length. */
export const NECK_W = 122;
export const BODY_LEN = 2700;
export const JAW = 300;
const SKIN = 8;

/** The hen's outline about her axis, nose (0) to tail (720): how far above and below it. */
const HEN_KNOTS: readonly (readonly [number, number, number])[] = [
  [0, 8, 8], [20, 25, 22], [60, 62, 58], [95, 72, 68], [130, 66, 62], [165, 78, 84], [200, 110, 125], [250, 160, 178], [310, 190, 212], [380, 205, 222],
  [450, 200, 210], [520, 190, 172], [580, 172, 118], [630, 150, 62], [660, 122, 32], [690, 72, 12], [710, 28, 4], [720, 2, 2],
];
export const HEN_LEN = 720;

function knot(a: number, side: 1 | 2): number {
  if (a <= 0 || a >= HEN_LEN) return 0;
  for (let i = 1; i < HEN_KNOTS.length; i++) {
    const k1 = HEN_KNOTS[i]!;
    if (a > k1[0]) continue;
    const k0 = HEN_KNOTS[i - 1]!;
    const s = (a - k0[0]) / (k1[0] - k0[0]);
    return k0[side] + (k1[side] - k0[side]) * (1 - Math.cos(Math.PI * s)) * 0.5;
  }
  return 0;
}
export const henTop = (a: number): number => knot(a, 1);
export const henBottom = (a: number): number => knot(a, 2);

/** The rim where frame 1 finds the jaws: on her shoulders, her whole head inside. */
export const RIM_0 = 150;
/** How wide the jaws gape on frame 1, either side of her axis: wider than she needs, before they bite down. */
const FRAME_ONE_GAPE = 238;
/** Her neck on frame 1: lifted a little, so her comb and beak stand clear in the mouth. */
const FRAME_ONE_NECK = -0.24;
const RIM_FULL = 1040;
const WAIT_RIM = -190;

const spring = (s: number): number => 1 - Math.exp(-8 * s) * Math.cos(13 * s);

// ---------------------------------------------------------------- the head along the path

const STRIKE: readonly Key[] = [
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: LOOP_S, at: PERIOD + RIM_0, rate: 300 },
];
const CRAWL: readonly Key[] = [
  { t: 6.5, at: RIM_FULL, rate: 0 },
  { t: 7.4, at: RIM_FULL + 240 },
  { t: 10.1, at: PERIOD + WAIT_RIM - 110 },
  { t: 11, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
];
const BITE: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 300 },
  { t: BITE_AT, at: 260, rate: 0 },
];

/** Where the rim of the mouth is along the path, u: on the hen (u = her `a`) while swallowing, then crawling on to the next one. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  if (t >= 6.5) return curveAt(CRAWL, t).at;
  let r = curveAt(BITE, t).at;
  r += 140 * ramp(t, HEAVES[0], HEAVES[0] + 0.25) + 140 * ramp(t, HEAVES[1], HEAVES[1] + 0.25) + 150 * ramp(t, HEAVES[2], HEAVES[2] + 0.25);
  // Slipping back a little before each heave.
  for (const h of HEAVES) r -= 10 * window01(t, h - 0.45, h + 0.1, 0.25);
  r += 60 * ramp(t, SLURP_AT, GULP_AT - 0.05);
  return r + 290 * ramp(t, GULP_AT - 0.05, GULP_AT + 0.1);
}

/** The rim on the meal, for reading the lump: stays put once the meal is whole inside. */
export const mealRim = (t: number): number => Math.min(RIM_FULL, t < NEXT_HEN_AT ? headU(t) : RIM_FULL);

/** The jaws walking: each side's rim leads in turn (world units, upper + / lower −). */
export function jawWalk(t: number): number {
  return 20 * Math.sin(2 * Math.PI * 1.1 * t) * window01(t, 0.9, GULP_AT - 0.2, 0.3);
}

/** The gape when there's nothing to open round: wide through the strike, two chews after the gulp. */
export function freeGape(t: number): number {
  const u = seam(t);
  if (u >= -0.5 && u < 0.7) return FRAME_ONE_GAPE * Math.min(ramp(u, -0.5, -0.02), 1 - ramp(u, 0.2, BITE_AT));
  let open = 0;
  for (const c of [GULP_AT + 0.4, GULP_AT + 0.8]) if (t > c && t < c + 0.2) open = Math.max(open, 24 * Math.sin((Math.PI * (t - c)) / 0.2));
  return open;
}

export interface JawFrame {
  /** Half openings at the tips and at the hinges, above and below the axis. */
  readonly tipTop: number;
  readonly tipBottom: number;
  readonly hingeTop: number;
  readonly hingeBottom: number;
  /** How far behind the rim the hinges are, along the axis. */
  readonly reach: number;
}

const smoothMax = (a: number, b: number): number => (a ** 6 + b ** 6) ** (1 / 6);

/** The body's half widths at hen place `a` for a meal scaled `size`. */
export const swellTop = (a: number, size: number): number => smoothMax(NECK_W / 2, size * (henTop(a) + (henTop(a) > 0 ? SKIN : 0)));
/** Her comb and beak pressing out through the skin, on top of the lump's front. */
export const combBump = (a: number, size: number): number => size * 26 * window01(a, 40, 170, 30) * (0.55 + 0.45 * Math.abs(Math.sin((a - 40) * 0.0725)));
export const swellBottom = (a: number, size: number): number => smoothMax(NECK_W / 2, size * (henBottom(a) + (henBottom(a) > 0 ? SKIN : 0)));

/** The jaws as they sit on the meal at time t. */
export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? headU(t) : HEN_LEN + 900;
  const walk = jawWalk(t);
  const free = freeGape(t);
  const tipTop = Math.max(free, swallowing ? henTop(rim + walk) + (henTop(rim + walk) > 0 ? SKIN : 0) : 0);
  const tipBottom = Math.max(free * 1.05, swallowing ? henBottom(rim - walk) + (henBottom(rim - walk) > 0 ? SKIN : 0) : 0);
  let reach = JAW;
  let hingeTop = NECK_W / 2;
  let hingeBottom = NECK_W / 2;
  const size = lumpSize(t);
  for (let i = 0; i < 3; i++) {
    const a = mealRim(t) - reach;
    hingeTop = swellTop(a, size);
    hingeBottom = swellBottom(a, size);
    const rise = Math.max(Math.abs(tipTop - hingeTop), Math.abs(tipBottom - hingeBottom));
    reach = Math.sqrt(Math.max(JAW * JAW * 0.3, JAW * JAW - rise * rise));
  }
  return { tipTop, tipBottom, hingeTop, hingeBottom, reach };
}

/** The meal's size inside: whole until it digests away. */
export const lumpSize = (t: number): number => {
  if (t >= 9.5) return 0;
  const s = t - GULP_AT;
  const pop = s > 0 ? 1 + 0.16 * Math.exp(-6 * s) * Math.sin(16 * s) : 1;
  return pop * (1 - ramp(t, 7.3, 9.5));
};

/** How much of the head is the side view (1) rather than the game's top-down sprite (0). */
export const sideView = (t: number): number => Math.max(1 - ramp(t, 6.45, 6.85), ramp(t, 10.8, 11.25));

export type EyeState = 'open' | 'squeeze' | 'happy';
export function snakeEye(t: number): EyeState {
  if (HEAVES.some((h) => t > h - 0.05 && t < h + 0.4)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  return t >= GULP_AT + 0.3 && t < 6.2 ? 'happy' : 'open';
}

/** The tongue, 0 in .. 1 out. */
export function tongue(t: number): number {
  for (const s of [6.05, 6.32, 10.55, 10.85]) if (t >= s && t < s + 0.24) return Math.sin(((t - s) / 0.24) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the hen

export interface HenPose {
  /** Her nose in the world, and her axis's tilt (nose up when positive). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** Neck: 0 stretched along the axis, negative up, positive down to peck. */
  readonly neck: number;
  readonly alarm: boolean;
  /** Each leg's swing about the hip, 0 down .. PI/2 trailing back, and the tail's fold (0 raised .. 1 back along her). */
  readonly nearLeg: number;
  readonly farLeg: number;
  readonly tail: number;
  /** A ruffle in time with a heave, 0 .. 1. */
  readonly shudder: number;
  /** Ground shadow, 0 .. 1. */
  readonly shadow: number;
}

const Tilted = { x: -Math.cos(TILT), y: Math.sin(TILT) };

/** A pulse at each heave. */
const heaveAt = (t: number): number => Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.05) / 0.35))));

function swallowedHen(t: number): HenPose {
  const a = headU(t);
  const back = ramp(a, 360, 560);
  const paddle = Math.sin(2 * Math.PI * 3.2 * t) * 0.3 * (1 - back);
  const kick = t > KICK_AT && t < KICK_AT + 0.3 ? Math.sin(((t - KICK_AT) / 0.3) * Math.PI) : 0;
  return {
    x: 0, y: 0, tilt: TILT, neck: FRAME_ONE_NECK * (1 - ramp(t, 0.3, 1.5)), alarm: true, nearLeg: 0.15 + paddle + back * 1.3 + 0.45 * kick, farLeg: 0.1 - paddle + back * 1.34 - 0.5 * kick,
    tail: ramp(a, 430, 640), shudder: heaveAt(t), shadow: 1 - ramp(a, 450, 640),
  };
}

const WANDER: readonly Key[] = [
  { t: NEXT_HEN_AT, at: -1020, rate: 190 },
  { t: 9.5, at: -330 },
  { t: 9.9, at: -260, rate: 0 },
  { t: 10.15, at: -260, rate: 0 },
  { t: 10.75, at: -60, rate: 0 },
];
/** The hen's pecks: when her head goes down. */
const PECKS = [8.75, 9.95, 10.2, 10.75] as const;

function nextHen(t: number): HenPose {
  const walked = curveAt(WANDER, t);
  const rear = ramp(t, SPOT_AT - 0.05, LOOP_S - 0.2);
  const to = 1 - ramp(t, 11, 11.45);
  const peck = Math.max(0, ...PECKS.map((p) => Math.sin(Math.PI * clamp01((t - p) / 0.34))));
  const stride = Math.abs(walked.rate) > 20 ? Math.sin(2 * Math.PI * 3 * t) : 0;
  const neck = lerp(lerp(-0.85, 0.95, peck), -1.05, ramp(t, LOOK_UP_AT, LOOK_UP_AT + 0.15));
  return {
    x: DRIFT.x + walked.at * to,
    y: DRIFT.y + 60 * to,
    tilt: TILT * rear,
    neck: lerp(neck, FRAME_ONE_NECK, ramp(t, SPOT_AT, STRIKE_AT)),
    alarm: t >= SPOT_AT - 0.1,
    nearLeg: lerp(0.32 * stride, 0.15, ramp(t, 10.8, 11.3)),
    farLeg: lerp(-0.32 * stride, 0.1, ramp(t, 10.8, 11.3)),
    tail: 0,
    shudder: 0,
    shadow: 1,
  };
}

/** The hen in play at time t, if any. */
export function henAt(t: number): HenPose | null {
  if (t < GULP_AT - 0.02) return swallowedHen(t);
  return t >= NEXT_HEN_AT ? nextHen(t) : null;
}

/** Her feet still sticking out (for the audio and the tests): the body hidden, the feet not. */
export const onlyFeetLeft = (t: number): boolean => headU(t) >= 680 && headU(t) < 790 && t < GULP_AT;

// ---------------------------------------------------------------- feathers

export interface Feather {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly size: number;
  readonly alpha: number;
}

/** Feathers puffing out at a burst, from `at` along the hen. */
const BURSTS = [...HEAVES.map((h, i) => ({ t: h + 0.06, a: 330 + i * 130, n: 5 })), { t: GULP_AT, a: 760, n: 8 }] as const;

function burstFeather(b: (typeof BURSTS)[number], i: number, t: number): Feather | null {
  const s = t - b.t;
  if (s < 0 || s > 1.5) return null;
  const k = i * 2.399 + b.t * 7;
  const vx = Math.cos(k) * (300 + (i % 3) * 110) - 90;
  const vy = Math.sin(k) * 170 + (i % 2 ? -260 : 260);
  const drag = (1 - Math.exp(-3 * s)) / 3;
  const p = pathAt(b.a);
  const off = i % 2 ? -1 : 1;
  return {
    x: p.x + vx * drag + 24 * Math.sin(3 * s + k),
    y: p.y + off * 170 + vy * drag + 95 * s * s,
    rot: k + s * (2 + (i % 3)) * off,
    size: 0.5 + (i % 3) * 0.12,
    alpha: 1 - ramp(s, 1, 1.5),
  };
}

/** The one feather that drifts down after the gulp, rocking. */
function driftFeather(t: number): Feather | null {
  const s = t - GULP_AT - 0.1;
  if (s < 0 || s > 3.2) return null;
  const p = pathAt(560);
  return {
    x: p.x + 90 * Math.sin(1.9 * s) - 40 * s,
    y: p.y - 430 + 150 * s,
    rot: 0.5 + 0.55 * Math.cos(1.9 * s),
    size: 1,
    alpha: Math.min(1, s * 8) * (1 - ramp(s, 2.7, 3.2)),
  };
}

export function feathersAt(t: number): readonly Feather[] {
  const burst = BURSTS.flatMap((b) => Array.from({ length: b.n }, (_, i) => burstFeather(b, i, t)));
  return [...burst, driftFeather(t)].filter((f): f is Feather => f !== null);
}

// ---------------------------------------------------------------- the camera

export const SCREEN_ANCHOR: Pt = { x: 540, y: 800 };

/** How far the camera has pulled back to make up for the growth, 0 .. 1, after you've seen it grow. */
const pull = (t: number): number => ramp(t, 6.4, 8.2);
/** The snake's growth: a springy spurt on "Bigger!". */
export const growth = (t: number): number => (t <= SPURT ? 1 : GROW ** spring(t - SPURT));
/** The wide shot over the crawl, 1 on frame 1. */
const wide = (t: number): number => BASE_ZOOM * lerp(1, 0.74, Math.min(ramp(t, 6.4, 8.4), 1 - ramp(t, 10.5, 11.75)));

/** Screen px per world unit on frame 1. */
const BASE_ZOOM = 0.88;

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const C0 = { x: -125, y: 28 };
const camKeys = (pick: (p: Pt) => number): readonly Key[] => [
  { t: 0, at: pick(C0), rate: 0 },
  { t: BITE_AT, at: pick(C0) },
  { t: 3.9, at: pick({ x: -360, y: 90 }) },
  { t: 5.1, at: pick({ x: -640, y: 160 }) },
  { t: 6.5, at: pick({ x: -640, y: 170 }), rate: 0 },
  { t: 8.6, at: pick({ x: -1060, y: -130 }) },
  { t: 10.2, at: pick({ x: DRIFT.x - 110, y: DRIFT.y + 40 }) },
  { t: 11.75, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
  { t: LOOP_S, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
];
const CAM_X = camKeys((p) => p.x);
const CAM_Y = camKeys((p) => p.y);

export function viewAt(t: number): View {
  return { x: curveAt(CAM_X, t).at, y: curveAt(CAM_Y, t).at, zoom: (growth(t) * wide(t)) / GROW ** pull(t) };
}

/** World to screen, shake not included. */
export const toScreen = (v: View, p: Pt): Pt => ({ x: SCREEN_ANCHOR.x + (p.x - v.x) * v.zoom, y: SCREEN_ANCHOR.y + (p.y - v.y) * v.zoom });

export interface GroundLayer {
  /** Screen px per ground unit, and where the ground's origin lands. */
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/**
 * The ground: the farmyard crawling under the snake, zooming out for good by
 * GROW a loop. Two copies, the second GROW times bigger and placed so it is
 * at the end of the loop just what the first is at its start; the second
 * fades in over the wide shot, so the end flows into frame 1.
 */
export function groundAt(t: number): readonly [GroundLayer, GroundLayer] {
  const v = viewAt(t);
  const zoom = v.zoom / growth(t) / BASE_ZOOM;
  const trackOf = (u: number): Pt => {
    const c = { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at };
    if (u <= SPURT) return c;
    const s = { x: curveAt(CAM_X, SPURT).at, y: curveAt(CAM_Y, SPURT).at };
    return { x: s.x + GROW * (c.x - s.x), y: s.y + GROW * (c.y - s.y) };
  };
  const c = trackOf(t);
  const [c0, c1] = [trackOf(0), trackOf(LOOP_S)];
  const first = { zoom, x: SCREEN_ANCHOR.x - c.x * zoom, y: SCREEN_ANCHOR.y - c.y * zoom, alpha: 1 };
  const second = {
    zoom: zoom * GROW,
    x: SCREEN_ANCHOR.x + (c1.x - c.x) * zoom - c0.x * zoom * GROW,
    y: SCREEN_ANCHOR.y + (c1.y - c.y) * zoom - c0.y * zoom * GROW,
    alpha: ramp(t, 6.8, 10),
  };
  return [first, second];
}

/** Screen shake, px. */
export function shakeAt(t: number): Pt {
  const jolts = [{ at: BITE_AT, amp: 10 }, ...HEAVES.map((h) => ({ at: h + 0.1, amp: 9 })), { at: GULP_AT, amp: 20 }, { at: SPURT, amp: 7 }];
  return jolts.reduce<Pt>((sum, j) => {
    const s = t - j.at;
    if (s < 0 || s > 0.3) return sum;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    return { x: sum.x + amp * Math.sin(s * 120), y: sum.y + amp * 0.7 * Math.cos(s * 150) };
  }, { x: 0, y: 0 });
}

// ---------------------------------------------------------------- "!", "+40", "Bigger!"

/** Pops up: 0 hidden .. 1, overshooting, gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The hen's "!", from the moment she spots it, up over the seam. */
export const alarmAt = (t: number): number => pop(seam(t) - (SPOT_AT - LOOP_S), LOOP_S - SPOT_AT + 0.85);

export interface FloatText {
  readonly rise: number;
  readonly alpha: number;
}

function float(since: number, life: number): FloatText | null {
  if (since < 0 || since >= life) return null;
  const s = since / life;
  return { rise: 1 - (1 - s) ** 2, alpha: Math.min(1, since / 0.08) * (1 - ramp(s, 0.65, 1)) };
}

/** The game's biggest farm meal, the rat, scores 40 (logic/prey.ts); the game has no points for a hen, who is an enemy there. */
export const SCORE_TEXT = '+40';
export const scoreAt = (t: number): FloatText | null => float(t - GULP_AT - 0.05, 1.1);
export const biggerAt = (t: number): FloatText | null => float(t - SPURT, 0.9);

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
}

export const CAPTIONS: readonly Caption[] = [
  { text: 'that’s a whole chicken', y: 382, size: 112, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'room for seconds?', y: 382, size: 118, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

/** Where the credit sits: inside the clear area, in every frame. */
export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  { id: 'cluck', t: 0.04, pitch: 1.35, gain: 0.9, pan: -0.25 },
  { id: 'flap', t: 0.12, pitch: 1.05, gain: 0.6, pan: -0.2 },
  { id: 'bump', t: BITE_AT, pitch: 0.6, gain: 0.9, pan: 0 },
  { id: 'cluck', t: 1.2, pitch: 1.2, gain: 0.6, pan: -0.2 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'squeeze', t: h, pitch: 0.75, gain: 0.8, pan: 0 },
    { id: 'gulp', t: h + 0.08, pitch: 0.55, gain: 0.75, pan: 0 },
    { id: 'flap', t: h + 0.1, pitch: 0.95, gain: 0.45, pan: -0.15 },
  ]),
  { id: 'cluck', t: 3.1, pitch: 1.45, gain: 0.5, pan: -0.2 },
  { id: 'plop', t: KICK_AT, pitch: 1.1, gain: 0.5, pan: -0.1 },
  { id: 'gulp', t: SLURP_AT, pitch: 0.75, gain: 0.8, pan: 0 },
  { id: 'swallow', t: GULP_AT, pitch: 0.8, gain: 1, pan: 0 },
  { id: 'bump', t: GULP_AT, pitch: 0.5, gain: 0.8, pan: 0 },
  { id: 'grown', t: SPURT, pitch: 1, gain: 0.8, pan: 0 },
  { id: 'steps', t: 7, pitch: 0.9, gain: 0.45, pan: 0.1 },
  { id: 'steps', t: 8.7, pitch: 0.9, gain: 0.4, pan: 0.1 },
  { id: 'cluck', t: 8.75, pitch: 1, gain: 0.5, pan: -0.5 },
  { id: 'cluck', t: 9.95, pitch: 1.05, gain: 0.55, pan: -0.4 },
  { id: 'cluck', t: 10.75, pitch: 1.1, gain: 0.6, pan: -0.3 },
  { id: 'appear', t: SPOT_AT, pitch: 1.3, gain: 0.6, pan: -0.2 },
  { id: 'strike', t: STRIKE_AT, pitch: 1, gain: 1, pan: 0 },
];

/** Used by the test: where the head would be next on the path. */
export const headPoint = (t: number): Pt => pathAt(headU(t));
