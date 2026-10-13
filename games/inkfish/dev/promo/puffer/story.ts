import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "One pufferfish can kill thirty people": told by a narrator (words.ts) in
 * bright shallows, every beat timed to the words, a function of time in
 * seconds over a loop of LOOP_S.
 *
 *   0     the puffer blown up into a spiky ball, wobbling, as thirty ink stick
 *         figures pop up in rows below it, a counter ticking to 30
 *   2.6   "Its poison, tetrodotoxin": it lets the water out and, seen through,
 *         a glowing vial sits in its belly, labelled "tetrodotoxin"
 *   4.7   "…is deadlier than cyanide": the vial drops onto a hand-drawn scale
 *         and outweighs a bottle of cyanide
 *   6.2   "…and there's no antidote": "antidote", written and struck out
 *   7.8   "In Japan, it's a delicacy": a plate of fugu sashimi, the thin
 *         petals laid out like a chrysanthemum, then chopsticks
 *   9.7   "…only chefs with a special licence are allowed to cut it": a chef's
 *         knife and a licence card stamped "approved"; the knife flashes on
 *         "cut", and the puffer flinches
 *   12.7  "When a predator attacks": a moray lunges out of a rock at it;
 *         "it gulps water and blows up into a spiky ball": water streams
 *         into its mouth, it swells into the ball, the moray recoils with "!"
 *   17.1  "So be careful what you order, because": the moray slinks back, the
 *         camera pushes in on the ball and the stick figures pop up again:
 *         the opening frame, as the loop finishes the sentence.
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const THIRTY_AT = said('thirty');
export const PEOPLE_AT = said('people.');
export const ITS_AT = said('Its');
export const POISON_AT = said('poison,');
export const TTX_AT = said('tetrodotoxin,');
export const DEADLIER_AT = said('deadlier');
export const CYANIDE_AT = said('cyanide,');
export const THERES_AT = said("there's");
export const NO_AT = said('no');
export const ANTIDOTE_AT = said('antidote.');
export const IN_AT = said('In');
export const JAPAN_AT = said('Japan,');
export const DELICACY_AT = said('delicacy,');
export const AND2_AT = said('and', 2);
export const ONLY_AT = said('only');
export const CHEFS_AT = said('chefs');
export const LICENCE_AT = said('licence');
export const CUT_AT = said('cut');
export const WHEN_AT = said('When');
export const PREDATOR_AT = said('predator');
export const ATTACKS_AT = said('attacks,');
export const GULPS_AT = said('gulps');
export const BLOWS_AT = said('blows');
export const SPIKY_AT = said('spiky');
export const SO_AT = said('So');
export const ORDER_AT = said('order,');

// ---------------------------------------------------------------- the pufferfish

/** Keys held still at each one (rate 0), eased between. */
const still = (pairs: readonly (readonly [number, number])[]): readonly Key[] => pairs.map(([t, at]) => ({ t, at, rate: 0 }));

/** It lets the water out as the narrator turns to its poison. */
export const DEFLATE_FROM = ITS_AT;
export const DEFLATE_TO = ITS_AT + 0.7;
/** It swims up out of the way for the props, and back down to meet the moray. */
const RISE = { from: TTX_AT + 0.75, to: DEADLIER_AT + 0.05 };
const DOWN = { from: WHEN_AT - 0.25, to: PREDATOR_AT + 0.35 };
/** The push-in on the ball, back to the opening frame. */
const PUSH = { from: SO_AT + 0.15, to: LOOP_S - 0.45 };

/** Centre and body length (deflated) of the puffer. */
const X_KEYS = still([[0, 540], [DOWN.from, 540], [DOWN.to, 720], [PUSH.from, 720], [PUSH.to, 540]]);
const Y_KEYS = still([[0, 572], [DEFLATE_FROM, 572], [DEFLATE_TO + 0.1, 610], [RISE.from, 610], [RISE.to, 430], [DOWN.from, 430], [DOWN.to, 640], [PUSH.from, 640], [PUSH.to, 572]]);
const LEN_KEYS = still([[0, 285], [DEFLATE_FROM, 285], [DEFLATE_TO + 0.1, 430], [RISE.from, 430], [RISE.to, 290], [DOWN.from, 290], [DOWN.to, 260], [PUSH.from, 260], [PUSH.to, 285]]);

/** Blowing up on "blows up into a spiky ball", overshooting and settling. */
const BLOW_KEYS: readonly Key[] = [
  { t: BLOWS_AT, at: 0.18, rate: 0 },
  { t: BLOWS_AT + 0.6, at: 1.1 },
  { t: BLOWS_AT + 0.95, at: 0.96 },
  { t: BLOWS_AT + 1.3, at: 1, rate: 0 },
];
/** It flinches, half puffing, as the knife flashes on "cut". */
const FLINCH = { from: CUT_AT + 0.05, to: CUT_AT + 0.85 };

/** How blown up it is: 0 a fish, 1 a ball (a little over while it overshoots). */
export function inflationAt(t: number): number {
  if (t < LOOP_S / 2) return 1 - ramp(t, DEFLATE_FROM, DEFLATE_TO);
  if (t < BLOWS_AT) {
    const flinch = Math.sin(Math.PI * clamp01((t - FLINCH.from) / (FLINCH.to - FLINCH.from))) ** 2;
    return 0.22 * flinch + 0.18 * ramp(t, GULPS_AT, BLOWS_AT - 0.05);
  }
  return curveAt(BLOW_KEYS, t).at;
}

/** In the game a puffed puffer is 1.7 times its size. */
export const PUFF_SCALE = 0.7;
/** Tail beats and bobs a whole number of times a loop. */
const BEATS = 26;
const BOBS = 6;
const SWAYS = 5;
const JIGGLES = 17;

export interface Puffer {
  readonly x: number;
  readonly y: number;
  /** Body length on screen as a fish: blowing up scales it by 1 + PUFF_SCALE * inf. */
  readonly len: number;
  readonly inf: number;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** A ball's wobble: + taller, - longer. */
  readonly jiggle: number;
}

export function pufferAt(t: number): Puffer {
  const x = curveAt(X_KEYS, t);
  const y = curveAt(Y_KEYS, t);
  const inf = inflationAt(t);
  const moving = clamp01(Math.hypot(x.rate, y.rate) / 400);
  const blowWobble = t > BLOWS_AT ? 0.06 * Math.exp(-3 * (t - BLOWS_AT - 0.5)) * Math.sin(14 * (t - BLOWS_AT)) * ramp(t, BLOWS_AT + 0.4, BLOWS_AT + 0.6) : 0;
  return {
    x: x.at,
    y: y.at + 9 * Math.sin((2 * Math.PI * BOBS * t) / LOOP_S + 0.4),
    len: curveAt(LEN_KEYS, t).at,
    inf,
    tilt: 0.06 * Math.sin((2 * Math.PI * SWAYS * t) / LOOP_S) + Math.max(-0.25, Math.min(0.25, -y.rate / 1600)) * (1 - inf),
    beat: (2 * Math.PI * BEATS * t) / LOOP_S,
    effort: (0.35 + 0.55 * moving) * (1 - 0.75 * clamp01(inf)),
    jiggle: 0.03 * Math.sin((2 * Math.PI * JIGGLES * t) / LOOP_S) * clamp01(inf) + blowWobble,
  };
}

/** Its drawn length, blown up. */
export const drawnLen = (p: Puffer): number => p.len * (1 + PUFF_SCALE * p.inf);

/** Where its poison sits: the belly (the liver and ovaries hold most of it). */
export function bellyOf(p: Puffer): { readonly x: number; readonly y: number } {
  const l = drawnLen(p);
  return { x: p.x - 0.04 * l, y: p.y + 0.12 * l };
}

/** Water rushing into its mouth on "gulps water". */
export const suctionAt = (t: number): number => window01(t, GULPS_AT - 0.05, BLOWS_AT + 0.25, 0.15);
/** An ink ring bursting round the ball as it reaches full size, 0 .. 1 over its life. */
export const burstAt = (t: number): number => (t - (BLOWS_AT + 0.45)) / 0.5;

/** "!" pops: 0 .. ~1.15 size. */
const pop = (t: number, from: number, hold: number): number => {
  const u = t - from;
  return u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.15, hold));
};
/** The puffer's "!": at the plate of its own kind, the knife, the moray. */
export const pufferAlarmAt = (t: number): number => Math.max(pop(t, DELICACY_AT + 0.15, 0.9), pop(t, CUT_AT + 0.1, 0.8), pop(t, ATTACKS_AT + 0.15, 0.7));

// ---------------------------------------------------------------- thirty people

export interface Figure {
  readonly x: number;
  /** Where its feet are. */
  readonly y: number;
  /** When it pops up and when it fades (looping). */
  readonly popAt: number;
  readonly fadeAt: number;
  /** Arms: 0 down, 1 one waving, 2 both up. */
  readonly arms: 0 | 1 | 2;
}

export const ROWS = 3;
export const PER_ROW = 10;
const ROW_FEET = [952, 1036, 1118] as const;
/** They pop up one by one across the loop point, the last on "people". */
export const POP_FROM = LOOP_S - 1.5;
const POP_SPAN = LOOP_S - POP_FROM + PEOPLE_AT - 0.15;
const FADE_S = 0.3;

export const FIGURES: readonly Figure[] = Array.from({ length: ROWS * PER_ROW }, (_, i) => {
  const row = Math.floor(i / PER_ROW);
  const col = i % PER_ROW;
  return {
    x: 108 + col * 96 + (row % 2 ? 24 : -8),
    y: ROW_FEET[row]!,
    popAt: wrap(POP_FROM + (i * POP_SPAN) / (ROWS * PER_ROW - 1)),
    fadeAt: ITS_AT + 0.015 * i,
    arms: ([0, 1, 0, 2, 0, 0, 1, 0, 2, 0, 0, 1, 0] as const)[i % 13]!,
  };
});

/** A figure's size (overshooting as it pops) and how much it shows, and a little hop on "people". */
export function figureAt(i: number, t: number): { readonly scale: number; readonly alpha: number; readonly hop: number } {
  const f = FIGURES[i]!;
  const d = wrap(t - f.popAt);
  const life = wrap(f.fadeAt - f.popAt);
  if (d > life + FADE_S) return { scale: 0, alpha: 0, hop: 0 };
  const u = clamp01(d / 0.22);
  // Ease out with a little overshoot.
  const scale = 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
  const hopU = (t - (PEOPLE_AT + 0.2) - 0.012 * i) / 0.3;
  return {
    scale: Math.max(0, scale),
    alpha: 1 - ramp(d, life, life + FADE_S),
    hop: hopU > 0 && hopU < 1 ? 14 * Math.sin(Math.PI * hopU) : 0,
  };
}

/** The tally beside the ball: how many have popped up, and how much it shows. */
export function counterAt(t: number): { readonly n: number; readonly alpha: number } {
  const since = wrap(t - POP_FROM);
  const step = POP_SPAN / (ROWS * PER_ROW - 1);
  const n = Math.min(ROWS * PER_ROW, Math.floor(since / step + 1e-9) + 1);
  const alpha = t < LOOP_S / 2 ? 1 - ramp(t, ITS_AT, ITS_AT + 0.45) : ramp(t, POP_FROM - 0.05, POP_FROM + 0.1);
  return { n: alpha > 0 ? n : 0, alpha };
}

// ---------------------------------------------------------------- the poison and the scale

/** The vial drops out of the puffer on "deadlier" and lands on the scale. */
export const DROP_AT = DEADLIER_AT + 0.1;
export const LAND_AT = DROP_AT + 0.4;

export const SCALE = { pivot: { x: 540, y: 700 }, arm: 260, hang: 175 } as const;
export const scaleShown = (t: number): number => window01(t, DEADLIER_AT - 0.25, THERES_AT + 0.3, 0.3);

/** The beam's angle, left side down positive: the cyanide's weight tips it right, then the vial lands and tips it left. */
export function beamAt(t: number): number {
  if (t < LAND_AT) return -0.13;
  const u = t - LAND_AT;
  return 0.2 - 0.33 * Math.exp(-5 * u) * Math.cos(10 * u);
}

/** The middle of a pan's rim, side -1 left, 1 right. */
export function panAt(side: -1 | 1, beam: number): { readonly x: number; readonly y: number } {
  const { pivot, arm, hang } = SCALE;
  return { x: pivot.x + side * arm * Math.cos(beam), y: pivot.y - side * arm * Math.sin(beam) + hang };
}

/** The vial of tetrodotoxin sits this far above its pan's rim. */
const VIAL_SIT = 34;

export interface Vial {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly alpha: number;
  /** Glowing inside the fish (seen through it). */
  readonly inside: boolean;
  readonly glow: number;
}

export function vialAt(t: number): Vial | null {
  if (t < POISON_AT || t > THERES_AT + 0.4) return null;
  const glow = 0.75 + 0.25 * Math.sin(2 * Math.PI * 2.5 * (t - POISON_AT));
  if (t < DROP_AT) {
    const b = bellyOf(pufferAt(t));
    return { x: b.x, y: b.y, angle: 0.25, alpha: ramp(t, POISON_AT, POISON_AT + 0.35), inside: true, glow };
  }
  const end = panAt(-1, beamAt(LAND_AT));
  if (t < LAND_AT) {
    const b = bellyOf(pufferAt(DROP_AT));
    const u = (t - DROP_AT) / (LAND_AT - DROP_AT);
    return { x: lerp(b.x, end.x, smooth(u)), y: lerp(b.y, end.y - VIAL_SIT, u * u), angle: 0.25 + 1.5 * Math.sin(Math.PI * u) * 0.4 - 0.25 * u, alpha: 1, inside: false, glow };
  }
  const pan = panAt(-1, beamAt(t));
  return { x: pan.x, y: pan.y - VIAL_SIT, angle: 0, alpha: scaleShown(t), inside: false, glow };
}

/** "tetrodotoxin" written over the fish, an arrow to the vial. */
export const ttxLabelAt = (t: number): number => window01(t, TTX_AT - 0.05, RISE.from + 0.25, 0.25);
/** The pans' labels: the poison's on landing, cyanide as the narrator names it. */
export const panLabelsAt = (t: number): { readonly ttx: number; readonly cyanide: number } => ({
  ttx: Math.min(scaleShown(t), ramp(t, LAND_AT, LAND_AT + 0.25)),
  cyanide: Math.min(scaleShown(t), ramp(t, CYANIDE_AT - 0.05, CYANIDE_AT + 0.2)),
});

/** "antidote": written as the narrator says "there's", struck through on "no". */
export function antidoteAt(t: number): { readonly alpha: number; readonly write: number; readonly strike: number } {
  return { alpha: window01(t, THERES_AT, IN_AT + 0.2, 0.2), write: ramp(t, THERES_AT, NO_AT - 0.02), strike: ramp(t, NO_AT, ANTIDOTE_AT + 0.15) };
}

// ---------------------------------------------------------------- the plate and the licence

export const PETALS = 28;
const LAY = { from: JAPAN_AT - 0.05, to: DELICACY_AT + 0.25 };

export function plateAt(t: number): { readonly alpha: number; readonly petal: (k: number) => number; readonly chopsticks: number; readonly label: number } {
  const alpha = window01(t, IN_AT + 0.05, AND2_AT + 0.3, 0.25);
  return {
    alpha,
    petal: (k) => ramp(t, LAY.from + ((LAY.to - LAY.from) * k) / PETALS, LAY.from + ((LAY.to - LAY.from) * (k + 1.5)) / PETALS),
    chopsticks: ramp(t, DELICACY_AT - 0.1, DELICACY_AT + 0.3),
    label: Math.min(alpha, ramp(t, DELICACY_AT, DELICACY_AT + 0.25)),
  };
}

export function cardAt(t: number): { readonly alpha: number; readonly rise: number; readonly stamp: number } {
  return {
    alpha: window01(t, ONLY_AT - 0.15, WHEN_AT + 0.1, 0.3),
    rise: 1 - ramp(t, ONLY_AT - 0.15, ONLY_AT + 0.25),
    // 0 .. 1 as the stamp comes down (-1 before).
    stamp: t < LICENCE_AT - 0.05 ? -1 : clamp01((t - LICENCE_AT + 0.05) / 0.22),
  };
}

export interface Knife {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly alpha: number;
  /** The flash of the cut, 0 .. 1 over its life. */
  readonly slash: number;
}

/** It lies over the card from "chefs", and swings through a cut on "cut". */
export function knifeAt(t: number): Knife {
  const swing = (t - (CUT_AT - 0.08)) / 0.32;
  const s = swing <= 0 ? 0 : swing >= 1 ? 1 : swing;
  // Up and back, then a long slice down and forward.
  const lift = Math.sin(Math.PI * Math.min(1, s * 2.2)) * (1 - s);
  return {
    x: 560 - 70 * smooth(s) + 30 * lift,
    y: 668 - 50 * lift + 30 * smooth(s),
    angle: -0.14 - 0.45 * lift + 0.22 * smooth(s),
    alpha: window01(t, CHEFS_AT - 0.1, WHEN_AT + 0.1, 0.25),
    slash: (t - (CUT_AT + 0.02)) / 0.45,
  };
}

// ---------------------------------------------------------------- the moray

/** The rock it lives in is drawn in for its scene. */
export const rockAt = (t: number): number => window01(t, WHEN_AT - 0.35, PUSH.from + 0.6, 0.35);

export const MORAY_LEN = 760;
export const MORAY_TILT = 0.22;
/** Its nose at the end of the lunge, just short of the puffer's tail. */
const AXIS = { x: Math.cos(MORAY_TILT), y: -Math.sin(MORAY_TILT) };
/** The mouth of its hole, in the rock's face. */
export const HOLE = { x: 250, y: 752, rx: 50, ry: 74 } as const;
export const STRIKE_NOSE = { x: HOLE.x + 230 * AXIS.x, y: HOLE.y + 230 * AXIS.y } as const;
/** How far behind the strike it is, px along its line: hidden, peeking out, cocked back, lunging, recoiling, gone. */
const RECOIL_AT = BLOWS_AT + 0.42;
const OUT_KEYS: readonly Key[] = [
  { t: WHEN_AT, at: -440, rate: 0 },
  { t: PREDATOR_AT + 0.3, at: -140, rate: 0 },
  { t: ATTACKS_AT, at: -175, rate: 0 },
  { t: ATTACKS_AT + 0.3, at: 0, rate: 0 },
  { t: RECOIL_AT, at: 12, rate: 0 },
  { t: RECOIL_AT + 0.18, at: -150, rate: 0 },
  { t: SO_AT - 0.1, at: -200 },
  { t: SO_AT + 0.6, at: -460, rate: 0 },
];

export interface Moray {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly jaw: number;
  readonly beat: number;
  readonly effort: number;
}

export function morayAt(t: number): Moray | null {
  if (t < WHEN_AT || t > SO_AT + 0.6) return null;
  const out = curveAt(OUT_KEYS, t);
  const nose = { x: STRIKE_NOSE.x + AXIS.x * out.at, y: STRIKE_NOSE.y + AXIS.y * out.at };
  const breathe = 0.25 + 0.15 * Math.sin(2 * Math.PI * 1.6 * (t - WHEN_AT));
  const jaw = t < ATTACKS_AT ? breathe : t < RECOIL_AT ? Math.max(breathe, ramp(t, ATTACKS_AT, ATTACKS_AT + 0.2)) : breathe * ramp(t, RECOIL_AT + 0.6, RECOIL_AT + 1.2);
  const tilt = MORAY_TILT + 0.03 * Math.sin(2 * Math.PI * 0.8 * (t - WHEN_AT));
  return {
    x: nose.x - AXIS.x * MORAY_LEN * 0.46,
    y: nose.y - AXIS.y * MORAY_LEN * 0.46,
    tilt,
    jaw,
    beat: 2 * Math.PI * 1.4 * (t - WHEN_AT) + 0.08 * out.at,
    effort: 0.25 + 0.6 * clamp01(Math.abs(out.rate) / 800),
  };
}

/** Its nose, where the "!" goes. */
export const noseOf = (m: Moray): { readonly x: number; readonly y: number } => ({
  x: m.x + Math.cos(m.tilt) * MORAY_LEN * 0.46,
  y: m.y - Math.sin(m.tilt) * MORAY_LEN * 0.46,
});

/** The moray's "!" as the spikes hit it. */
export const morayAlarmAt = (t: number): number => pop(t, RECOIL_AT + 0.02, 1.1);
export const MORAY_RECOIL_AT = RECOIL_AT;

/** A jolt of the picture as the spikes hit the moray, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = t - RECOIL_AT;
  if (u < 0 || u > 0.3) return { x: 0, y: 0 };
  const fade = (1 - u / 0.3) ** 2;
  return { x: 10 * fade * Math.sin(u * 95), y: 7 * fade * Math.cos(u * 77) };
}

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
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  ...[0, 1, 2, 3, 4, 5].map((k): SoundCue => ({ id: 'click', t: wrap(FIGURES[k * 5 + 2]!.popAt), pitch: 1.4 + 0.08 * k, gain: 0.22, pan: -0.5 + 0.2 * k })),
  { id: 'rustle', t: DEFLATE_FROM + 0.05, pitch: 1.3, gain: 0.16, pan: 0 },
  { id: 'zap', t: TTX_AT, pitch: 0.7, gain: 0.08, pan: 0 },
  { id: 'clang', t: LAND_AT, pitch: 1.2, gain: 0.2, pan: -0.4 },
  { id: 'click', t: NO_AT + 0.05, pitch: 0.8, gain: 0.35, pan: 0 },
  { id: 'drop', t: JAPAN_AT + 0.1, pitch: 1.8, gain: 0.12, pan: -0.2 },
  { id: 'drop', t: DELICACY_AT - 0.2, pitch: 2, gain: 0.12, pan: 0.2 },
  { id: 'clang', t: LICENCE_AT + 0.1, pitch: 0.6, gain: 0.22, pan: 0.3 },
  { id: 'lash', t: CUT_AT, pitch: 1.4, gain: 0.18, pan: 0 },
  { id: 'dash', t: PREDATOR_AT, pitch: 0.6, gain: 0.14, pan: -0.6 },
  { id: 'lunge', t: ATTACKS_AT + 0.05, pitch: 0.8, gain: 0.3, pan: -0.5 },
  { id: 'spotted', t: ATTACKS_AT + 0.15, pitch: 1.1, gain: 0.2, pan: 0.2 },
  { id: 'suck', t: GULPS_AT, pitch: 1, gain: 0.18, pan: 0.3 },
  { id: 'grow', t: BLOWS_AT, pitch: 0.9, gain: 0.3, pan: 0.1 },
  { id: 'hurt', t: RECOIL_AT, pitch: 0.8, gain: 0.25, pan: -0.5 },
  { id: 'dash', t: SO_AT, pitch: 0.7, gain: 0.08, pan: -0.6 },
];
