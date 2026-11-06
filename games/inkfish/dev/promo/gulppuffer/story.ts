import { bodyProportions } from '../../../src/art/fishArt';
import { FISH_RADIUS } from '../../../src/art/fish/kit';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { fishAt, type WorldFish } from '../gameplay/fish';
import { BAR_MARKS, fangAlarm, LOOP_S, seam, VIPER_LEN, VIPER_SIZE, type Caption, type SoundCue } from '../gape/story';
import { lipsOf } from '../gape/swimmer';

export type { Caption, SoundCue, WorldFish };
export { BAR_MARKS, captionAlpha } from '../gape/story';
export { LOOP_S, VIPER_LEN, VIPER_SIZE };
/** The puffer's "!" as it sees the teeth, staying up as the loop comes round (the same pop as the fangtooth's in gape/). */
export const puffAlarm = fangAlarm;

/**
 * "Never swallow a pufferfish": the fourth of the "how did that fit" series
 * (gape/, slurp/, lure/), with a twist: the meal wins. You are the viperfish,
 * ability `gape` (logic/abilities.ts: canSwallow lets it eat a 'peer', a fish
 * up to 1.1 times its own size). A pufferfish just under your size, smug,
 * is a peer, so in it goes, head first, easily. Then it does what puffers do
 * (species.ts: `puff`; the game puffs a fish up to 1.7 times its size, which
 * makes it a predator): it swells in the jaws, a heave at a time, until the
 * viper is a thin skin round a spiky ball; a beat of silence; POP. The viper
 * spits it out and shoots backwards, the puffer spins across the frame, lands,
 * deflates with a raspberry and looks back smugly. The viper narrows its eyes
 * and lunges again, which is frame 1. Nothing is eaten, so there is no
 * growth, no zoom: the camera is still and everything comes back to where it was.
 *
 * The world is the screen: px of the 1080 x 1920 video, the viper 450 long.
 *
 *   11.55 the lunge: the jaw swinging wide, the puffer (its "!" up) drawn to the lips
 *   0     mid-lunge: the jaws wide round the puffer's head, eyes narrowed, "!"
 *   0.9   in head first, half way, easy
 *   1.5   it starts to swell
 *   2.2   heave: swells; 3.0 heave: the jaw forced wider; 3.8 heave: huge, spines out, eyes crossing
 *   4.0   frozen, a beat of silence
 *   5.0   POP: the puffer flies out spinning, the viper shoots back, jaw limp, "+0"
 *   5.6   the puffer lands, deflates over ~2.4 s with a raspberry at ~6.3
 *   8.6   it looks back, smug; the viper shakes it off, narrows its eyes
 *   11.35 "!"; 11.55 the lunge.
 */

// ---------------------------------------------------------------- sizes, as the game has them

/** On screen the viper is this long (as in the other shorts). */
export const VIPER_PX = 450;
const ZOOM = VIPER_PX / VIPER_LEN;
/** A pufferfish just under the viper's size: a peer (0.9 .. 1.1 times), inside the species' 35 .. 55. */
export const PUFFER_SIZE = Math.round(VIPER_SIZE * 0.95);
/** How much the game puffs a puffer up (scenes/game/fish.ts: baseSize * 1.7): a predator to the viper. */
export const GAME_PUFF = 1.7;
/** The film puffs it further than that, for the joke. */
export const F_MAX = 2.0;
export const PUFFER_LEN = (PUFFER_SIZE / FISH_RADIUS) * 2 * bodyProportions('puffer').hl * ZOOM;

// ---------------------------------------------------------------- the beats

export const SUCK_FROM = 11.55;
export const HEAVES = [2.2, 3.0, 3.8] as const;
export const SWELL_AT = 1.5;
export const FREEZE_AT = 4.0;
export const POP_AT = 5.0;
export const LAND_AT = 5.8;
export const RASPBERRY_AT = 6.3;
export const TURN_AWAY = 7.6;
export const LOOK_BACK = 8.7;
export const SPOT_AT = 11.35;
/** How far the puffer's head is in at the start and when it settles (share of its deflated length). */
const D0 = 0.28;
const D1 = 0.55;

/** How far inflated the puffer is, 1 .. F_MAX: a slow start, a step at each heave, held (trembling) until the pop, then slowly let down. */
export function inflate(t: number): number {
  if (t >= POP_AT) return 1 + (F_MAX - 1) * (1 - ramp(t, 5.7, 7.8));
  const wobble = (h: number): number => 1 + 0.12 * Math.exp(-9 * Math.max(0, t - h - 0.3)) * Math.sin(30 * (t - h));
  let f = 1 + 0.12 * ramp(t, SWELL_AT, 2.15);
  f += 0.3 * ramp(t, HEAVES[0], HEAVES[0] + 0.3) * wobble(HEAVES[0]);
  f += 0.31 * ramp(t, HEAVES[1], HEAVES[1] + 0.3) * wobble(HEAVES[1]);
  f += 0.27 * ramp(t, HEAVES[2], HEAVES[2] + 0.3) * wobble(HEAVES[2]);
  return Math.min(F_MAX, f);
}
/** The same, 0 .. 1. */
export const swell = (t: number): number => clamp01((inflate(t) - 1) / (F_MAX - 1));

/** Seconds of "a beat of silence": no sound cue from the last heave's settle until the pop. */
export const SILENCE = [FREEZE_AT, POP_AT] as const;

// ---------------------------------------------------------------- the viper

const X0 = 360;
const Y0 = 800;
const VX: readonly Key[] = [
  { t: 0, at: X0, rate: 150 },
  { t: 0.5, at: X0 + 12, rate: 4 },
  { t: 1.2, at: X0 + 14 },
  { t: 3.0, at: X0 + 8 },
  { t: 4.9, at: X0 + 2, rate: 0 },
  { t: POP_AT, at: X0, rate: 0 },
  { t: 5.3, at: X0 - 40, rate: -90 },
  { t: 5.7, at: X0 - 48, rate: 0 },
  { t: 8.0, at: X0 - 44 },
  { t: 11.4, at: X0 - 40, rate: 20 },
  { t: 11.6, at: X0 - 38, rate: 0 },
  { t: LOOP_S, at: X0, rate: 150 },
];
const VY: readonly Key[] = [
  { t: 0, at: Y0 - 4, rate: -6 },
  { t: 1.5, at: Y0 },
  { t: 4.9, at: Y0 + 4, rate: 0 },
  { t: 5.3, at: Y0 - 22, rate: 0 },
  { t: 6.4, at: Y0 + 6 },
  { t: 11.4, at: Y0 - 2, rate: 0 },
  { t: LOOP_S, at: Y0 - 4, rate: -6 },
];

export function viperFish(t: number): WorldFish {
  const x = curveAt(VX, t);
  const y = curveAt(VY, t);
  return fishAt('viperfish', { x: x.at, y: y.at, vx: x.rate, vy: y.rate }, VIPER_PX, 1, 2, t);
}

/** The jaw: swung wide for the lunge, forced wider with the puffer's swelling, limp after the pop, shut while it glares, then the lunge. */
export function viperJaw(t: number): number {
  if (t < POP_AT) {
    const strain = 3 + 0.55 * swell(t);
    const heave = Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h) / 0.35)))) * 0.2;
    const shake = t > FREEZE_AT ? 0.05 * Math.sin(2 * Math.PI * 9 * t) : 0;
    return strain + heave + shake;
  }
  if (t < 11.5) {
    // Slack: it hangs, swinging; then it shuts as the viper shakes it off.
    const s = t - POP_AT;
    const hang = lerp(3.6, 1.7, ramp(t, POP_AT, POP_AT + 0.15)) + 0.4 * Math.exp(-3.5 * s) * Math.sin(15 * s);
    return hang * (1 - ramp(t, 7.0, 8.4));
  }
  return 3 * smooth((t - 11.5) / 0.4);
}

/** Water rushing into the open mouth: the lunge. */
export function suction(t: number): number {
  const u = seam(t);
  return u > -0.1 && u < 0.7 ? Math.min(ramp(u, -0.1, 0.15), 1 - ramp(u, 0.45, 0.7)) : 0;
}

export type EyeLook = 'squeeze' | 'bulge' | 'cross' | 'dizzy' | 'narrow' | null;
/** Narrowed for the lunge, squeezed on the first heave, then bulging, crossing as it freezes; dizzy after the pop; narrowed again as it shakes it off. */
export function viperEyes(t: number): EyeLook {
  if (t < 0.9) return 'narrow';
  if (t > HEAVES[0] - 0.05 && t < HEAVES[0] + 0.45) return 'squeeze';
  if (t >= HEAVES[1] - 0.05 && t < HEAVES[2] - 0.05) return 'bulge';
  if (t >= HEAVES[2] - 0.05 && t < POP_AT) return 'cross';
  if (t >= POP_AT && t < 6.6) return 'dizzy';
  if (t >= 9.0) return 'narrow';
  return null;
}

/** The jolt of a heave or the pop: 0 .. 1. */
export function jolt(t: number): number {
  for (const [at, k] of [...HEAVES.map((h) => [h + 0.1, 0.6] as const), [POP_AT, 1] as const]) {
    if (t > at - 0.02 && t < at + 0.14) return k * Math.sin((Math.PI * (t - at + 0.02)) / 0.16);
  }
  return 0;
}

/** Camera shake, px: the heaves and the pop. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  let x = 0;
  let y = 0;
  for (const j of [...HEAVES.map((h) => ({ at: h + 0.1, amp: 8 })), { at: POP_AT, amp: 24 }]) {
    const s = t - j.at;
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

// ---------------------------------------------------------------- the puffer

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The puffer's length now (deflated length times its swelling). */
export const pufferLength = (t: number): number => PUFFER_LEN * inflate(t);

/** A point of the viper's drawing (texture px, facing right) on screen: its head, which doesn't bend. */
function onViper(v: WorldFish, tex: Pt): Pt {
  const k = v.length / (2 * bodyProportions('viperfish').hl);
  const lx = (tex.x - 128) * k;
  const ly = (tex.y - 128) * k;
  const c = Math.cos(-v.tilt);
  const s = Math.sin(-v.tilt);
  return { x: v.x + v.facing * (lx * c - ly * s), y: v.y + lx * s + ly * c };
}

/** The viper's mouth: the middle of the lips, and the way down its throat. */
export function viperMouth(t: number): { readonly mid: Pt; readonly down: Pt } {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const d = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  return { mid, down: { x: (hinge.x - mid.x) / d, y: (hinge.y - mid.y) / d } };
}

/** How far the puffer's nose is past the lips, as a share of its deflated length: drawn in at the lunge, easily in, then pushed back a little by the swelling. */
export function insertion(t: number): number {
  if (t >= SUCK_FROM || t < 0.15) return D0;
  return lerp(D0, D1, ramp(t, 0.15, 0.95)) - 0.05 * swell(t);
}

function pufferIn(t: number, d: number): WorldFish {
  const { mid, down: u } = viperMouth(t);
  // Its nose `d` of its deflated length into the throat; the rest of it ahead of the lips.
  const back = pufferLength(t) / 2 - d * PUFFER_LEN;
  const thrash = 0.05 * Math.sin(2 * Math.PI * 6 * t + 1) * (1 - swell(t));
  return {
    shape: 'puffer', x: mid.x - u.x * back, y: mid.y - u.y * back, length: pufferLength(t), facing: -1,
    tilt: Math.atan2(-u.y, -u.x) + thrash, beat: 2 * Math.PI * 6 * t, effort: 0.8,
  };
}

/** Where the puffer rests once it has landed, and where it floats to, smugly, facing the viper's next lunge. */
const LANDED: Pt = { x: 780, y: 740 };
const WAITS: Pt = { x: 690, y: 800 };

function freePuffer(t: number): WorldFish {
  const f = pufferLength(t);
  let x: number;
  let y: number;
  let tilt = 0;
  let facing = -1;
  if (t < LAND_AT) {
    // Out of the mouth in an arc, spinning three times.
    const s = clamp01((t - POP_AT) / (LAND_AT - POP_AT));
    const e = 1 - (1 - s) ** 2;
    const from = pufferIn(POP_AT - 1e-6, D1 - 0.05 * 1);
    x = lerp(from.x, LANDED.x, e);
    y = lerp(from.y, LANDED.y, e) - 260 * Math.sin(Math.PI * e) ** 1.2;
    tilt = -6 * Math.PI * e;
  } else {
    const drift = ramp(t, 8.8, 10.9);
    const bob = Math.sin(2 * Math.PI * 0.75 * t);
    x = lerp(LANDED.x, WAITS.x, drift) + 6 * Math.sin(2 * Math.PI * 0.5 * t);
    y = lerp(LANDED.y, WAITS.y, drift) + 9 * bob;
    tilt = 0.06 * Math.sin(2 * Math.PI * 0.25 * t);
    // Turns its back in a huff, then looks back over its shoulder (a flip through edge-on).
    const away = ramp(t, TURN_AWAY, TURN_AWAY + 0.3) * (1 - ramp(t, LOOK_BACK, LOOK_BACK + 0.3));
    facing = 1 - 2 * (1 - away);
  }
  return { shape: 'puffer', x, y, length: f, facing: facing as 1 | -1, tilt, beat: 2 * Math.PI * 3 * t, effort: 0.5 };
}

export type PufferState =
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly squash: number; readonly stretch: number };

/** How the puffer is squeezed in the jaws: deep as the gape is wide, until it swells past that. */
const SQUEEZE = 0.7;

export function pufferAt(t: number): PufferState {
  const g = swell(t);
  const squeeze = lerp(SQUEEZE, 0.97, ramp(g, 0.1, 0.7));
  if (t >= POP_AT + 0.12 && t < SUCK_FROM) return { kind: 'swimming', fish: freePuffer(t) };
  if (t >= POP_AT && t < SUCK_FROM) {
    // Just out: still seen from inside the jaws.
    const u = ramp(t, POP_AT + 0.05, POP_AT + 0.12);
    return { kind: 'swallowed', fish: freePuffer(t), squash: lerp(0.97, 1, u), stretch: 1 };
  }
  if (t >= SUCK_FROM) {
    // Drawn from where it floats to the lips.
    const e = ((t - SUCK_FROM) / (LOOP_S - SUCK_FROM)) ** 1.6;
    const from = freePuffer(t);
    const to = pufferIn(t, D0);
    return {
      kind: 'swallowed', squash: lerp(1, SQUEEZE, e), stretch: 1 + 0.08 * e,
      fish: { ...to, x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), tilt: lerp(from.tilt, to.tilt, e), facing: -1 },
    };
  }
  return { kind: 'swallowed', fish: pufferIn(t, insertion(t)), squash: squeeze, stretch: lerp(1.08, 1, g) };
}

/** The swelling of the viper round the puffer: size 0 .. ~2.4 (3.4 times as deep), centre and length in body lengths. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  if (t >= POP_AT) return { size: 0.5 * Math.exp(-14 * (t - POP_AT)), at: 0.32, width: 0.5 };
  const g = swell(t);
  const inside = Math.max(0, insertion(t));
  const base = Math.min(1, ramp(t, 0.1, 0.9)) * 0.55 * (1 - g);
  return { size: base + 2.3 * g ** 0.9, at: 0.18 + 0.1 * inside + 0.1 * g, width: 0.28 + 0.45 * inside + 0.35 * g };
}

/** The raspberry: the puffer's tongue out, 0 .. 1. */
export const raspberry = (t: number): number => window01(t, RASPBERRY_AT, RASPBERRY_AT + 0.9, 0.12);

/** The puffer's smug lids: down over its eyes when it is deflated and pleased with itself. */
export const smug = (t: number): number => (1 - ramp(swell(t), 0.05, 0.3)) * (t >= POP_AT && t < LOOK_BACK ? 0 : 1);

// ---------------------------------------------------------------- the camera

/** The camera: still but for a punch-in on the lunge and a pull-back to fit the swelling puffer; it ends where it starts. */
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
const ZOOM_KEYS: readonly Key[] = [
  { t: 0, at: 1.3, rate: 0 },
  { t: 1.2, at: 1.3 },
  { t: 2.4, at: 1.15 },
  { t: 3.8, at: 0.94 },
  { t: 5.0, at: 0.92, rate: 0 },
  { t: 5.8, at: 0.86 },
  { t: 7.6, at: 0.95 },
  { t: 10.0, at: 1.15 },
  { t: LOOP_S, at: 1.3, rate: 0 },
];
const CX_KEYS: readonly Key[] = [
  { t: 0, at: 480, rate: 0 },
  { t: 1.2, at: 500 },
  { t: 3.8, at: 600 },
  { t: 5.0, at: 610, rate: 0 },
  { t: 5.8, at: 585 },
  { t: 8.0, at: 535 },
  { t: 10.0, at: 515 },
  { t: LOOP_S, at: 480, rate: 0 },
];
const CY_KEYS: readonly Key[] = [
  { t: 0, at: 800, rate: 0 },
  { t: 2.4, at: 800 },
  { t: 3.8, at: 836 },
  { t: 5.0, at: 836, rate: 0 },
  { t: 7.6, at: 800 },
  { t: LOOP_S, at: 800, rate: 0 },
];
export const FOCUS = { x: 540, y: 800 } as const;
export const viewAt = (t: number): View => ({ x: curveAt(CX_KEYS, t).at, y: curveAt(CY_KEYS, t).at, zoom: curveAt(ZOOM_KEYS, t).at });
/** Where the camera shows a world point. */
export const toScreen = (p: Pt, v: View): Pt => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });

// ---------------------------------------------------------------- the score and the bar

/** Nothing eaten: the score is +0, floating up as the viper shoots back. */
export const SCORE_TEXT = '+0';
export const SCORE_AT = POP_AT + 0.1;

/** The growth bar: part way through the third stage, and it stays there. */
export const growthBar = (_t: number): { readonly fill: number; readonly alpha: number } => ({ fill: BAR_MARKS[2]! - 0.1, alpha: 1 });

// ---------------------------------------------------------------- words and sounds

export const CAPTIONS: readonly Caption[] = [
  { text: 'easy meal', y: 380, size: 120, from: 0.2, to: 2.0 },
  { text: 'wait', y: 380, size: 124, from: 2.1, to: 2.85 },
  { text: 'WAIT', y: 400, size: 190, from: 2.9, to: 4.9 },
  { text: 'how did THAT\nnot fit', y: 350, size: 118, from: 5.5, to: 8.9 },
  { text: 'one more try', y: 380, size: 124, from: 9.7, to: 11.4 },
];

export const SOUNDS: readonly SoundCue[] = [
  // The lunge, the puffer going in easily.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.7, pan: 0.1 },
  { id: 'eat', t: 0.7, pitch: 0.5, gain: 0.7, pan: 0.15 },
  { id: 'rustle', t: 1.0, pitch: 0.9, gain: 0.3, pan: 0.3 },
  // It starts to swell.
  { id: 'grow', t: 1.6, pitch: 2.2, gain: 0.25, pan: 0.2 },
  // Heave one, two, three: each swells further.
  { id: 'suck', t: HEAVES[0], pitch: 0.5, gain: 0.6, pan: 0.1 },
  { id: 'grow', t: HEAVES[0] + 0.05, pitch: 1.7, gain: 0.45, pan: 0.2 },
  { id: 'suck', t: HEAVES[1], pitch: 0.45, gain: 0.7, pan: 0.1 },
  { id: 'grow', t: HEAVES[1] + 0.05, pitch: 1.35, gain: 0.55, pan: 0.2 },
  { id: 'clang', t: HEAVES[1] + 0.1, pitch: 0.3, gain: 0.1, pan: 0.1 },
  { id: 'suck', t: HEAVES[2], pitch: 0.4, gain: 0.8, pan: 0.1 },
  { id: 'grow', t: HEAVES[2] + 0.05, pitch: 1.0, gain: 0.65, pan: 0.2 },
  { id: 'clang', t: HEAVES[2] + 0.1, pitch: 0.25, gain: 0.14, pan: 0.1 },
  // Silence from the freeze to the pop (the hum is all there is).
  // POP: the bang, the puffer whistling away, the viper flung back.
  { id: 'boom', t: POP_AT, pitch: 1.3, gain: 0.9, pan: 0 },
  { id: 'smash', t: POP_AT, pitch: 1.2, gain: 0.4, pan: 0 },
  { id: 'lunge', t: POP_AT + 0.05, pitch: 1.1, gain: 0.7, pan: 0.5 },
  { id: 'dash', t: POP_AT + 0.1, pitch: 1.5, gain: 0.5, pan: -0.3 },
  { id: 'hurt', t: POP_AT + 0.12, pitch: 0.7, gain: 0.35, pan: -0.3 },
  { id: 'splash', t: LAND_AT - 0.1, pitch: 0.9, gain: 0.3, pan: 0.5 },
  // The raspberry, and the air hissing out.
  { id: 'rustle', t: 5.9, pitch: 2.4, gain: 0.22, pan: 0.4 },
  { id: 'yuck', t: RASPBERRY_AT, pitch: 1.9, gain: 0.35, pan: 0.5 },
  { id: 'yuck', t: RASPBERRY_AT + 0.18, pitch: 1.7, gain: 0.35, pan: 0.5 },
  { id: 'yuck', t: RASPBERRY_AT + 0.4, pitch: 1.5, gain: 0.3, pan: 0.5 },
  { id: 'rustle', t: 7.0, pitch: 2.2, gain: 0.15, pan: 0.4 },
  // The viper shakes it off, narrows its eyes; the puffer looks back.
  { id: 'rustle', t: 8.0, pitch: 0.7, gain: 0.3, pan: -0.3 },
  { id: 'click', t: LOOK_BACK + 0.2, pitch: 1.2, gain: 0.3, pan: 0.5 },
  { id: 'click', t: 9.2, pitch: 0.45, gain: 0.35, pan: -0.2 },
  // The "!", the lunge.
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.5, pan: 0.3 },
  { id: 'lunge', t: SUCK_FROM, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: SUCK_FROM + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
