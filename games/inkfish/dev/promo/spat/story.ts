import type { SfxId } from '../../../src/audio/recipes';
import { pitchForSize } from '../../../src/audio/recipes';
import { ABILITY, ABILITY_INFO } from '../../../src/logic/abilities';
import { scoreFor } from '../../../src/logic/sizing';
import { mouthOf, NOSE } from '../chain';
import { suckedIn } from '../effects';
import { asPose, facingAt, fishAt, seamTime, type View, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey } from '../gameplay/zoomPath';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';

export type { View, WorldFish };

/**
 * "He spat me out": chapter 3 of the game (the kelp forest), played as a
 * highlight. You are the perch fry, whose spiny fin is its ability: once
 * every 12 s, a bite gets pricked and spat out instead of costing a life
 * (GameScene.spines: the biter is stunned for 2.2 s and knocked back, and
 * "Spines!" floats up in the game's blue). The biter is a sheephead, one of
 * the chapter's real hunters (the lingcod is the boss, and spines don't work
 * on bosses). The loop is 12 s, the spines' cooldown, so they're ready again
 * when he comes back for round two.
 *
 *   0     the sheephead's jaws snap shut just behind your tail. You dash.
 *   0.3   the chase: you flee through the kelp, the camera following
 *   2.7   he lunges; the water rushes in; gulp at 3.15
 *   3.15  he coasts, smug, eyes shut, you a lump in his cheek; two chews
 *   4.45  pricked: he shudders, eyes squeezed, cheeks puffed
 *   4.85  he spits you out: you tumble free, "Spines!", "not today."
 *   4.85  he's stunned (pale and lilac, as in the game), sinking, wobbling
 *   6.2   you turn and swim off; a sardine at 8.3 ("+100")
 *   7.05  he comes round, shakes it off, and circles back behind you
 *   11.35 "!": he's coming again, which is where the loop began.
 *
 * Positions are world px; the camera pans with the chase and back (it never
 * zooms), so the screen at the end is the screen at the start.
 */
export const LOOP_S = 12;

/** The spines' cooldown, and the stun they give, from the game. */
export const SPINES_COOLDOWN_S = ABILITY_INFO.spines.cooldownMs / 1000;
export const STUN_S = ABILITY.spineStunMs / 1000;

export const FRY_LEN = 200;
export const HUNTER_LEN = 600;
const SARDINE_LEN = 140;

export const MISS_AT = 0.3;
export const LUNGE_AT = 2.7;
export const SUCK_FROM = 2.9;
export const GULP_AT = 3.15;
const CHEWS = [3.6, 3.95] as const;
export const PRICK_AT = 4.45;
export const SPIT_AT = 4.85;
/** The fry has stopped tumbling by then. */
const TUMBLE_END = 5.9;
export const STUN_END = SPIT_AT + STUN_S;
export const SNACK_AT = 8.3;
export const SPOT_AT = 11.35;

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seam = (t: number): number => seamTime(t, LOOP_S);

/** Turning round takes this long: the fish squashes edge-on and flips at the midpoint, as in the game. */
const TURN_S = 0.26;

/** How squashed a fish is by a turn (1 none .. ~0.15 edge-on), from its list of turns. */
function turnSqueeze(turns: readonly (readonly [number, 1 | -1])[], t: number): number {
  let squeeze = 1;
  for (const [at] of turns.slice(1)) {
    const u = Math.abs(t - at) / (TURN_S / 2);
    if (u < 1) squeeze = Math.min(squeeze, 0.15 + 0.85 * smooth(u));
  }
  return squeeze;
}

// ---------------------------------------------------------------- the camera

/** The camera follows the chase left, holds for the spit, and follows you back right. */
const cameraPath = zoomLoopPath([
  { t: 0, x: 0, y: 0 },
  { t: 1.5, x: -380, y: 10 },
  { t: 3.0, x: -820, y: 10 },
  { t: 4.4, x: -1040, y: 0 },
  { t: 5.7, x: -1060, y: 0, vx: 0, vy: 0 },
  { t: 6.8, x: -960, y: -10 },
  { t: 8.4, x: -560, y: -20 },
  { t: 9.9, x: -150, y: -10 },
  { t: 11.1, x: 10, y: 0, vx: 0, vy: 0 },
], LOOP_S, 1);

export function viewAt(t: number): View {
  const c = cameraPath(t);
  return { x: c.x, y: c.y, zoom: 1 };
}

// ---------------------------------------------------------------- the sheephead

const HUNTER_KEYS: readonly PathKey[] = [
  { t: 0, x: 330, y: -30 },
  { t: 0.6, x: 120, y: -5 },
  { t: 1.3, x: -110, y: 45 },
  { t: 2.0, x: -330, y: 40 },
  { t: LUNGE_AT, x: -520, y: 10 },
  { t: GULP_AT, x: -735, y: -5 },
  { t: 3.7, x: -830, y: -12 },
  { t: PRICK_AT, x: -855, y: -15, vx: 0, vy: 0 },
  { t: SPIT_AT, x: -855, y: -15, vx: 0, vy: 0 },
  // Knocked back by the spit, then sinking, stunned.
  { t: 5.25, x: -770, y: 10 },
  { t: 5.9, x: -735, y: 50 },
  { t: STUN_END, x: -715, y: 120, vx: 0, vy: 40 },
  { t: 7.6, x: -700, y: 140, vx: 0, vy: 0 },
  // Comes round, overtakes you low down, and turns back at the right edge.
  { t: 8.6, x: -470, y: 95 },
  { t: 9.4, x: -60, y: 80 },
  { t: 10.15, x: 430, y: 60 },
  { t: 10.75, x: 640, y: 40, vx: 0 },
  { t: 11.4, x: 520, y: 0 },
];
const hunterPath = zoomLoopPath(HUNTER_KEYS, LOOP_S, 1);
const HUNTER_TURNS = [[0, -1], [7.85, 1], [10.75, -1]] as const;

/** 1 drawn as a hunter (heavy ink); 0 stunned (the game draws a stunned fish light, tinted lilac). */
export function hunterMenace(t: number): number {
  return 1 - Math.min(ramp(t, SPIT_AT + 0.12, SPIT_AT + 0.22), 1 - ramp(t, STUN_END - 0.1, STUN_END));
}

/** The stunned wobble (the game's), and a head shake as he comes round. */
function hunterWobble(t: number): number {
  const stunned = window01(t, SPIT_AT + 0.1, STUN_END, 0.2);
  const shakeOff = t > STUN_END && t < STUN_END + 0.6 ? 0.22 * Math.sin(28 * (t - STUN_END)) * (1 - (t - STUN_END) / 0.6) : 0;
  return 0.2 * stunned * Math.sin(9 * t) + shakeOff;
}

/** The shudder as the spines go in: a fast side-to-side twitch, px. */
export function hunterShudder(t: number): number {
  const s = t - PRICK_AT;
  if (s < 0 || s > SPIT_AT - PRICK_AT) return 0;
  return 9 * Math.sin(s * 2 * Math.PI * 10) * (1 - 0.5 * s / (SPIT_AT - PRICK_AT));
}

export function hunterFish(t: number): WorldFish {
  const p = hunterPath(t);
  const f = fishAt('sheephead', p, HUNTER_LEN, facingAt(HUNTER_TURNS, t), 2, t);
  const stunned = 1 - hunterMenace(t);
  return {
    ...f,
    x: f.x + hunterShudder(t),
    tilt: f.tilt + hunterWobble(t),
    effort: lerp(f.effort, 0.35, stunned),
  };
}

/** The sheephead's jaw: wide for the lunge across the seam (snapped shut on the miss), wide again for the catch, two chews, clenched when pricked, gaping as he spits, hanging open while dazed. */
export function hunterJaw(t: number): number {
  const u = seam(t);
  if (u > -0.7 && u < MISS_AT) return u < -0.1 ? 0.9 * ramp(u, -0.7, -0.1) : u < MISS_AT - 0.06 ? 0.9 : 0.9 * (1 - ramp(u, MISS_AT - 0.06, MISS_AT));
  if (t > LUNGE_AT - 0.2 && t < GULP_AT) return t < GULP_AT - 0.05 ? ramp(t, LUNGE_AT - 0.2, SUCK_FROM) : 1 - ramp(t, GULP_AT - 0.05, GULP_AT);
  for (const c of CHEWS) if (t > c && t < c + 0.2) return 0.22 * Math.sin((Math.PI * (t - c)) / 0.2);
  if (t >= SPIT_AT && t < STUN_END + 0.3) {
    const s = t - SPIT_AT;
    if (s < 0.07) return ramp(s, 0, 0.07);
    if (s < 0.3) return 1;
    return lerp(1, 0.3, ramp(s, 0.3, 0.8)) * (1 - ramp(t, STUN_END, STUN_END + 0.3));
  }
  return 0;
}

/** His eyes: shut smugly with you inside, squeezed tight as the spines go in. */
export function hunterEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= GULP_AT + 0.2 && t < PRICK_AT) return 'happy';
  if (t >= PRICK_AT && t < SPIT_AT + 0.35) return 'squeeze';
  return null;
}

/** You in his mouth, then his cheeks puffing as the spines go in. */
export function hunterLump(t: number): { readonly size: number; readonly at: number } {
  if (t < GULP_AT || t >= SPIT_AT + 0.05) return { size: 0, at: 0.2 };
  const settle = ramp(t, GULP_AT, GULP_AT + 0.15);
  const puff = ramp(t, PRICK_AT, PRICK_AT + 0.15) * (1 + 0.15 * Math.sin(40 * (t - PRICK_AT)));
  return { size: 0.75 * settle + 0.9 * puff, at: lerp(0.2, 0.14, puff) };
}

/** Squash and stretch: the gulp's jolt, a puffed-up pricked shudder, the spit's lurch. */
export function hunterSquash(t: number): { readonly squash: number; readonly stretch: number } {
  let squash = 1;
  let stretch = 1;
  const g = t - GULP_AT;
  if (g > 0 && g < 0.16) {
    const k = Math.sin((Math.PI * g) / 0.16);
    squash -= 0.08 * k;
    stretch += 0.05 * k;
  }
  const p = window01(t, PRICK_AT, SPIT_AT, 0.08);
  squash += 0.07 * p;
  stretch -= 0.04 * p;
  const s = t - SPIT_AT;
  if (s > 0 && s < 0.25) {
    const k = Math.sin((Math.PI * s) / 0.25);
    squash -= 0.1 * k;
    stretch += 0.1 * k;
  }
  return { squash, stretch: stretch * turnSqueeze(HUNTER_TURNS, t) };
}

// ---------------------------------------------------------------- you, the perch fry

/** Where you're caught: the sheephead's mouth meets you as the water rushes in. */
const FRY_CHASE_KEYS: readonly PathKey[] = [
  { t: 0, x: -120, y: -40, vx: -520, vy: 30 },
  { t: 0.6, x: -390, y: 0 },
  { t: 1.3, x: -590, y: 60 },
  { t: 2.0, x: -790, y: 40 },
  { t: 2.6, x: -960, y: 5 },
  { t: SUCK_FROM, x: -1030, y: -10 },
];

/** The spit: from his mouth, you tumble out ahead of him, slowing to a stop. */
const SPIT_FROM = (() => {
  const h = asPose(hunterFishNoShudder(SPIT_AT));
  return mouthOf(h);
})();
const SPIT_TO = { x: SPIT_FROM.x - 175, y: SPIT_FROM.y + 35 } as const;

const FRY_SWIM_KEYS: readonly PathKey[] = [
  { t: 6.0, x: SPIT_TO.x, y: SPIT_TO.y, vx: 0, vy: 0 },
  { t: 6.7, x: SPIT_TO.x + 120, y: SPIT_TO.y - 80 },
  { t: 7.5, x: -940, y: -170 },
  { t: SNACK_AT, x: -700, y: -200 },
  { t: 9.1, x: -480, y: -190 },
  { t: 9.9, x: -270, y: -140 },
  { t: 10.7, x: -110, y: -90 },
  { t: SPOT_AT, x: -20, y: -60 },
  { t: 11.55, x: 0, y: -55, vx: 0, vy: 0 },
];
const fryPath = zoomLoopPath([...FRY_CHASE_KEYS, ...FRY_SWIM_KEYS], LOOP_S, 1);
const FRY_TURNS = [[0, -1], [6.25, 1], [11.6, -1]] as const;

function hunterFishNoShudder(t: number): WorldFish {
  return fishAt('sheephead', hunterPath(t), HUNTER_LEN, facingAt(HUNTER_TURNS, t), 2, t);
}

/** Your tumble out of his mouth: 0 .. 1, easing to a stop. */
const tumble = (t: number): number => 1 - (1 - clamp01((t - SPIT_AT) / (TUMBLE_END - SPIT_AT))) ** 3;

/** You, swimming (or tumbling); null while inside him. */
function fryFish(t: number): WorldFish {
  const facing = facingAt(FRY_TURNS, t);
  if (t >= SPIT_AT && t < 6.0) {
    const u = tumble(t);
    // An arc: shot forward, dropping a little, spinning twice over, upright again at the end.
    const x = lerp(SPIT_FROM.x, SPIT_TO.x, u);
    const y = lerp(SPIT_FROM.y, SPIT_TO.y, u) - 40 * Math.sin(Math.PI * u);
    const pop = 0.6 + 0.4 * ramp(t, SPIT_AT, SPIT_AT + 0.15);
    return {
      shape: 'perchfry', x, y, length: FRY_LEN * pop, facing, tilt: 2 * Math.PI * 2 * u,
      beat: 2 * Math.PI * 4 * t, effort: 0.25,
    };
  }
  return fishAt('perchfry', fryPath(t), FRY_LEN, facing, 4, t);
}

export type FryState =
  | { readonly kind: 'inside' }
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly stretch: number; readonly squash: number }
  | { readonly kind: 'spat'; readonly fish: WorldFish; readonly inMouth: boolean };

export function fryAt(t: number): FryState {
  if (t >= GULP_AT && t < SPIT_AT) return { kind: 'inside' };
  const fish = fryFish(t);
  if (t >= SUCK_FROM && t < GULP_AT) {
    const [pose, look] = suckedIn(asPose(fish), asPose(hunterFish(t)), (t - SUCK_FROM) / (GULP_AT - SUCK_FROM));
    return { kind: 'swallowed', fish: { ...fish, x: pose.x, y: pose.y, length: pose.length, tilt: pose.tilt }, ...look };
  }
  if (t >= SPIT_AT && t < TUMBLE_END) return { kind: 'spat', fish, inMouth: t < SPIT_AT + 0.1 };
  return { kind: 'swimming', fish };
}

/** Your squash and stretch: a turn's squeeze, and a burst of stretch as you dash. */
export function frySquash(t: number): { readonly squash: number; readonly stretch: number } {
  return { squash: 1, stretch: turnSqueeze(FRY_TURNS, t) };
}

/** Your eyes: squeezed shut, dizzy, as you tumble; pleased with the sardine. */
export function fryEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= SPIT_AT && t < 5.6) return 'squeeze';
  if (t >= SNACK_AT + 0.05 && t < SNACK_AT + 0.75) return 'happy';
  return null;
}

// ---------------------------------------------------------------- the sardines

/** Prey are dragged into your mouth over this long before the gulp. */
const SUCK = 0.18;

export function fryJaw(t: number): number {
  if (t > SNACK_AT - 0.3 && t < SNACK_AT + 0.05) return t < SNACK_AT ? 0.75 * ramp(t, SNACK_AT - 0.3, SNACK_AT - SUCK) : 0.75 * (1 - ramp(t, SNACK_AT, SNACK_AT + 0.05));
  return 0;
}

interface Sardine {
  /** Where it ends up relative to the eaten one's spot (world px), and when it shows up. */
  readonly offset: { readonly x: number; readonly y: number };
  readonly eaten: boolean;
}

/** A little school coming head-on; you take the first, the others flinch past. */
const SCHOOL: readonly Sardine[] = [
  { offset: { x: 0, y: 0 }, eaten: true },
  { offset: { x: 130, y: -95 }, eaten: false },
  { offset: { x: 210, y: 70 }, eaten: false },
];
const SCHOOL_ENTER = 6.7;

/** Where the eaten sardine waits: just in front of your mouth as the suction starts. */
const SNACK_SPOT = (() => {
  const you = asPose(fryFish(SNACK_AT - SUCK));
  const m = mouthOf(you);
  return { x: m.x + you.facing * 0.12 * you.length, y: m.y };
})();

export type SardineState =
  | { readonly kind: 'swimming'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly stretch: number; readonly squash: number };

export function sardinesAt(t: number): SardineState[] {
  if (t < SCHOOL_ENTER || t > 10.6) return [];
  const out: SardineState[] = [];
  SCHOOL.forEach((s, i) => {
    if (s.eaten && t >= SNACK_AT) return;
    // Swims in from the right, easing to where it meets you.
    const arrive = smooth((t - SCHOOL_ENTER) / (SNACK_AT - SUCK - SCHOOL_ENTER));
    const base = { x: SNACK_SPOT.x + s.offset.x + 620 * (1 - arrive), y: SNACK_SPOT.y + s.offset.y };
    // The survivors dart on past you after the gulp.
    const flee = s.eaten ? 0 : Math.max(0, t - SNACK_AT + 0.1);
    const x = base.x - 520 * flee - 30 * flee * flee;
    const y = base.y + Math.sign(s.offset.y) * 60 * Math.min(1, flee * 2);
    const fish: WorldFish = {
      shape: 'sardine', x, y, length: SARDINE_LEN, facing: -1, tilt: -Math.sign(s.offset.y) * 0.3 * Math.min(1, flee * 3),
      beat: 2 * Math.PI * 5 * t + i, effort: flee > 0 ? 1 : 0.6,
    };
    if (s.eaten && t >= SNACK_AT - SUCK) {
      const [pose, look] = suckedIn(asPose(fish), asPose(fryFish(t)), (t - (SNACK_AT - SUCK)) / SUCK);
      out.push({ kind: 'swallowed', fish: { ...fish, x: pose.x, y: pose.y, length: pose.length, tilt: pose.tilt }, ...look });
      return;
    }
    out.push({ kind: 'swimming', fish });
  });
  return out;
}

// ---------------------------------------------------------------- "!", "Spines!", "+100", the HUD

/** An inked "!" popping up: 0 hidden .. 1, overshooting as it pops, then gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.12 ? smooth(since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - ((since - 0.12) / 0.06));
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** Your "!" as he comes again, staying up as the loop comes round. */
export const fryAlarm = (t: number): number => pop(seam(t) + (LOOP_S - SPOT_AT), LOOP_S - SPOT_AT + 0.6);

export interface FloatText {
  readonly text: string;
  readonly at: number;
  readonly life: number;
  readonly size: number;
  /** Where it appears, world px; it rises from there. */
  readonly x: number;
  readonly y: number;
}

/** The game's "Spines!" (in its blue, rising from you as you're spat out) and the sardine's score (size 10 scores 100). */
export const FLOATS: readonly FloatText[] = [
  { text: 'Spines!', at: SPIT_AT + 0.05, life: 1.1, size: 84, x: SPIT_FROM.x - 60, y: SPIT_FROM.y - 120 },
  { text: `+${scoreFor(10, 1)}`, at: SNACK_AT, life: 0.9, size: 66, x: SNACK_SPOT.x - 40, y: SNACK_SPOT.y - 140 },
];

/** Where the spines went in: the game's ring of short pen strokes, growing and fading over 0.5 s. 0 .. 1, or null. */
export function spikeBurst(t: number): number | null {
  const s = (t - PRICK_AT) / 0.5;
  return s >= 0 && s <= 1 ? s : null;
}

/** The growth bar, like the game's: up a notch with the sardine; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  return { fill: lerp(0.42, 0.5, ramp(t, SNACK_AT, SNACK_AT + 0.2)), alpha: window01(t, 5.3, 10.9, 0.4) };
}
export const BAR_MARKS = [0.3, 0.6] as const;

/** Camera shake, px. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const jolts = [{ at: MISS_AT, amp: 8 }, { at: GULP_AT, amp: 14 }, { at: PRICK_AT, amp: 12 }, { at: SPIT_AT, amp: 16 }];
  let x = 0;
  let y = 0;
  for (const j of jolts) {
    const s = t - j.at;
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
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

export const CAPTIONS: readonly Caption[] = [
  { text: 'he picked the wrong fish', y: 370, size: 100, from: -0.9, to: 4.3 },
  { text: 'not today.', y: 390, size: 140, from: 5.0, to: 7.9 },
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

export const SOUNDS: readonly SoundCue[] = [
  // The miss: jaws clack shut behind you, and you're off.
  { id: 'eat', t: MISS_AT, pitch: 0.45, gain: 0.7, pan: 0.1 },
  { id: 'dash', t: MISS_AT + 0.05, pitch: 1.2, gain: 0.45, pan: -0.2 },
  { id: 'dash', t: 1.5, pitch: 1.1, gain: 0.35, pan: -0.3 },
  // The catch.
  { id: 'lunge', t: LUNGE_AT, pitch: 0.8, gain: 0.8, pan: 0 },
  { id: 'suck', t: LUNGE_AT + 0.05, pitch: 1.1, gain: 0.5, pan: -0.1 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.75, gain: 1, pan: -0.1 },
  ...CHEWS.map((c): SoundCue => ({ id: 'eat', t: c + 0.05, pitch: 0.6, gain: 0.4, pan: -0.1 })),
  // Pricked (the game's own spines sound: a clang, pitched up), and spat.
  { id: 'clang', t: PRICK_AT, pitch: 1.4, gain: 0.9, pan: -0.1 },
  { id: 'hurt', t: PRICK_AT + 0.03, pitch: 0.7, gain: 0.5, pan: 0 },
  { id: 'yuck', t: SPIT_AT, pitch: 0.8, gain: 0.6, pan: -0.1 },
  { id: 'dash', t: SPIT_AT + 0.02, pitch: 1.4, gain: 0.5, pan: -0.3 },
  // Dazed, then back for more.
  { id: 'drop', t: STUN_END, pitch: 0.6, gain: 0.35, pan: 0.1 },
  { id: 'eat', t: SNACK_AT, pitch: pitchForSize(10), gain: 0.7, pan: 0 },
  { id: 'dash', t: 8.1, pitch: 0.8, gain: 0.3, pan: 0.2 },
  { id: 'lunge', t: 10.9, pitch: 0.6, gain: 0.45, pan: 0.3 },
  { id: 'spotted', t: SPOT_AT, pitch: 1.3, gain: 0.5, pan: 0 },
  { id: 'lunge', t: 11.7, pitch: 0.75, gain: 0.8, pan: 0.2 },
];

/** Exposed for the tests: where the spit starts and the snack waits. */
export const SPOTS = { spitFrom: SPIT_FROM, snack: SNACK_SPOT, nose: NOSE } as const;
