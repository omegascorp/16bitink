import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { endOf, LINE_WORDS, startOf, TEMPO, WORDS, type Word } from './words';

/**
 * "This snake squeezes until the heart STOPS": narrated, a pure function of
 * time, every beat timed from the words. Boback et al. 2012: boas tighten to
 * a heartbeat; with a pumped fake heart in a dead rat they squeezed nearly
 * twice as long, and with it switched off they let go sooner.
 *
 *   0     frame 1: the coils round the rat, the heart mid-beat
 *   2.0   "STOPS": a hard squeeze on the beat
 *   2.9   "A boa feels a heartbeat… through its coils": thump, squeeze
 *   6.0   "Scientists hid a fake heart in a dead rat!": a calm table, the rat
 *         lifeless, eyes closed, a bulb and tube showing in it
 *   8.7   "Left beating…": the bulb pumping inside the coils, which hold on,
 *         the clock going round twice
 *   11.9  "Switched off…": the switch flips, the bulb stops; a pause
 *   13.2  "it let go sooner.": the coils loosen
 *   14.1  the real game: the corn snake coils round a rat, the call to action
 *   15.9  the heart's glow blooms up from the prey into frame 1
 */
export const LOOP_S = 16.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Index of the first word of each line. */
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const STOPS_AT = startOf(6);
export const SCIENCE_AT = startOf(15);
export const FAKE_AT = startOf(18);
export const DEAD_AT = startOf(22);
export const LEFT_AT = startOf(24);
export const SQUEEZED_AT = startOf(28);
export const TWICE_AT = startOf(30);
export const LONG_END = endOf(32);
export const SWITCHED_AT = startOf(33);
export const OFF_AT = startOf(34);
export const LET_GO_AT = startOf(35);
export const SOONER_END = endOf(38);
export const SO_AT = startOf(39);
export const LAST_END = endOf(43);

/** The cut to the game, just after "sooner." and before "So". */
export const GAME_AT = SOONER_END + 0.04;
export const BLOOM_AT = LOOP_S - 0.6;
export const CTA_AT = GAME_AT;
export const CTA_END = LOOP_S - 0.6;

export const sceneAt = (t: number): 'coil' | 'table' | 'game' => {
  const u = wrap(t);
  if (u >= GAME_AT) return 'game';
  return u >= SCIENCE_AT && u < LEFT_AT ? 'table' : 'coil';
};

/** The experiment's coils: the same shot, with the dead rat and the bulb in place of the living heart. */
export const inExperiment = (t: number): boolean => {
  const u = wrap(t);
  return u >= SCIENCE_AT && u < GAME_AT;
};

// ---------------------------------------------------------------- the heart

interface Beat {
  readonly t: number;
  readonly k: number;
}

/** The heart's beats, on the words: the first two just before the loop point (as negative times), so frame 1 lands on the peak of one. */
export const BEATS: readonly Beat[] = [
  { t: -0.72, k: 0.75 }, { t: -0.04, k: 1 },
  { t: 0.7, k: 1 }, { t: 1.4, k: 1 }, { t: STOPS_AT - 0.02, k: 1 },
  { t: startOf(7) - 0.02, k: 0.9 }, { t: 3.5, k: 0.9 }, { t: startOf(11) - 0.02, k: 1 }, { t: startOf(12) - 0.02, k: 0.9 }, { t: startOf(14) - 0.02, k: 1 },
];

const hit = (s: number): number => (s <= 0 ? 0 : Math.min(1, s / 0.03) * Math.exp(-Math.max(0, s - 0.03) / 0.11));
const lubDub = (s: number): number => Math.max(hit(s), 0.55 * hit(s - 0.25));

/** The heart's beat now, 0..1, seen through the loop point. */
export function pulseAt(t: number): number {
  const u = wrap(t);
  if (u >= SCIENCE_AT && u < BLOOM_AT - 0.5) return 0;
  return BEATS.reduce((m, b) => Math.max(m, b.k * Math.max(lubDub(u - b.t), lubDub(u - LOOP_S - b.t))), 0);
}

export interface Heart {
  readonly scale: number;
  readonly glow: number;
}

export function heartAt(t: number): Heart {
  const pulse = pulseAt(t);
  return { scale: 1 + 0.17 * pulse, glow: 0.42 + 0.58 * pulse };
}

// ---------------------------------------------------------------- the fake heart

const PUMP_S = 0.56;

/** The pump's even push, 0..1: a machine's beat, no lub-dub; on from "fake" until "off". */
export function pumpAt(t: number): number {
  const u = wrap(t);
  if (u < FAKE_AT || u >= OFF_AT) return 0;
  const s = (u - FAKE_AT) % PUMP_S;
  return hit(s);
}

/** Is the switch on? It flips on "off". */
export const pumpOn = (t: number): boolean => wrap(t) < OFF_AT;

/** How much of the bulb shows: on the table from "fake", in the coils all along, gone as they let go. */
export function bulbShown(t: number): number {
  const u = wrap(t);
  if (u < SCIENCE_AT || u >= GAME_AT) return 0;
  return u < LEFT_AT ? ramp(u, FAKE_AT - 0.2, FAKE_AT + 0.1) : 1 - 0.8 * ramp(u, LET_GO_AT, SOONER_END);
}

/** The switch by the shot's corner, from "Switched" until the coils are off. */
export const switchShown = (t: number): number => window01(wrap(t), SWITCHED_AT - 0.1, SOONER_END, 0.12);
/** 0 on, 1 flipped off. */
export const switchFlip = (t: number): number => ramp(wrap(t), OFF_AT - 0.04, OFF_AT + 0.06);

/** The clock of "nearly TWICE as long": two turns from "squeezed" to "long". */
export const clockShown = (t: number): number => window01(wrap(t), SQUEEZED_AT - 0.14, SWITCHED_AT - 0.08, 0.14);
export const clockTurns = (t: number): number => 2 * clamp01((wrap(t) - SQUEEZED_AT) / (LONG_END - SQUEEZED_AT));

// ---------------------------------------------------------------- the coils

const TIGHT_0 = 0.22;
const NOTCH = 0.095;
const FIRST_NOTCH = BEATS.filter((b) => b.t > 0);
const HELD = 0.88;

/** How tight the coils are: bursts on each beat of the heart; held on the bulb; below 0 once let go. */
export function tightAt(t: number): number {
  const u = wrap(t);
  if (u >= GAME_AT) return TIGHT_0 + 0.2 * pulseAt(u);
  if (u >= LEFT_AT) return HELD + 0.1 * pumpAt(u) - 1.6 * ramp(u, LET_GO_AT, SOONER_END);
  return TIGHT_0 + FIRST_NOTCH.reduce((sum, b) => sum + ramp(u, b.t + 0.02, b.t + 0.2), 0) * NOTCH + 0.2 * pulseAt(u);
}

/** The camera on the coils: it pushes in through each beat of the story, and settles into frame 1 through the bloom. */
export function coilZoom(t: number): number {
  const u = wrap(t);
  if (u >= GAME_AT) return 1.05 - 0.05 * ramp(u, BLOOM_AT, LOOP_S);
  if (u >= LEFT_AT) return 1.02 + 0.09 * ramp(u, LEFT_AT, OFF_AT) - 0.05 * ramp(u, LET_GO_AT, SOONER_END);
  return 1 + 0.08 * ramp(u, 0, SCIENCE_AT);
}

/** The picture kicks with each beat of the heart or, less, the pump. */
export const kickAt = (t: number): number => Math.max(pulseAt(t), 0.3 * (wrap(t) >= LEFT_AT ? pumpAt(t) : 0));

/** The ink's boil holds still through the pause after "off". */
export const boilTime = (t: number): number => {
  const u = wrap(t);
  return u > OFF_AT + 0.25 && u < LET_GO_AT ? OFF_AT + 0.25 : u;
};

/** The rat sinks as the coils let it down. */
export const ratSag = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? ramp(u, LET_GO_AT, SOONER_END) : 0;
};

/** The tongue, 0 in .. 1 out. */
export function tongueAt(t: number): number {
  const u = wrap(t);
  for (const s of [1.05, 1.3, 3.3, 9.3, 9.55, 12.8]) if (u >= s && u < s + 0.22) return Math.sin(((u - s) / 0.22) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the game

const CLOSE_S = 0.85;
export const CLOSE_AT = GAME_AT + CLOSE_S;

export const coilProgress = (t: number): number => clamp01((wrap(t) - GAME_AT) / CLOSE_S);
export const gameSqueeze = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? 0 : 0.6 * ramp(u, CLOSE_AT + 0.03, CLOSE_AT + 0.3) + 0.4 * ramp(u, CLOSE_AT + 0.45, CLOSE_AT + 0.72);
};
export const ringAt = (t: number): number => window01(wrap(t), GAME_AT + 0.35, CLOSE_AT + 0.06, 0.08);

/** Frame 1 opening out of the prey: 0 nothing yet, 1 the whole frame. */
export const bloomAt = (t: number): number => {
  const u = wrap(t);
  return u < BLOOM_AT ? 0 : clamp01((u - BLOOM_AT) / (LOOP_S - BLOOM_AT - 0.04));
};

/** How much of the frame is the coil shot. */
export const coilShown = (t: number): number => (sceneAt(t) === 'coil' ? 1 : sceneAt(t) === 'table' ? 0 : bloomAt(t));

/** The heart's glow in the prey before the bloom, 0..1. */
export const preyGlow = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? 0 : ramp(u, BLOOM_AT - 0.5, BLOOM_AT);
};

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up over the last of the bloom, ready for frame 1. */
const HOOK_FROM = LOOP_S - 0.22;

/** The voiceover cut into short lines, each on screen from its first word until the next takes over. */
export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return {
    words: WORDS.slice(first, first + n),
    from: i === 0 ? 0 : startOf(first),
    to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM,
  };
});

/** The two hook lines stand together from frame 1, in full, so it works with the sound off. */
export const HOOK_LINES = 2;
export const HOOK_TO = LINES[HOOK_LINES]!.from;

/** How much of the hook shows: all of it from just before the loop point, and until the next line. */
export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 392, gap: 128, size: 136 },
  line: { y: 452, size: 132 },
} as const;

/** The line on screen after the hook, and the word being said in it (−1 none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

/** The word being said in the hook lines, counted through both (−1 none). */
export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

/** The call to action, only in the last 3 s, gone 0.6 s before the loop point. */
export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '10 levels free', y: 1095, size: 158 },
  small: { text: 'tap the channel name', y: 1195, size: 88 },
  arrow: { from: { x: 300, y: 1248 }, c0: { x: 335, y: 1390 }, c1: { x: 270, y: 1425 }, tip: { x: 170, y: 1470 } },
} as const;

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const creak = (t: number, gain: number, pitch = 0.72): SoundCue => ({ id: 'squeeze', t, pitch, gain, pan: 0 });

/** The times the pump pushes. */
export const PUMPS: readonly number[] = Array.from({ length: Math.floor((OFF_AT - FAKE_AT) / PUMP_S) + 1 }, (_, i) => FAKE_AT + i * PUMP_S);

/** Quiet under the voice: a creak on the beats, the switch, the coils sliding off, the game's own sounds. */
export const SOUNDS: readonly SoundCue[] = [
  ...BEATS.filter((b) => b.t > 0).map((b, i) => creak(b.t + 0.05, 0.2, 0.7 + 0.03 * (i % 3))),
  creak(LEFT_AT + 0.04, 0.2),
  creak(SQUEEZED_AT, 0.22),
  { id: 'click', t: OFF_AT, pitch: 0.8, gain: 1, pan: 0.2 },
  { id: 'steps', t: LET_GO_AT + 0.02, pitch: 0.65, gain: 0.5, pan: 0.1 },
  { id: 'steps', t: LET_GO_AT + 0.4, pitch: 0.55, gain: 0.45, pan: -0.1 },
  { id: 'steps', t: GAME_AT + 0.03, pitch: 1, gain: 0.32, pan: 0.2 },
  { id: 'squeak', t: GAME_AT + 0.3, pitch: 1, gain: 0.35, pan: 0 },
  { id: 'appear', t: GAME_AT + 0.4, pitch: 1.2, gain: 0.35, pan: 0 },
  creak(CLOSE_AT + 0.04, 0.4, 1),
  creak(CLOSE_AT + 0.46, 0.4, 0.92),
];

/** Every value the picture is drawn from at t, by name. */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const heart = heartAt(t);
  return {
    pulse: pulseAt(t), heartScale: heart.scale, glow: heart.glow, tight: tightAt(t), zoom: coilZoom(t), kick: kickAt(t), tongue: tongueAt(t),
    pump: pumpAt(t), bulb: bulbShown(t), clock: clockShown(t), switch: switchShown(t), coil: coilShown(t), hook: hookAlpha(t), cta: ctaAt(t),
  };
}
