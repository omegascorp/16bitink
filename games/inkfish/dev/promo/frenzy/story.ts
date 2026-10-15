import { pitchForSize, type SfxId } from '../../../src/audio/recipes';
import { DEMO_CHAPTER } from '../../../src/levels/demo';
import type { LevelDef } from '../../../src/levels/types';
import { drainFrenzy, feedFrenzy, frenzyLabel, frenzyMultiplier, initialFrenzy, MAX_MULTIPLIER, type FrenzyState } from '../../../src/logic/frenzy';
import { growthGoal } from '../../../src/logic/growth';
import { createRng } from '../../../src/logic/rng';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import { mouthOf } from '../chain';
import { lerp, ramp, smooth, window01 } from '../short';
import { asPose, fishAt, type WorldFish } from '../gameplay/fish';
import { zoomLoopPath, type PathKey } from '../gameplay/zoomPath';

export type { WorldFish };

/**
 * "Me at the all-you-can-eat buffet": the frenzy combo from the game's
 * School Rush level (chapter 1, level 5, where the minnow school comes in
 * two and a half times as thick). A school streams in head-on and you plough
 * into it, jaws open, eating minnow after minnow. Each meal floats its score
 * in blue, the multiplier climbs (the game's own frenzy rules, run on the
 * game's own functions), the red combo bar fills and the sound climbs, until
 * a double gulp tips it to x5: "INK FRENZY!". The rest of the school bolts.
 * You coast, happy; then the next school sweeps in, which is the first frame.
 *
 * Story time `s` runs from -2.5 to 6.5 (the loop's 9 s), so the loop point
 * sits at s = 0 in the middle of the action and every beat is continuous
 * across it; s jumps back only at t = 6.5, in the quiet after the frenzy,
 * when the school is gone and nothing on screen depends on it.
 *
 *   -2.4  "just one more plate…"; the next school sweeps in from the right
 *   -0.6  you dash at it, jaws opening
 *    0    (the loop point) "me at the all-you-can-eat buffet"; a minnow at your lips
 *    0.2  +110            1.15 +90 (x2)       2.0  +240 x2
 *    2.65 +200 x2 (x3)    3.25 +390 x3 (x4)   3.75 +440 x4
 *    4.3  two at once: +480 x4, +700 x5, "x5 INK FRENZY!"; the school bolts
 *    5.8  the shout fades; you coast, happy, burping bubbles, the combo bar draining
 *    6.3  the HUD fades; the water is empty (story time wraps at 6.5)
 *
 * Positions are screen px (the camera follows you; the water drifts by).
 */
export const LOOP_S = 9;
/** Story time runs [WRAP_AT - LOOP_S, WRAP_AT). */
const WRAP_AT = 6.5;

/** Story time at loop time t. */
export function storyTime(t: number): number {
  const u = ((t % LOOP_S) + LOOP_S) % LOOP_S;
  return u >= WRAP_AT ? u - LOOP_S : u;
}
/** Loop time of a story moment. */
export const loopTime = (s: number): number => (s < 0 ? s + LOOP_S : s);

/** The game's School Rush level, whose numbers this short uses. */
export const LEVEL: LevelDef = DEMO_CHAPTER.levels.find((l) => l.id === 'school-rush')!;
/** The level's staple prey (minnows, boosted by the rush twist) and their size range. */
export const STAPLE = LEVEL.spawns[0]!;

/** Your length on screen at the first growth stage; every fish is sized from it by the game's radii. */
export const PLAYER_LEN = 200;
export const PX_PER_SIZE = PLAYER_LEN / LEVEL.playerSizes[0]!;
export const lengthOf = (size: number): number => size * PX_PER_SIZE;

/** How fast the water drifts past as you swim, px/s: one tile of marks over the loop. */
export const DRIFT = 1500 / LOOP_S;

// ---------------------------------------------------------------- the meals and the frenzy

interface MealPlan {
  readonly at: number;
  /** The minnow's size (the game's radius). */
  readonly size: number;
  /** Where it waits for the suction, from your lips, in your lengths. */
  readonly dx: number;
  readonly dy: number;
}

/** Faster and faster, then two at once. */
const PLAN: readonly MealPlan[] = [
  { at: 0.2, size: 11, dx: 0.1, dy: 0 },
  { at: 1.15, size: 9, dx: 0.1, dy: 0 },
  { at: 2.0, size: 12, dx: 0.1, dy: 0 },
  { at: 2.65, size: 10, dx: 0.1, dy: 0 },
  { at: 3.25, size: 13, dx: 0.1, dy: 0 },
  { at: 3.75, size: 11, dx: 0.1, dy: 0 },
  { at: 4.3, size: 12, dx: 0.06, dy: -0.15 },
  { at: 4.3, size: 14, dx: 0.2, dy: 0.13 },
];

export interface Meal extends MealPlan {
  /** The multiplier the meal scores at, and the one it leaves you on. */
  readonly mult: number;
  readonly combo: number;
  readonly gained: number;
  /** The blue text the game floats over it. */
  readonly text: string;
  /** The meter just after it. */
  readonly meter: number;
}

/** The meals run through the game's frenzy functions exactly as GameScene.feed() does: drain since the last meal, score at the current multiplier, then feed. */
export const MEALS: readonly Meal[] = (() => {
  let state: FrenzyState = initialFrenzy;
  let last = PLAN[0]!.at;
  return PLAN.map((p) => {
    state = drainFrenzy(state, p.at - last);
    last = p.at;
    const mult = frenzyMultiplier(state);
    const gained = scoreFor(p.size, mult);
    state = feedFrenzy(state);
    const combo = frenzyMultiplier(state);
    return { ...p, mult, combo, gained, text: mult > 1 ? `+${gained} ×${mult}` : `+${gained}`, meter: state.meter };
  });
})();

/** When the meter tops out: x5, "INK FRENZY!". */
export const FRENZY_AT = MEALS.find((m) => m.combo === MAX_MULTIPLIER)!.at;
/** The distinct gulp times (the double gulp is one). */
export const GULPS: readonly number[] = [...new Set(MEALS.map((m) => m.at))];

/** The combo meter at story time s (0 before the run starts), draining as the game drains it. */
export function meterAt(t: number): number {
  const s = storyTime(t);
  let meter = 0;
  let since = 0;
  for (const m of MEALS) if (s >= m.at) { meter = m.meter; since = s - m.at; }
  return drainFrenzy({ meter }, since).meter;
}

/** The HUD's multiplier and its label, as the game shows them beside the combo meter. */
export function multiplierAt(t: number): { readonly mult: number; readonly label: string } {
  const mult = frenzyMultiplier({ meter: meterAt(t) });
  return { mult, label: frenzyLabel(mult) };
}

// ---------------------------------------------------------------- you

/** Your path: weaving at each gulp so every minnow meets your lips, a lunge into the double, then a coast. */
const PLAYER_KEYS: readonly PathKey[] = [
  { t: -2.5, x: 470, y: 840 },
  { t: -1.5, x: 400, y: 860 },
  { t: -0.6, x: 390, y: 820 },
  { t: 0.2, x: 450, y: 800 },
  { t: 0.7, x: 430, y: 840 },
  { t: 1.15, x: 455, y: 890 },
  { t: 1.6, x: 440, y: 830 },
  { t: 2.0, x: 465, y: 745 },
  { t: 2.35, x: 450, y: 790 },
  { t: 2.65, x: 480, y: 870 },
  { t: 2.95, x: 465, y: 820 },
  { t: 3.25, x: 495, y: 735 },
  { t: 3.5, x: 480, y: 790 },
  { t: 3.75, x: 505, y: 860 },
  { t: 4.05, x: 500, y: 810 },
  { t: 4.3, x: 540, y: 790 },
  { t: 5.0, x: 580, y: 800 },
  { t: 5.8, x: 540, y: 830 },
].map((k) => ({ ...k, t: loopTime(k.t) })).sort((a, b) => a.t - b.t);
const playerPath = zoomLoopPath(PLAYER_KEYS, LOOP_S, 1);

export function playerFish(t: number): WorldFish {
  const p = playerPath(t);
  // Tilt and effort from your speed through the water, not across the screen.
  return fishAt('inkling', { ...p, vx: p.vx + DRIFT }, PLAYER_LEN, 1, 2, t);
}

/** Where your lips are. */
export const lipsAt = (t: number): { readonly x: number; readonly y: number } => mouthOf(asPose(playerFish(t)));

/** Prey are dragged into your mouth over this long before each gulp. */
export const SUCK = 0.18;

/** Your jaw: opening as each minnow comes in, wide for the double, snapping shut on each gulp. */
export function playerJaw(t: number): number {
  const s = storyTime(t);
  let open = 0;
  for (const at of GULPS) {
    const wide = at === FRENZY_AT ? 1 : 0.8;
    const from = at - (at === FRENZY_AT ? 0.45 : 0.32);
    if (s > from && s < at) open = Math.max(open, wide * ramp(s, from, at - SUCK));
    if (s >= at && s < at + 0.05) open = Math.max(open, wide * (1 - ramp(s, at, at + 0.05)));
  }
  // Two chews on the double.
  for (const c of [FRENZY_AT + 0.35, FRENZY_AT + 0.7]) if (s > c && s < c + 0.18) open = Math.max(open, 0.2 * Math.sin((Math.PI * (s - c)) / 0.18));
  return open;
}

/** Water rushing into your mouth before each gulp, 0 .. 1. */
export function suction(t: number): number {
  const s = storyTime(t);
  for (const at of GULPS) {
    const from = at - (at === FRENZY_AT ? 0.4 : 0.28);
    if (s >= from && s < at) return (at === FRENZY_AT ? 1 : 0.6) * ramp(s, from, at - SUCK);
  }
  return 0;
}

/** The last meal going down: a lump sliding back. */
export function playerLump(t: number): { readonly size: number; readonly at: number } {
  const s = storyTime(t);
  const at = [...GULPS].reverse().find((g) => s >= g);
  if (at === undefined) return { size: 0, at: 0.2 };
  const big = at === FRENZY_AT;
  const life = big ? 1.6 : 0.6;
  const since = s - at;
  if (since > life) return { size: 0, at: 0.2 };
  return { size: (big ? 1 : 0.5) * Math.min(1, since / 0.08) * (1 - ramp(since, life * 0.6, life)), at: lerp(0.2, 0.55, ramp(since, 0, life)) };
}

export function playerEyes(t: number): 'squeeze' | 'happy' | null {
  const s = storyTime(t);
  if (s >= FRENZY_AT - 0.01 && s < FRENZY_AT + 0.3) return 'squeeze';
  if (s >= FRENZY_AT + 0.3 && s < 6.2) return 'happy';
  return null;
}

/** The jolt as a gulp lands: 0 .. 1. */
export function gulpSnap(t: number): number {
  const s = storyTime(t);
  for (const at of GULPS) if (s > at - 0.02 && s < at + 0.12) return Math.sin((Math.PI * (s - at + 0.02)) / 0.14) * (at === FRENZY_AT ? 1 : 0.5);
  return 0;
}

/** Camera shake, px: a tap on each gulp, a thump on the frenzy. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const s = storyTime(t);
  let x = 0;
  let y = 0;
  for (const at of GULPS) {
    const since = s - at;
    if (since < 0 || since > 0.3) continue;
    const amp = (at === FRENZY_AT ? 18 : 4) * (1 - since / 0.3) ** 2;
    x += amp * Math.sin(since * 120);
    y += amp * 0.7 * Math.cos(since * 150);
  }
  return { x, y };
}

/** A bubble from your mouth: where it is, how big, how visible. */
export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

/** The game's burst on each meal (six bubbles drifting up and out), more for the double, and a contented few after. */
const BURSTS: readonly { readonly at: number; readonly count: number }[] = [
  ...GULPS.map((at) => ({ at, count: at === FRENZY_AT ? 10 : 6 })),
  { at: FRENZY_AT + 0.8, count: 3 },
  { at: FRENZY_AT + 1.05, count: 2 },
];
const BUBBLES = BURSTS.flatMap((b, k) => {
  const rng = createRng(900 + k);
  return Array.from({ length: b.count }, () => ({
    at: b.at, dx: (rng() - 0.5) * 200, rise: 70 + rng() * 180, life: 0.6 + rng() * 0.5, r: 5 + rng() * 9,
  }));
});

export function bubblesAt(t: number): Bubble[] {
  const s = storyTime(t);
  const out: Bubble[] = [];
  for (const b of BUBBLES) {
    const since = s - b.at;
    if (since < 0 || since >= b.life) continue;
    const u = Math.sin((Math.PI / 2) * (since / b.life));
    const from = lipsAt(loopTime(b.at));
    out.push({ x: from.x + b.dx * u, y: from.y - 10 - b.rise * u, r: b.r, alpha: 1 - since / b.life });
  }
  return out;
}

// ---------------------------------------------------------------- the HUD and the shout

/** A meal's floating score: where it is now and how visible, or null. */
export interface FloatScore {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
}

/** The game floats each meal's score for 0.9 s, rising with a Cubic.Out ease and fading out. */
const FLOAT_LIFE = 0.9;
/** The scores rise in a lane above your head, clear of the school's thick middle: from here, this far up. */
const FLOAT_FROM_Y = 610;
const FLOAT_RISE = 90;
const SCORE_SIZE = 72;

/** Where each meal's score starts: over your head, nudged left and right in turn; the double's two side by side, the x5 bigger. */
const FLOAT_START: readonly { readonly x: number; readonly y: number; readonly size: number }[] = MEALS.map((m, i) => {
  const head = playerFish(loopTime(m.at)).x + 0.1 * PLAYER_LEN;
  if (m.at === FRENZY_AT) {
    const top = m.mult === MAX_MULTIPLIER;
    return { x: head + (top ? 130 : -150), y: FLOAT_FROM_Y + (top ? 60 : 0), size: top ? 84 : SCORE_SIZE };
  }
  return { x: head + (i % 2 ? 115 : -115), y: FLOAT_FROM_Y, size: SCORE_SIZE };
});

export function floatScores(t: number): FloatScore[] {
  const s = storyTime(t);
  const out: FloatScore[] = [];
  MEALS.forEach((m, i) => {
    const since = s - m.at;
    if (since < 0 || since >= FLOAT_LIFE) return;
    const u = since / FLOAT_LIFE;
    const start = FLOAT_START[i]!;
    out.push({
      text: m.text,
      x: start.x,
      y: start.y - FLOAT_RISE * (1 - (1 - u) ** 3),
      size: start.size,
      // Full strength for most of its life, so it reads on a phone.
      alpha: Math.min(1, since / 0.05) * (1 - ramp(u, 0.7, 1)),
    });
  });
  return out;
}

/** "x5 INK FRENZY!", the game's label, shouted big: scale (overshooting as it lands) and alpha, or null. */
export function frenzyShout(t: number): { readonly scale: number; readonly alpha: number } | null {
  const since = storyTime(t) - FRENZY_AT;
  if (since < 0 || since > 1.8) return null;
  const scale = since < 0.12 ? lerp(1.15, 0.94, smooth(since / 0.12)) : lerp(0.94, 1, smooth((since - 0.12) / 0.1));
  // Up on the gulp's own frame.
  return { scale, alpha: 1 - ramp(since, 1.45, 1.8) };
}

/** The growth bar: the level's real goal, a few points in, each minnow adding what the game gives it. */
export const START_POINTS = 3;
export const BAR_MARKS: readonly number[] = LEVEL.tiers.slice(0, -1).map((p) => p / growthGoal(LEVEL));

export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const s = storyTime(t);
  let points = START_POINTS;
  let shown = START_POINTS;
  for (const m of MEALS) {
    points += growthPointsFor(m.size);
    shown = lerp(shown, points, ramp(s, m.at, m.at + 0.2));
  }
  return { fill: shown / growthGoal(LEVEL), alpha: window01(s, 0.25, 6.3, 0.4) };
}

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  /** Shown over [from, to] story seconds, fading at both ends. */
  readonly from: number;
  readonly to: number;
}

const HOOK = { from: -0.4, to: 4.15 };
export const CAPTIONS: readonly Caption[] = [
  { text: 'just one more plate…', y: 380, size: 104, from: -2.4, to: -0.6 },
  { text: 'me at the', y: 340, size: 100, ...HOOK },
  { text: 'all-you-can-eat buffet', y: 450, size: 100, ...HOOK },
];

const CAPTION_FADE = 0.25;

export function captionAlpha(c: Caption, t: number): number {
  return window01(storyTime(t), c.from, c.to, CAPTION_FADE);
}

export interface SoundCue {
  readonly id: SfxId;
  /** Loop time. */
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** -1 left .. 1 right. */
  readonly pan: number;
}

const cue = (id: SfxId, s: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t: loopTime(s), pitch, gain, pan });

/** Each meal sounds as GameScene.feed() plays it: 'frenzy', pitched up the combo, when the multiplier climbs; a size-pitched 'eat' otherwise. */
const mealSound = (m: Meal): SoundCue => (m.combo > m.mult
  ? cue('frenzy', m.at, 0.9 + m.combo * 0.1, 0.6, 0.1)
  : cue('eat', m.at, pitchForSize(m.size), 0.7, 0.1));

export const SOUNDS: readonly SoundCue[] = [
  // You dash at the next school.
  cue('dash', -0.6, 1, 0.45, -0.1),
  ...MEALS.map(mealSound),
  ...GULPS.filter((at) => at !== FRENZY_AT).map((at) => cue('suck', at - 0.28, 1.4, 0.18, 0.1)),
  // The double: a big suck, a heavy gulp under the frenzy sting, the school sees and bolts.
  cue('suck', FRENZY_AT - 0.4, 1.1, 0.5, 0.1),
  cue('eatBig', FRENZY_AT, 1.2, 0.5, 0.1),
  cue('powerup', FRENZY_AT + 0.05, 1, 0.4),
  cue('spotted', FRENZY_AT + 0.12, 1.5, 0.35, 0.3),
  cue('dash', FRENZY_AT + 0.2, 1.3, 0.4, 0.4),
  cue('dash', FRENZY_AT + 0.35, 1.1, 0.35, -0.4),
  cue('eat', FRENZY_AT + 0.38, 0.7, 0.35, 0.1),
  cue('eat', FRENZY_AT + 0.73, 0.7, 0.3, 0.1),
];
